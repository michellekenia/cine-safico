import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  BROWSER_PROVIDER,
  MOVIE_PARSER,
  MOVIE_STORAGE,
} from '../interfaces/scraper.interface';
import { IBrowserProvider, IMovieParser, IMovieStorage } from '../interfaces/scraper.interface';
import { MovieData, ScrapedMovieRecord } from '../interfaces/models.interface';

@Injectable()
export class MovieUpdaterService {
  private readonly logger = new Logger(MovieUpdaterService.name);

  constructor(
    @Inject(BROWSER_PROVIDER)
    private readonly browserProvider: IBrowserProvider,
    @Inject(MOVIE_PARSER)
    private readonly movieParser: IMovieParser,
    @Inject(MOVIE_STORAGE)
    private readonly movieStorage: IMovieStorage,
  ) {}

  async updateNullFields(listLink: string): Promise<ScrapedMovieRecord[]> {
    const browser = await this.browserProvider.launch();

    try {
      const nullFieldSlugs = await this.movieStorage.findMoviesWithNullFields();
      if (nullFieldSlugs.length === 0) {
        return [];
      }

      const movieLinks = await this.movieParser.extractLinks(browser, listLink);
      if (movieLinks.length === 0) {
        return [];
      }

      const moviesToUpdate = this.filterMoviesNeedingUpdate(movieLinks, nullFieldSlugs);
      if (moviesToUpdate.length === 0) {
        return [];
      }

      const scrapedData = await this.scrapeMovieDetails(browser, moviesToUpdate);
      const updatedMovies = await this.persistUpdates(scrapedData);

      return updatedMovies;
    } catch (error) {
      this.logger.error(`Erro crítico na atualização: ${this.formatError(error)}`);
      throw error;
    } finally {
      await this.browserProvider.close();
    }
  }

  private filterMoviesNeedingUpdate(movieLinks: any[], slugsNeedingUpdate: string[]) {
    const slugSet = new Set(slugsNeedingUpdate);
    return movieLinks.filter((link) => {
      const slug = this.extractSlugFromUrl(link.href);
      return slug && slugSet.has(slug);
    });
  }

  private async scrapeMovieDetails(
    browser: any,
    movieLinks: any[],
  ): Promise<MovieData[]> {
    const scrapedData: MovieData[] = [];

    for (const { href, poster } of movieLinks) {
      const slug = this.extractSlugFromUrl(href);
      if (!slug) continue;

      try {
        const pageData = await this.movieParser.extractDetails(browser, href);
        if (!pageData.details.title) continue;

        const posterUrl = this.movieStorage.optimizePosterUrl(
          pageData.details.posterImage || poster,
        );

        scrapedData.push({
          slug,
          posterUrl,
          details: pageData.details,
          streaming: pageData.streaming,
        });
      } catch (error) {
        this.logger.error(`Falha ao scrape ${href}: ${this.formatError(error)}`);
      }
    }

    return scrapedData;
  }

  private async persistUpdates(scrapedData: MovieData[]): Promise<ScrapedMovieRecord[]> {
    const updatedMovies: ScrapedMovieRecord[] = [];

    for (const movieData of scrapedData) {
      try {
        const updated = await this.movieStorage.updateNullFieldsOnly(movieData);
        if (updated) {
          updatedMovies.push(updated);
        }
      } catch (error) {
        this.logger.error(`Falha ao persistir ${movieData.slug}: ${this.formatError(error)}`);
      }
    }

    return updatedMovies;
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private extractSlugFromUrl(url: string): string | null {
    try {
      const match = url.match(/letterboxd\.com\/film\/([^\/]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
