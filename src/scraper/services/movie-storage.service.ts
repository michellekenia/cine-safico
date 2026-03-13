import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/adapters/prisma.service';
import { IMovieStorage } from '../interfaces/scraper.interface';
import { MovieData, ScrapedMovieRecord } from '../interfaces/models.interface';
import { SlugService } from './slug.service';
import { ScrapedMovie } from '@prisma/client';

/**
 * MovieStorageService
 * Responsável por persistência de filmes no banco de dados
 * Handles salvamento de filmes, gêneros, países, idiomas e serviços de streaming
 */
@Injectable()
export class MovieStorageService implements IMovieStorage {
  private readonly logger = new Logger(MovieStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
  ) {}

  /**
   * Verifica quais slugs já existem no banco de dados
   * @param slugs - Array de slugs a verificar
   * @returns Array com slugs que já existem
   */
  async findExistingSlugs(slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];

    const existing = await this.prisma.scrapedMovie.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true },
    });

    return existing.map((m) => m.slug);
  }

  /**
   * Salva um único filme no banco de dados
   * @param movie - Dados do filme a salvar
   * @returns Filme salvo com ID
   */
  async saveMovie(movie: MovieData): Promise<ScrapedMovieRecord> {
    try {
      const savedMovie = await this.prisma.scrapedMovie.create({
        data: {
          slug: movie.slug,
          title: movie.details.title,
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

      this.logger.log(`✅ Filme salvo: ${savedMovie.slug}`);
      return this.mapToRecord(savedMovie);
    } catch (error) {
      this.logger.error(`❌ Erro ao salvar filme ${movie.slug}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Salva múltiplos filmes no banco de dados
   * @param movies - Array de filmes a salvar
   * @returns Array de filmes salvos
   */
  async saveMovies(movies: MovieData[]): Promise<ScrapedMovieRecord[]> {
    const saved: ScrapedMovieRecord[] = [];

    for (const movie of movies) {
      try {
        const record = await this.saveMovie(movie);
        saved.push(record);
      } catch (error) {
        this.logger.error(`⚠️ Falha ao salvar ${movie.slug}, continuando com próximo...`);
        // Continuar com próximo filme em caso de erro
      }
    }

    this.logger.log(`✅ ${saved.length}/${movies.length} filmes salvos com sucesso`);
    return saved;
  }

  /**
   * Otimiza URL de poster para maior resolução
   * @param posterUrl - URL do poster original
   * @returns URL otimizada ou URL original se não for Letterboxd
   */
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

  /**
   * Mapeia dados do Prisma para ScrapedMovieRecord
   */
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
