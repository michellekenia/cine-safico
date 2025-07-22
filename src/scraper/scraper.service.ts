import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import { PrismaService } from 'src/adapters/prisma.service';
import { ScrapedMovie } from '@prisma/client';

interface MovieDetails {
  title: string | null;
  releaseDate: string | null;
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
      this.browser = await puppeteer.launch({ headless: true });

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
          const { details, streaming } = await this.scrapeMoviePage(
            this.browser,
            link,
          );

          if (!details.title) {
            this.logger.warn(`Título não encontrado para ${link}, pulando.`);
            continue;
          }

          const movieData = {
            slug: slug,
            title: details.title,
            releaseDate: details.releaseDate,
            director: details.director,
            synopsis: details.synopsis,
            posterImage: details.posterImage,
            streamingServices: {
              create: streaming,
            },
          };

          const savedMovie = await this.prisma.scrapedMovie.create({
            data: movieData,
          });

          this.logger.log(`✅ Filme e serviços salvos: ${savedMovie.slug}`);
          newMovies.push(savedMovie);
        } catch (e) {
          this.logger.error(
            `❌ Falha ao processar ${link}: ${e.message}`,
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
      return []; // Retorna vazio em caso de falha crítica
    } finally {
      if (this.browser) {
        this.logger.log('Fechando o navegador no bloco finally.');
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
    this.logger.log(`Navegando para a lista: ${listLink}`);
    await page.goto(listLink, { waitUntil: 'networkidle2' });

    const movieLinks: string[] = [];
    let hasNextPage = true;

    while (hasNextPage) {
      await page.waitForSelector(SELECTORS.list.movieFrame);
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

      const nextButton = await page.$(SELECTORS.list.nextPageButton);
      if (nextButton) {
        this.logger.log('Navegando para a próxima página...');
        await Promise.all([
          nextButton.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
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
        releaseDate:
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

  // async scrapeMovieDetails(movieLink: string): Promise<any> {
  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();

  //   console.log(`Navegando para a página do filme: ${movieLink}`);
  //   await page.goto(movieLink, { waitUntil: 'domcontentloaded' });

  //   const movieDetails = await page.evaluate(() => {
  //     const title =
  //       document
  //         .querySelector('meta[property="og:title"]')
  //         ?.getAttribute('content') || '';
  //     const releaseDate =
  //       document.querySelector('span#film-release-date')?.textContent || '';
  //     const director =
  //       document
  //         .querySelector('meta[name="twitter:data1"]')
  //         ?.getAttribute('content') || '';
  //     const synopsis =
  //       document
  //         .querySelector('meta[name="description"]')
  //         ?.getAttribute('content') || '';
  //     const posterImage =
  //       document
  //         .querySelector('meta[property="og:image"]')
  //         ?.getAttribute('content') || '';

  //     return { title, releaseDate, director, synopsis, posterImage };
  //   });

  //   console.log(`Detalhes do filme coletados: ${movieDetails.title}`);
  //   await browser.close();
  //   return movieDetails;
  // }

  extractSlugFromUrl(url: string): string | null {
    const match = url.match(/letterboxd\.com\/film\/([^\/]+)\//);
    return match ? match[1] : null;
  }
}
