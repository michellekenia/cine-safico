import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import { Browser } from 'puppeteer-core';
import { PrismaService } from 'src/adapters/prisma.service';
import { ScrapedMovie } from '@prisma/client';
import { Page } from 'puppeteer-core';

interface MovieDetails {
  title: string | null;
  releaseYear: string | null;
  director: string | null;
  synopsis: string | null;
  posterImage: string | null;
  duration: string | null;
  rating: string | null;
  genres: string[];
  country: string[];
  language: string[];
}

interface StreamingInfo {
  service: string;
  link: string;
}

interface MoviePageData {
  details: MovieDetails;
  streaming: StreamingInfo[];
}

const SELECTORS = {
  list: {
    movieFrame: 'ul.poster-list li a.frame',
    nextPageButton: 'a.next',
  },
  moviePage: {
    title: 'meta[property="og:title"]',
    director: 'meta[name="twitter:data1"]',
    synopsis: 'meta[name="description"]',
    posterImageSrc: '.poster .film-poster img',
    releaseYear: 'a[href*="/year/"]',
    watchPanel: 'section.watch-panel .services',
    serviceItem: 'section.watch-panel .services p.service',
    serviceLink: 'a.label',
    serviceName: 'a.label .title .name',
    serviceLocale: 'a.label .title .locale',
    duration: 'p.text-link.text-footer',
    rating: 'a.display-rating',
    genres: 'div.genres a'
  },
};

/**
 * Rola a página até o final para garantir que todo o conteúdo de lazy loading seja carregado.
 * @param page A instância da página do Puppeteer.
 */
async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Executa uma ação assíncrona com um número máximo de tentativas.
 * @param action A função (Promise) a ser executada.
 * @param maxRetries O número máximo de tentativas.
 * @param logger O logger para registrar as tentativas.
 * @param context Uma string de contexto para a mensagem de log.
 * @returns O resultado da ação se for bem-sucedida.
 */
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
      logger.warn(
        `Tentativa ${attempt} falhou para ${context}: ${error.message}`,
      );
      if (attempt === maxRetries) {
        logger.error(
          `Todas as ${maxRetries} tentativas falharam para ${context}. Desistindo.`,
        );
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw new Error('Lógica de retries falhou inesperadamente.');
}

