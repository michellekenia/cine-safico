import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { PrismaService } from 'src/adapters/prisma.service';
import { ScrapedMovie } from '@prisma/client';
import { Page } from 'puppeteer';

interface MovieDetails {
  title: string | null;
  releaseYear: string | null;
  director: string | null;
  synopsis: string | null;
  posterImage: string | null;
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
    posterImage: 'meta[property="og:image"]',
    releaseYear: 'a[href*="/year/"]',
    watchPanel: 'section.watch-panel .services',
    serviceItem: 'section.watch-panel .services p.service',
    serviceLink: 'a.label',
    serviceName: 'a.label .title .name',
    serviceLocale: 'a.label .title .locale',
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

    try {
      this.browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: true,
        timeout: 120000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
          '--disable-gpu',
        ],
      });

      const existingSlugs = new Set(
        (
          await this.prisma.scrapedMovie.findMany({ select: { slug: true } })
        ).map((m) => m.slug),
      );

      const movieLinks = await this.scrapeMovieLinks(this.browser, listLink);
      const newMovies: ScrapedMovie[] = [];

      for (const link of movieLinks) {
        const slug = this.extractSlugFromUrl(link);
        if (!slug || existingSlugs.has(slug)) {
          if (slug)
            this.logger.log(`Filme já existe no banco, pulando: ${slug}`);
          continue;
        }

        try {
          const { details, streaming } = await scrapeWithRetries(
            () => this.scrapeMoviePage(this.browser!, link),
            3,
            this.logger,
            `filme ${slug}`,
          );

          if (!details.title) {
            this.logger.warn(
              `Título não encontrado para ${link}, pulando intencionalmente.`,
            );
            continue;
          }

          const savedMovie = await this.prisma.scrapedMovie.create({
            data: {
              slug,
              title: details.title,
              releaseDate: details.releaseYear,
              director: details.director,
              synopsisEn: details.synopsis,
              posterImage: details.posterImage,
              streamingServices: {
                create: streaming,
              },
            },
          });

          this.logger.log(`✅ Filme salvo: ${savedMovie.slug}`);
          newMovies.push(savedMovie);
        } catch (e) {
          this.logger.error(
            `❌ Falha final ao processar ${link} após todas as tentativas: ${e.message}`,
            e.stack,
          );
        }
      }

      this.logger.log(
        `🏁 Raspagem finalizada. Total de filmes novos: ${newMovies.length}`,
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
  ): Promise<string[]> {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);

    this.logger.log(`Navegando para a lista de filmes: ${listLink}`);
    await page.goto(listLink, { waitUntil: 'networkidle2' });

    const movieLinks: string[] = [];
    let hasNextPage = true;
    let pageCount = 1;

    while (hasNextPage) {
      this.logger.log(`Analisando página da lista: ${pageCount}...`);
      await page.waitForSelector(SELECTORS.list.movieFrame, { timeout: 60000 });

      this.logger.log(
        'Iniciando scroll para carregar todos os filmes (lazy loading)...',
      );
      await autoScroll(page);
      this.logger.log('Scroll finalizado.');

      const linksOnPage = await page.evaluate(
        (selector) =>
          Array.from(
            document.querySelectorAll(selector),
            (el) => (el as HTMLAnchorElement).href,
          ),
        SELECTORS.list.movieFrame,
      );
      movieLinks.push(...linksOnPage);
      this.logger.log(`Coletados ${linksOnPage.length} links nesta página.`);

      // Lógica de paginação para o teste
      const nextButton = await page.$(SELECTORS.list.nextPageButton);
      // remover '&& pageCount < 2' para a raspagem completa
      if (nextButton && pageCount < 1) {
        this.logger.log(
          `Navegando da página ${pageCount} para a ${pageCount + 1}...`,
        );
        await Promise.all([
          nextButton.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 + Math.random() * 3000),
        );
        pageCount++;
      } else {
        if (!nextButton) {
          this.logger.log('Não há mais páginas para navegar.');
        } else {
          this.logger.log(
            'Limite de 2 páginas atingido para o teste. Parando a paginação.',
          );
        }
        hasNextPage = false;
      }
    }

    await page.close();
    this.logger.log(`Total de links de filmes coletados: ${movieLinks.length}`);
    return movieLinks;
  }

  private async scrapeMoviePage(
    browser: Browser,
    movieLink: string,
  ): Promise<MoviePageData> {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);

    this.logger.log(`Raspando detalhes de: ${movieLink}`);
    await page.goto(movieLink, { waitUntil: 'networkidle2' });

    const pageData = await page.evaluate((s): MoviePageData => {
      const query = (selector: string, attribute = 'content') =>
        document.querySelector(selector)?.getAttribute(attribute) || null;

      const details: MovieDetails = {
        title: query(s.moviePage.title),
        director: query(s.moviePage.director),
        synopsis: query(s.moviePage.synopsis),
        posterImage: query(s.moviePage.posterImage),
        releaseYear:
          document.querySelector(s.moviePage.releaseYear)?.textContent || null,
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
}
