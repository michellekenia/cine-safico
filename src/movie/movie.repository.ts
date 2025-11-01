import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/adapters/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Define a estrutura para um resumo do filme, usado na listagem.
 */
type MovieSummary = {
  id: string;
  slug: string;
  title: string;
  releaseDate: string | null;
  posterImage: string | null;
};

/**
 * Define a estrutura para um resultado paginado genérico.
 */
type PaginatedResult<T> = {
  data: T[];
  total: number;
  currentPage: number;
  totalPages: number;
};


@Injectable()
export class MovieRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(
    page: number,
    pageSize: number,
    search?: string,
    genreSlug?: string,
    countrySlug?: string,
    languageSlug?: string,
    platformSlug?: string,
  ): Promise<PaginatedResult<MovieSummary>> {
    const pageNumber = Math.max(1, page);
    const size = Math.max(1, pageSize);

    const where = this.buildWhereClause(search, genreSlug, countrySlug, languageSlug, platformSlug);
    const skip = (pageNumber - 1) * size;

    const [movies, total] = await this.prisma.$transaction([
      this.prisma.scrapedMovie.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          rating: true,
          releaseDate: true,
          posterImage: true,
        },
        where,
        orderBy: {
          title: 'asc',
        },
        skip,
        take: size,
      }),
      this.prisma.scrapedMovie.count({ where }),
    ]);

    return {
      data: movies,
      total,
      currentPage: pageNumber,
      totalPages: Math.ceil(total / size),
    };
  }

  private buildWhereClause(
    search?: string, 
    genreSlug?: string, 
    countrySlug?: string, 
    languageSlug?: string,
    platformSlug?: string
  ): Prisma.ScrapedMovieWhereInput {
    const whereClause: Prisma.ScrapedMovieWhereInput = {};
    
    // Filtro por termo de busca
    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive',
      };
    }
    
    // Filtro por gênero
    if (genreSlug) {
      whereClause.genres = {
        some: {
          slug: genreSlug,
        },
      };
    }
    
    // Filtro por país
    if (countrySlug) {
      whereClause.country = {
        some: {
          slug: countrySlug,
        },
      };
    }
    
    // Filtro por idioma
    if (languageSlug) {
      whereClause.language = {
        some: {
          slug: languageSlug,
        },
      };
    }
    
    // Filtro por plataforma de streaming
    if (platformSlug) {
      whereClause.streamingPlatforms = {
        some: {
          slug: platformSlug,
        },
      };
    }
    
    return whereClause;
  }

  async findDetailsMovieBySlug(slug: string) {
    return this.prisma.scrapedMovie.findUnique({
      where: {
        slug: slug,
      },
      include: {
        streamingServices: true,
        genres: true,
        country: true,
        language: true,
      },
    });
  }

  async findTopRatedByLandingPage(take: number): Promise<any[]> {
    const query = Prisma.sql`
      SELECT
        "slug",
        "title",
        "releaseDate",
        "rating",
        "posterImage"
      FROM
        "ScrapedMovie"
      WHERE
        "rating" IS NOT NULL AND "rating" != ''
      ORDER BY
        CAST("rating" AS DECIMAL(2,1)) DESC
      LIMIT ${take};
    `;

    return this.prisma.$queryRaw(query);
  }

async findManyByGenre(genre: string, take: number) {
    return this.prisma.scrapedMovie.findMany({
      where: {
        genres: {
          some: {
            slug: genre,
          },
        },
      },
      select: {
        slug: true,
        title: true,
        releaseDate: true,
        rating: true,
        posterImage: true,
      },
      orderBy: {
        rating: 'desc',
      },
      take: take,
    });
  }

  /**
   * Busca no banco de dados todos os gêneros marcados como 'featured'.
   */
  async findFeaturedGenres() {
    return this.prisma.genre.findMany({
      where: {
        isFeatured: true,
      },
      select: {
        nomePt: true,
        slug: true,
      },
    });
  }

async findManyByCountry(country: string, take: number) {
    return this.prisma.scrapedMovie.findMany({
      where: {
        country: {
          some: {
            slug: country,
          },
        },
      },
      select: {
        slug: true,
        title: true,
        releaseDate: true,
        rating: true,
        posterImage: true,
      },
      orderBy: {
        rating: 'desc',
      },
      take: take,
    });
  }

  async findManyByLanguage(language: string, take: number) {
    return this.prisma.scrapedMovie.findMany({
      where: {
        language: {
          some: {
            slug: language,
          },
        },
      },
      select: {
        slug: true,
        title: true,
        releaseDate: true,
        rating: true,
        posterImage: true,
      },
      orderBy: {
        rating: 'desc',
      },
      take: take,
    });
  }

  // Métodos para buscar metadados (gêneros, países, idiomas)
  
  async findAllGenres() {
    return this.prisma.genre.findMany({
      select: {
        slug: true,
        nome: true,
        nomePt: true,
        _count: {
          select: {
            movies: true
          }
        }
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }
  
  async findAllCountries() {
    return this.prisma.country.findMany({
      select: {
        slug: true,
        nome: true,
        nomePt: true,
        _count: {
          select: {
            movies: true
          }
        }
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }
  
  async findAllLanguages() {
    return this.prisma.language.findMany({
      select: {
        slug: true,
        nome: true,
        nomePt: true,
        _count: {
          select: {
            movies: true
          }
        }
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async findAllPlatforms() {
    return this.prisma.streamingPlatform.findMany({
      select: {
        slug: true,
        nome: true,
        categoria: true,
        isFeatured: true,
        _count: {
          select: {
            movies: true
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { categoria: 'asc' },
        { nome: 'asc' }
      ],
    });
  }
}