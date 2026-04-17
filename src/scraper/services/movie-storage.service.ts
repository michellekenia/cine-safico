import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/adapters/prisma.service';
import { IMovieStorage } from '../interfaces/scraper.interface';
import { MovieData, ScrapedMovieRecord } from '../interfaces/models.interface';
import { SlugService } from './slug.service';
import { ScrapedMovie } from '@prisma/client';

@Injectable()
export class MovieStorageService implements IMovieStorage {
  private readonly logger = new Logger(MovieStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
  ) {}

  async findExistingSlugs(slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];

    const existing = await this.prisma.scrapedMovie.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true },
    });

    return existing.map((m) => m.slug);
  }

  async findMoviesWithNullFields(): Promise<string[]> {
    const moviesWithNulls = await this.prisma.scrapedMovie.findMany({
      where: {
        OR: [
          { originalTitle: null },
          { originalTitle: '' },
          { alternativeTitles: { equals: [] } },
        ],
      },
      select: { slug: true },
    });

    return moviesWithNulls.map((m) => m.slug);
  }

  async saveMovie(movie: MovieData): Promise<ScrapedMovieRecord> {
    try {
      const savedMovie = await this.prisma.scrapedMovie.create({
        data: {
          slug: movie.slug,
          title: movie.details.title,
          originalTitle: movie.details.originalTitle || null,
          alternativeTitles: movie.details.alternativeTitles,
          releaseDate: movie.details.releaseYear,
          director: movie.details.director,
          synopsisEn: movie.details.synopsis,
          posterImage: movie.posterUrl,
          duration: movie.details.duration,
          rating: movie.details.rating,
          genres: {
            connectOrCreate: movie.details.genres.map((genreName) => ({
              where: { slug: this.slugService.generate(genreName) },
              create: {
                nome: genreName,
                slug: this.slugService.generate(genreName),
              },
            })),
          },
          country: {
            connectOrCreate: movie.details.country.map((countryName) => ({
              where: { slug: this.slugService.generate(countryName) },
              create: {
                nome: countryName,
                slug: this.slugService.generate(countryName),
              },
            })),
          },
          language: {
            connectOrCreate: movie.details.language.map((languageName) => ({
              where: { slug: this.slugService.generate(languageName) },
              create: {
                nome: languageName,
                slug: this.slugService.generate(languageName),
              },
            })),
          },
          streamingServices: {
            create: movie.streaming,
          },
        },
      });

      return this.mapToRecord(savedMovie);
    } catch (error) {
      this.logger.error(`Falha ao salvar ${movie.slug}: ${error.message}`);
      throw error;
    }
  }

  async saveMovies(movies: MovieData[]): Promise<ScrapedMovieRecord[]> {
    const saved: ScrapedMovieRecord[] = [];

    for (const movie of movies) {
      try {
        const record = await this.saveMovie(movie);
        saved.push(record);
      } catch {
        // Continua com próximo filme
      }
    }

    return saved;
  }

  async updateNullFieldsOnly(movie: MovieData): Promise<ScrapedMovieRecord | null> {
    try {
      const existingMovie = await this.findExistingMovie(movie.slug);
      if (!existingMovie) {
        return null;
      }

      const dataToUpdate = this.prepareScalarFieldUpdates(existingMovie, movie);

      if (Object.keys(dataToUpdate).length === 0) {
        return this.mapToRecord(existingMovie);
      }

      const updatedMovie = await this.prisma.scrapedMovie.update({
        where: { slug: movie.slug },
        data: dataToUpdate,
      });

      return this.mapToRecord(updatedMovie);
    } catch (error) {
      this.logger.error(`Falha ao atualizar ${movie.slug}`, error);
      throw error;
    }
  }

  optimizePosterUrl(posterUrl: string | null): string | null {
    if (!posterUrl?.includes('ltrbxd.com/resized/film-poster')) {
      return posterUrl;
    }

    const match = posterUrl.match(/(.*\/film-poster\/.*?)-\d+-\d+-\d+-\d+-crop\.jpg(.*)/);
    if (match) {
      const [, basePath, queryParams] = match;
      return `${basePath}-0-2000-0-3000-crop.jpg${queryParams}`;
    }

    return posterUrl;
  }

  private async findExistingMovie(slug: string): Promise<ScrapedMovie | null> {
    return this.prisma.scrapedMovie.findUnique({
      where: { slug },
    });
  }

  private prepareScalarFieldUpdates(existingMovie: any, newMovie: MovieData): Record<string, any> {
    const dataToUpdate: Record<string, any> = {};

    if (this.shouldUpdateField(existingMovie.originalTitle, newMovie.details.originalTitle)) {
      dataToUpdate.originalTitle = newMovie.details.originalTitle;
    }

    if (this.shouldUpdateField(existingMovie.alternativeTitles, newMovie.details.alternativeTitles)) {
      dataToUpdate.alternativeTitles = newMovie.details.alternativeTitles;
    }

    return dataToUpdate;
  }

  private isNullOrEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  private shouldUpdateField(existing: any, newValue: any): boolean {
    return this.isNullOrEmpty(existing) && !this.isNullOrEmpty(newValue);
  }

  private mapToRecord(movie: ScrapedMovie): ScrapedMovieRecord {
    return {
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      releaseDate: movie.releaseDate,
      director: movie.director,
      posterImage: movie.posterImage,
      createdAt: movie.scrapedAt,
      updatedAt: movie.scrapedAt,
    };
  }
}
