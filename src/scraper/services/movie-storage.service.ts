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
          { title: '' },
          { originalTitle: null },
          { originalTitle: '' },
          { director: null },
          { director: '' },
          { synopsisEn: null },
          { synopsisEn: '' },
          { synopsisPt: null },
          { synopsisPt: '' },
          { duration: null },
          { duration: '' },
          { rating: null },
          { rating: '' },
          { releaseDate: null },
          { releaseDate: '' },
          { alternativeTitles: { equals: [] } },
          { posterImage: null },
          { posterImage: '' },
          { genres: { none: {} } },
          { country: { none: {} } },
          { language: { none: {} } },
          { streamingServices: { none: {} } },
          { streamingPlatforms: { none: {} } },
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
      const existingMovie = await this.findMovieWithRelations(movie.slug);
      if (!existingMovie) {
        return null;
      }

      const dataToUpdate = this.prepareScalarFieldUpdates(existingMovie, movie);
      const relationsToUpdate = this.prepareRelationUpdates(existingMovie, movie);

      if (Object.keys(dataToUpdate).length === 0 && Object.keys(relationsToUpdate).length === 0) {
        return this.mapToRecord(existingMovie);
      }

      const updateData = { ...dataToUpdate, ...relationsToUpdate };
      const updatedMovie = await this.prisma.scrapedMovie.update({
        where: { slug: movie.slug },
        data: updateData,
      });

      return this.mapToRecord(updatedMovie);
    } catch (error) {
      this.logger.error(`Falha ao atualizar ${movie.slug}: ${error.message}`);
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

  private async findMovieWithRelations(slug: string) {
    return this.prisma.scrapedMovie.findUnique({
      where: { slug },
      include: {
        genres: true,
        country: true,
        language: true,
        streamingServices: true,
        streamingPlatforms: true,
      },
    });
  }

  private prepareScalarFieldUpdates(existingMovie: any, newMovie: MovieData): Record<string, any> {
    const dataToUpdate: Record<string, any> = {};

    if (this.isNullOrEmpty(existingMovie.title) && newMovie.details.title) {
      dataToUpdate.title = newMovie.details.title;
    }

    if (this.isNullOrEmpty(existingMovie.originalTitle) && newMovie.details.originalTitle) {
      dataToUpdate.originalTitle = newMovie.details.originalTitle;
    }

    if (this.isNullOrEmpty(existingMovie.director) && newMovie.details.director) {
      dataToUpdate.director = newMovie.details.director;
    }

    if (this.isNullOrEmpty(existingMovie.synopsisEn) && newMovie.details.synopsis) {
      dataToUpdate.synopsisEn = newMovie.details.synopsis;
    }

    if (this.isNullOrEmpty(existingMovie.posterImage) && newMovie.posterUrl) {
      dataToUpdate.posterImage = newMovie.posterUrl;
    }

    if (this.isNullOrEmpty(existingMovie.duration) && newMovie.details.duration) {
      dataToUpdate.duration = newMovie.details.duration;
    }

    if (this.isNullOrEmpty(existingMovie.rating) && newMovie.details.rating) {
      dataToUpdate.rating = newMovie.details.rating;
    }

    if (this.isNullOrEmpty(existingMovie.releaseDate) && newMovie.details.releaseYear) {
      dataToUpdate.releaseDate = newMovie.details.releaseYear;
    }

    const hasNoTitles = !existingMovie.alternativeTitles || existingMovie.alternativeTitles.length === 0;
    const hasNewTitles = newMovie.details.alternativeTitles && newMovie.details.alternativeTitles.length > 0;
    if (hasNoTitles && hasNewTitles) {
      dataToUpdate.alternativeTitles = newMovie.details.alternativeTitles;
    }

    return dataToUpdate;
  }

  private prepareRelationUpdates(existingMovie: any, newMovie: MovieData): Record<string, any> {
    const relationsToUpdate: Record<string, any> = {};

    if (this.shouldUpdateRelation(existingMovie.genres, newMovie.details.genres)) {
      relationsToUpdate.genres = {
        connectOrCreate: newMovie.details.genres.map((genreName) => ({
          where: { slug: this.slugService.generate(genreName) },
          create: {
            nome: genreName,
            slug: this.slugService.generate(genreName),
          },
        })),
      };
    }

    if (this.shouldUpdateRelation(existingMovie.country, newMovie.details.country)) {
      relationsToUpdate.country = {
        connectOrCreate: newMovie.details.country.map((countryName) => ({
          where: { slug: this.slugService.generate(countryName) },
          create: {
            nome: countryName,
            slug: this.slugService.generate(countryName),
          },
        })),
      };
    }

    if (this.shouldUpdateRelation(existingMovie.language, newMovie.details.language)) {
      relationsToUpdate.language = {
        connectOrCreate: newMovie.details.language.map((languageName) => ({
          where: { slug: this.slugService.generate(languageName) },
          create: {
            nome: languageName,
            slug: this.slugService.generate(languageName),
          },
        })),
      };
    }

    if (this.shouldUpdateRelation(existingMovie.streamingServices, newMovie.streaming)) {
      relationsToUpdate.streamingServices = {
        create: newMovie.streaming,
      };
    }

    return relationsToUpdate;
  }

  private isNullOrEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  private shouldUpdateRelation(existing: any[], newData: any[]): boolean {
    const hasNoExisting = !existing || existing.length === 0;
    const hasNewData = newData && newData.length > 0;
    return hasNoExisting && hasNewData;
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
