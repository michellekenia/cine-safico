import { Injectable, Logger, Inject } from '@nestjs/common';
import { IScraper, IBrowserProvider, IMovieParser, IMovieStorage, BROWSER_PROVIDER, MOVIE_PARSER, MOVIE_STORAGE } from './interfaces/scraper.interface';
import { MovieData, ScrapedMovieRecord } from './interfaces/models.interface';
import { SlugService } from './services/slug.service';

/**
 * Função auxiliar para retry com backoff exponencial
 * Executa uma ação com múltiplas tentativas em caso de erro
 */
function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function scrapeWithRetries<T>(
  action: () => Promise<T>,
  maxRetries: number,
  logger: Logger,
  context: string,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      const message = formatErrorMessage(error);
      logger.warn(`Tentativa ${attempt} falhou para ${context}: ${message}`);
      if (attempt === maxRetries) {
        logger.error(
          `Todas as ${maxRetries} tentativas falharam para ${context}. Desistindo.`,
        );
        throw error;
      }

      const isNavigationTimeout = message.toLowerCase().includes('navigation timeout');
      const delayMs = isNavigationTimeout ? 15000 * attempt : 2000 * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Lógica de retries falhou inesperadamente.');
}

/**
 * ScraperService
 * 
 * Serviço orquestrador para raspagem de filmes do Letterboxd
 * Delegação de responsabilidades para serviços especializados:
 * - BrowserProvider: Gerencia navegador Puppeteer
 * - MovieParser: Extrai dados do HTML
 * - MovieStorage: Persiste dados no banco
 * - SlugService: Gera slugs normalizados
 */
@Injectable()
export class ScraperService implements IScraper {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    @Inject(BROWSER_PROVIDER)
    private readonly browserProvider: IBrowserProvider,
    @Inject(MOVIE_PARSER)
    private readonly movieParser: IMovieParser,
    @Inject(MOVIE_STORAGE)
    private readonly movieStorage: IMovieStorage,
    private readonly slugService: SlugService,
  ) {}

  /**
   * Inicia o processo completo de raspagem de filmes
   * 
   * Fluxo:
   * 1. Iniciar navegador
   * 2. Extrair links de filmes da lista
   * 3. Filtrar filmes já existentes
   * 4. Extrair detalhes de cada filme com retry
   * 5. Salvar filmes no banco
   * 6. Retornar filmes salvos
   * 
   * @param listLink - URL da lista de filmes no Letterboxd
   * @returns Array de filmes salvos
   */
  async scrapeMovies(listLink: string): Promise<ScrapedMovieRecord[]> {
    const normalizedListLink = this.normalizeAndValidateListUrl(listLink);
    this.logger.log(`Iniciando processo de raspagem da lista: ${normalizedListLink}`);

    const browser = await this.browserProvider.launch();

    try {
      // 1. Extrair links de filmes
      const movieLinks = await this.movieParser.extractLinks(browser, normalizedListLink);
      this.logger.log(`Encontrados ${movieLinks.length} filmes na lista`);

      if (movieLinks.length === 0) {
        this.logger.warn('Nenhum filme encontrado na lista');
        return [];
      }

      // 2. Filtrar filmes já existentes no banco
      const slugs = movieLinks.map((link) => this.extractSlugFromUrl(link.href)).filter(Boolean) as string[];
      const existingSlugs = await this.movieStorage.findExistingSlugs(slugs);
      const existingSet = new Set(existingSlugs);

      const newMovieLinks = movieLinks.filter((link) => {
        const slug = this.extractSlugFromUrl(link.href);
        return slug && !existingSet.has(slug);
      });

      this.logger.log(`${newMovieLinks.length} filmes são novos`);

      // 3. Extrair detalhes de cada filme com retry
      const moviesToSave: MovieData[] = [];
      let consecutiveNavigationTimeouts = 0;

      for (const { href, poster } of newMovieLinks) {
        const slug = this.extractSlugFromUrl(href);
        if (!slug) continue;

        try {
          const pageData = await scrapeWithRetries(
            () => this.movieParser.extractDetails(browser, href),
            3,
            this.logger,
            `filme ${slug}`,
          );

          consecutiveNavigationTimeouts = 0;

          // Validar se título foi extraído
          if (!pageData.details.title) {
            this.logger.warn(`Título não encontrado para ${href}, pulando...`);
            continue;
          }

          // Otimizar URL do poster
          const posterUrl = this.movieStorage.optimizePosterUrl(
            pageData.details.posterImage || poster,
          );

          // Montar objeto para salvar
          const movieData: MovieData = {
            slug,
            posterUrl,
            details: pageData.details,
            streaming: pageData.streaming,
          };

          moviesToSave.push(movieData);
        } catch (error) {
          const message = formatErrorMessage(error);
          this.logger.error(`Falha ao processar ${href} após todas as tentativas: ${message}`);

          if (message.toLowerCase().includes('navigation timeout')) {
            consecutiveNavigationTimeouts++;

            if (consecutiveNavigationTimeouts >= 3) {
              this.logger.warn('Muitas falhas de navegação em sequência. Pausando 60s para reduzir bloqueio/rate limit.');
              await new Promise((resolve) => setTimeout(resolve, 60000));
              consecutiveNavigationTimeouts = 0;
            }
          } else {
            consecutiveNavigationTimeouts = 0;
          }
        }
      }

      // 4. Salvar filmes no banco
      const savedMovies = await this.movieStorage.saveMovies(moviesToSave);
      this.logger.log(`✅ Raspagem finalizada. Total de filmes salvos: ${savedMovies.length}`);

      return savedMovies;
    } catch (error) {
      this.logger.error(`❌ Erro crítico durante a raspagem: ${formatErrorMessage(error)}`);
      return [];
    } finally {
      // 5. Fechar navegador
      await this.browserProvider.close();
    }
  }

  /**
   * Extrai slug da URL do Letterboxd
   * Exemplo: https://letterboxd.com/film/inception/ → inception
   * 
   * @param url - URL do filme
   * @returns Slug do filme ou null se inválido
   */
  private extractSlugFromUrl(url: string): string | null {
    try {
      const match = url.match(/letterboxd\.com\/film\/([^\/]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  private normalizeAndValidateListUrl(listLink: string): string {
    const trimmed = (listLink || '').trim();

    if (!trimmed) {
      throw new Error('A URL da lista está vazia. Informe uma URL válida do Letterboxd.');
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const parsed = new URL(withProtocol);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Protocolo inválido');
      }
      return parsed.toString();
    } catch {
      throw new Error(`URL da lista inválida: "${listLink}"`);
    }
  }
}