@Injectable()
export class ScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(ScraperService.name);
  private browser: Browser | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    if (this.browser) {
      this.logger.log('Fechando o navegador ao destruir o módulo...');
      await this.browser.close();
    }
  }

  async scrapeMovies(listLink: string): Promise<ScrapedMovie[]> {
    this.logger.log(`Iniciando processo de raspagem da lista: ${listLink}`);

    const launchOptions: puppeteer.LaunchOptions = {
      headless: true,
      timeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--memory-pressure-off',
        '--no-zygote',
      ],
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.env.NODE_ENV === 'production') {
      launchOptions.executablePath = '/usr/bin/google-chrome-stable';
    } else {
      launchOptions.channel = 'chrome';
    }

    try {
      this.browser = await puppeteer.launch(launchOptions);

      const existingSlugs = new Set(
        (
          await this.prisma.scrapedMovie.findMany({ select: { slug: true } })
        ).map((m) => m.slug),
      );

      const movieLinks = await this.scrapeMovieLinks(this.browser, listLink);
      const newMovies: ScrapedMovie[] = [];

      for (const { href, poster } of movieLinks) {
        const slug = this.extractSlugFromUrl(href);
        if (!slug || existingSlugs.has(slug)) {
          if (slug)
            this.logger.log(`Filme já existe no banco, pulando: ${slug}`);
          continue;
        }

        try {
          const { details, streaming } = await scrapeWithRetries(
            () => this.scrapeMoviePage(this.browser!, href),
            3,
            this.logger,
            `filme ${slug}`,
          );

          if (!details.title) {
            this.logger.warn(
              `Título não encontrado para ${href}, pulando intencionalmente.`,
            );
            continue;
          }

          // Otimiza a URL do poster para maior resolução
          let posterUrl = details.posterImage || poster;
          if (posterUrl?.includes('ltrbxd.com/resized/film-poster')) {
            const match = posterUrl.match(/(.*\/film-poster\/.*?)-\d+-\d+-\d+-\d+-crop\.jpg(.*)/);
            if (match) {
              const [, basePath, queryParams] = match;
              // Usa as dimensões máximas observadas no site: 2000x3000
              posterUrl = `${basePath}-0-2000-0-3000-crop.jpg${queryParams}`;
              this.logger.log(`Poster otimizado para alta resolução: ${posterUrl}`);
            }
          }
          const posterToSave = posterUrl;

          // Log dos gêneros antes da criação para verificação
          this.logger.log(`Gêneros a serem processados para ${slug}: ${JSON.stringify(details.genres)}`);
          this.logger.log(`Gêneros com slugs normalizados:`);
          details.genres.forEach(genreName => {
            this.logger.log(`- ${genreName} => slug: ${this.createSlugFromName(genreName)}`);
          });

          const savedMovie = await this.prisma.scrapedMovie.create({
            data: {
              slug,
              title: details.title,
              releaseDate: details.releaseYear,
              director: details.director,
              synopsisEn: details.synopsis,
              posterImage: posterToSave,
              duration: details.duration,
              rating: details.rating,
              // Usar connectOrCreate para gêneros (tabela relacional)
              genres: {
                connectOrCreate: details.genres.map(genreName => ({
                  where: { slug: this.createSlugFromName(genreName) },
                  create: { 
                    nome: genreName,
                    slug: this.createSlugFromName(genreName) 
                  }
                }))
              },
              // Usar connectOrCreate para países (tabela relacional)
              country: {
                connectOrCreate: details.country.map(countryName => ({
                  where: { slug: this.createSlugFromName(countryName) },
                  create: {
                    nome: countryName,
                    slug: this.createSlugFromName(countryName)
                  }
                }))
              },
              // Usar connectOrCreate para idiomas (tabela relacional)
              language: {
                connectOrCreate: details.language.map(languageName => ({
                  where: { slug: this.createSlugFromName(languageName) },
                  create: {
                    nome: languageName,
                    slug: this.createSlugFromName(languageName)
                  }
                }))
              },
              streamingServices: {
                create: streaming,
              },
            },
          });

          this.logger.log(`Filme salvo: ${savedMovie.slug} | Poster: ${posterToSave}`);
          
          // Verificar gêneros associados
          const movieWithGenres = await this.prisma.scrapedMovie.findUnique({
            where: { id: savedMovie.id },
            include: { genres: true }
          });
          
          if (movieWithGenres?.genres) {
            this.logger.log(`Gêneros salvos para ${savedMovie.slug}:`);
            movieWithGenres.genres.forEach(genre => {
              this.logger.log(`- ${genre.nome} (${genre.slug})`);
            });
          }
          
          newMovies.push(savedMovie);
        } catch (e) {
          this.logger.error(
            `Falha final ao processar ${href} após todas as tentativas: ${e.message}`,
            e.stack,
          );
        }
      }

      this.logger.log(
        `Raspagem finalizada. Total de filmes novos: ${newMovies.length}`,
      );
      return newMovies;
    } catch (error) {
      this.logger.error(
        `Um erro crítico ocorreu durante a raspagem: ${error.message}`,
        error.stack,
      );
      return [];
    } finally {
      if (this.browser) {
        this.logger.log('Encerrando instância do navegador...');
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  private async scrapeMovieLinks(
    browser: Browser,
    listLink: string,
  ): Promise<Array<{ href: string; poster: string | null }>> {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);

    this.logger.log(`Navegando para a lista de filmes: ${listLink}`);
    try {
      await page.goto(listLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
      this.logger.log('✅ Página carregada com sucesso.');
    } catch (e) {
      this.logger.error(`❌ Erro ao navegar para a lista: ${e.message}`);
      await page.close();
      return [];
    }

    const movieLinks: { href: string; poster: string | null }[] = [];
    let hasNextPage = true;
    let pageCount = 1;

    while (hasNextPage) {
      this.logger.log(`Analisando página da lista: ${pageCount}...`);
      try {
        await page.waitForSelector(SELECTORS.list.movieFrame, { timeout: 12000 });
      } catch (e) {
        this.logger.warn(`Timeout ou erro ao esperar seletor de filme: ${e.message}`);
      }

      this.logger.log('Iniciando scroll para carregar todos os filmes (lazy loading)...');
      try {
        await autoScroll(page);
      } catch (e) {
        this.logger.warn(`Erro ao fazer scroll: ${e.message}`);
      }
      this.logger.log('Scroll finalizado.');

      let linksOnPage: { href: string; poster: string | null }[] = [];
      try {
        linksOnPage = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('ul.poster-list li')).map((li) => {
            const a = li.querySelector('a.frame');
            const href = a ? (a as HTMLAnchorElement).href : null;
            const img = li.querySelector('img');
            let poster = null;
            if (img) {
              const srcset = img.getAttribute('srcset');
              if (srcset) {
                poster = srcset.split(',').pop()?.trim().split(' ')[0] || null;
              } else {
                poster = img.getAttribute('src');
              }
            }
            return { href, poster };
          });
        });
      } catch (e) {
        this.logger.error(`Erro ao extrair links da página: ${e.message}`);
      }
      this.logger.log(`Coletados ${linksOnPage.length} filmes nesta página.`);
      movieLinks.push(...linksOnPage);

      // Lógica de paginação para o teste
      let nextButton = null;
      try {
        nextButton = await page.$(SELECTORS.list.nextPageButton);
      } catch (e) {
        this.logger.warn(`Erro ao buscar botão de próxima página: ${e.message}`);
      }
      if (nextButton) {
        this.logger.log(
          `Navegando da página ${pageCount} para a ${pageCount + 1}...`,
        );
        try {
          await Promise.all([
            nextButton.click(),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
          ]);
          await new Promise((resolve) =>
            setTimeout(resolve, 2000 + Math.random() * 3000),
          );
          pageCount++;
        } catch (e) {
          this.logger.warn(`Erro na navegação para próxima página: ${e.message}`);
          hasNextPage = false;
        }
      } else {
        this.logger.log('Não há mais páginas para navegar.');
        hasNextPage = false;
      }
    }

    await page.close();
    this.logger.log(`Total de filmes coletados: ${movieLinks.length}`);
    return movieLinks;
  }

  private async scrapeMoviePage(
    browser: Browser,
    movieLink: string,
  ): Promise<MoviePageData> {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);

    this.logger.log(`Raspando detalhes de: ${movieLink}`);
    try {
      await page.goto(movieLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      this.logger.error(`Erro ao navegar para página do filme: ${e.message}`);
      await page.close();
      throw e;
    }

    const pageData = await page.evaluate((s): MoviePageData => {
      const query = (selector: string, attribute = 'content') =>
        document.querySelector(selector)?.getAttribute(attribute) || null;

      const details: MovieDetails = {
        title: (() => {
          const rawTitle = query(s.moviePage.title);
          if (!rawTitle) return null;
          // Remove o ano entre parênteses no final do título, ex: "Nome do Filme (2023)"
          return rawTitle.replace(/\s*\(\d{4}\)$/, '').trim();
        })(),
        director: query(s.moviePage.director),
        synopsis: query(s.moviePage.synopsis),
        posterImage: (() => {
          const img = document.querySelector(s.moviePage.posterImageSrc);
          const srcset = img?.getAttribute('srcset');
          if (srcset) {
            // Pega a última URL do srcset (maior resolução)
            return srcset.split(',').pop()?.trim().split(' ')[0] || null;
          }
          return img?.getAttribute('src') || null;
        })(),
        
        releaseYear:
          document.querySelector(s.moviePage.releaseYear)?.textContent || null,

        duration: (() => {
          const el = document.querySelector('p.text-link.text-footer');
          if (!el) return null;
          const raw = el.textContent.trim();
          const match = raw.match(/(\d+\s*mins?)/);
          return match ? match[1] : null;
        })(),

        rating: (() => {
          const el = document.querySelector(s.moviePage.rating);
          if (!el) return '0';
          const value = el.textContent?.trim() || '';
          return value ? value : '0';
        })(),

        genres: Array.from(document.querySelectorAll('#tab-genres .text-sluglist.capitalize:nth-of-type(1) a.text-slug')).map(
          (el) => el.textContent?.trim() || ''
        ),

        //Country
        country: (() => {
          const detailsTab = document.querySelector('#tab-details');
          let countries: string[] = [];
          if (detailsTab) {
            const h3s = Array.from(detailsTab.querySelectorAll('h3'));
            for (const h3 of h3s) {
              const h3Text = h3.textContent?.trim().toLowerCase();
              if (h3Text === 'country' || h3Text === 'countries') {
                const next = h3.nextElementSibling;
                if (next && next.classList.contains('text-sluglist')) {
                  countries = countries.concat(Array.from(next.querySelectorAll('a.text-slug')).map(el => el.textContent?.trim() || ''));
                }
              }
            }
          }
          return countries;
        })(),
        //Language
        language: (() => {
          const detailsTab = document.querySelector('#tab-details');
          let languages: string[] = [];
          if (detailsTab) {
            const h3s = Array.from(detailsTab.querySelectorAll('h3'));
            for (const h3 of h3s) {
              const h3Text = h3.textContent?.trim().toLowerCase();
              if (h3Text === 'language' || h3Text === 'primary language') {
                const next = h3.nextElementSibling;
                if (next && next.classList.contains('text-sluglist')) {
                  languages = languages.concat(Array.from(next.querySelectorAll('a.text-slug')).map(el => el.textContent?.trim() || ''));
                }
              }
            }
          }
          return languages;
        })(),
      };

      const streaming: StreamingInfo[] = [];
      document.querySelectorAll(s.moviePage.serviceItem).forEach((el) => {
        const linkEl = el.querySelector(s.moviePage.serviceLink);
        const nameEl = el.querySelector(s.moviePage.serviceName);
        const localeEl = el.querySelector(s.moviePage.serviceLocale);

        if (
          linkEl &&
          nameEl &&
          (localeEl as HTMLElement)?.innerText.trim() === 'BR'
        ) {
          const rawLink = linkEl.getAttribute('href');
          if (!rawLink) return;
          try {
            const finalLink = new URL(rawLink).searchParams.get('r');
            if (finalLink && !streaming.some((s) => s.link === finalLink)) {
              streaming.push({
                service: (nameEl as HTMLElement).innerText.trim(),
                link: finalLink,
              });
            }
          } catch {}
        }
      });

      return { details, streaming };
    }, SELECTORS);

    await page.close();
    return pageData;
  }

  private extractSlugFromUrl(url: string): string | null {
    const match = url.match(/letterboxd\.com\/film\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Cria um slug a partir de um nome.
   * Usado para gêneros, países e idiomas.
   * @param name O nome a ser convertido em slug
   * @returns Um slug normalizado
   */
  private createSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/--+/g, '-') // Remove hífens duplicados
      .trim();
  }

  /**
   * Marca filmes de uma lista específica do Letterboxd como Natal/Christmas.
   * Este método busca filmes existentes no banco que fazem parte da lista fornecida.
   * @param listUrl URL da lista do Letterboxd
   * @returns Número de filmes marcados como Natal
   */
  async markMoviesFromListAsChristmas(listUrl: string): Promise<number> {
    return this.markMoviesFromListAsGenre(listUrl, 'Christmas');
  }

  /**
   * Marca filmes de uma lista específica do Letterboxd com um gênero específico.
   * Este método é genérico e pode ser usado para qualquer gênero.
   * @param listUrl URL da lista do Letterboxd
   * @param genreName Nome do gênero (será criado automaticamente se não existir)
   * @returns Número de filmes marcados com o gênero
   */
  async markMoviesFromListAsGenre(listUrl: string, genreName: string): Promise<number> {
    const genreSlug = this.createSlugFromName(genreName);
    this.logger.log(`� Iniciando marcação de filmes da lista como "${genreName}": ${listUrl}`);
    
    try {
      // Buscar ou criar o gênero
      const genre = await this.prisma.genre.upsert({
        where: { slug: genreSlug },
        update: {},
        create: { 
          nome: genreName,
          slug: genreSlug,
          isFeatured: genreName.toLowerCase() === 'christmas' // Destacar apenas Christmas por padrão
        }
      });

      this.logger.log(`✅ Gênero "${genreName}" encontrado/criado: ID ${genre.id}`);

      // Fazer scraping apenas dos links da lista (sem salvar filmes)
      const movieLinks = await this.scrapeMovieLinksOnly(listUrl);
      this.logger.log(`📋 Encontrados ${movieLinks.length} filmes na lista`);

      // Extrair slugs dos filmes da lista
      const slugsFromList = movieLinks
        .map(link => this.extractSlugFromUrl(link.href))
        .filter(slug => slug !== null);

      this.logger.log(`🔍 Slugs extraídos da lista: ${slugsFromList.length}`);

      // Buscar filmes existentes no banco que estão na lista
      const existingMovies = await this.prisma.scrapedMovie.findMany({
        where: {
          slug: { in: slugsFromList }
        },
        include: { genres: true }
      });

      this.logger.log(`💾 Filmes encontrados no banco: ${existingMovies.length}`);

      // Marcar com o gênero os que ainda não têm esse gênero
      let markedCount = 0;
      for (const movie of existingMovies) {
        const hasGenre = movie.genres.some(g => g.slug === genreSlug);
        
        if (!hasGenre) {
          await this.prisma.scrapedMovie.update({
            where: { id: movie.id },
            data: { 
              genres: { 
                connect: { id: genre.id } 
              } 
            }
          });
          markedCount++;
          this.logger.log(`� "${movie.title}" marcado como "${genreName}"`);
        } else {
          this.logger.log(`� "${movie.title}" já possui gênero "${genreName}"`);
        }
      }

      // Listar filmes da lista que não estão no banco
      const existingSlugs = new Set(existingMovies.map(m => m.slug));
      const missingFromDb = slugsFromList.filter(slug => !existingSlugs.has(slug));
      if (missingFromDb.length > 0) {
        this.logger.warn(`⚠️ Filmes da lista que NÃO estão no banco (${missingFromDb.length}): ${missingFromDb.join(', ')}`);
      }

      this.logger.log(`🎉 Processo concluído! ${markedCount} filmes marcados como "${genreName}".`);
      return markedCount;
      
    } catch (error) {
      this.logger.error(`❌ Erro ao marcar filmes da lista como "${genreName}":`, error.message);
      throw error;
    }
  }

  /**
   * Marca filmes de uma lista específica do Letterboxd como um gênero específico.
  /**
   * Método auxiliar para fazer scraping apenas dos links dos filmes (sem processar detalhes).
   * @param listUrl URL da lista do Letterboxd
   * @returns Array com os links dos filmes
   */
  private async scrapeMovieLinksOnly(listUrl: string): Promise<Array<{ href: string; poster: string | null }>> {
    const launchOptions: puppeteer.LaunchOptions = {
      headless: true,
      timeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--memory-pressure-off',
        '--no-zygote',
      ],
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.env.NODE_ENV === 'production') {
      launchOptions.executablePath = '/usr/bin/google-chrome-stable';
    } else {
      launchOptions.channel = 'chrome';
    }

    const browser = await puppeteer.launch(launchOptions);
    
    try {
      const movieLinks = await this.scrapeMovieLinks(browser, listUrl);
      return movieLinks;
    } finally {
      await browser.close();
    }
  }
}
