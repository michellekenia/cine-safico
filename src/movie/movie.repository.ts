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


// Mapeamento de caracteres acentuados (minúsculos) para seus equivalentes sem acento.
// Usado com a função nativa translate() do Postgres, evitando depender da extensão unaccent.
const UNACCENT_FROM = 'àáâãäåèéêëìíîïòóôõöøùúûüçñýÿ';
const UNACCENT_TO = 'aaaaaaeeeeiiiioooooouuuucnyy';

// Remove acentos de um termo de busca usando o mesmo mapeamento acima, para que o termo
// digitado seja comparado no mesmo formato (sem acento) aplicado às colunas no banco.
function unaccent(text: string): string {
  let result = '';
  for (const char of text) {
    const index = UNACCENT_FROM.indexOf(char);
    result += index >= 0 ? UNACCENT_TO[index] : char;
  }
  return result;
}

@Injectable()
export class MovieRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca os IDs de filmes cujo título (title, originalTitle, alternativeTitlePt
   * ou qualquer item de alternativeTitles) bate com o termo de busca, ignorando acentos.
   */
  private async findMovieIdsMatchingSearch(search: string): Promise<string[]> {
    const searchWords = search
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[\s\-_]+/)
      .filter((word) => word.length > 0)
      // normalize() garante forma NFC antes de remover acentos: alguns títulos raspados
      // guardam acento como caractere combinante separado (ex: "I" + acento grave em vez
      // de "Ì"), o que faz o translate() abaixo não reconhecer o caractere.
      .map((word) => unaccent(word.normalize('NFC').toLowerCase()));

    if (searchWords.length === 0) return [];

    const wordConditions = searchWords.map(
      (word) => Prisma.sql`(
        translate(lower(normalize("title", NFC)), ${UNACCENT_FROM}, ${UNACCENT_TO}) LIKE ${'%' + word + '%'}
        OR translate(lower(normalize(COALESCE("originalTitle", ''), NFC)), ${UNACCENT_FROM}, ${UNACCENT_TO}) LIKE ${'%' + word + '%'}
        OR translate(lower(normalize(COALESCE("alternativeTitlePt", ''), NFC)), ${UNACCENT_FROM}, ${UNACCENT_TO}) LIKE ${'%' + word + '%'}
        OR EXISTS (
          SELECT 1 FROM unnest("alternativeTitles") AS alt
          WHERE translate(lower(normalize(alt, NFC)), ${UNACCENT_FROM}, ${UNACCENT_TO}) LIKE ${'%' + word + '%'}
        )
      )`,
    );

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "ScrapedMovie" WHERE ${Prisma.join(wordConditions, ' AND ')}`,
    );

    return rows.map((row) => row.id);
  }

  async findAllPaginated(
    page: number,
    pageSize: number,
    search?: string,
    genreSlug?: string,
    countrySlug?: string,
    languageSlug?: string,
    platformSlug?: string,
    year?: number,
    yearFrom?: number,
    yearTo?: number,
    orderBy?: 'rating' | 'title' | 'releaseDate',
    order?: 'ASC' | 'DESC',
  ): Promise<PaginatedResult<MovieSummary>> {
    const pageNumber = Math.max(1, page);
    const size = Math.max(1, pageSize);

    let searchIds: string[] | null = null;
    if (search && search.trim().length > 0) {
      searchIds = await this.findMovieIdsMatchingSearch(search);
      if (searchIds.length === 0) {
        return { data: [], total: 0, currentPage: pageNumber, totalPages: 0 };
      }
    }

    const where = this.buildWhereClause(searchIds, genreSlug, countrySlug, languageSlug, platformSlug, year, yearFrom, yearTo);
    const skip = (pageNumber - 1) * size;

    // Determinar ordenação - padrão rating DESC com ano como ordenação secundária
    let orderByPrisma: any = [
      { rating: 'desc' },
      { releaseDate: 'desc' }
    ];
    
    if (orderBy === 'title') {
      orderByPrisma = [
        { title: order?.toLowerCase() || 'asc' },
        { releaseDate: 'desc' }
      ];
    } else if (orderBy === 'releaseDate') {
      orderByPrisma = [
        { releaseDate: order?.toLowerCase() || 'desc' },
        { title: 'asc' }
      ];
    } else if (orderBy === 'rating') {
      const ratingOrder = order?.toLowerCase() || 'desc';
      orderByPrisma = [
        { rating: ratingOrder },
        { releaseDate: 'desc' }
      ];
    }

    const [movies, total] = await this.prisma.$transaction([
      this.prisma.scrapedMovie.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          rating: true,
          releaseDate: true,
          posterImage: true,
        },
        orderBy: orderByPrisma,
        take: size,
        skip,
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
    searchIds?: string[] | null,
    genreSlug?: string,
    countrySlug?: string,
    languageSlug?: string,
    platformSlug?: string,
    year?: number,
    yearFrom?: number,
    yearTo?: number
  ): Prisma.ScrapedMovieWhereInput {
    const whereClause: Prisma.ScrapedMovieWhereInput = {};

    // IDs pré-calculados pelo termo de busca (ver findMovieIdsMatchingSearch)
    if (searchIds) {
      whereClause.id = { in: searchIds };
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
    
    // Filtros por ano
    if (year) {
      whereClause.releaseDate = year.toString();
    } else if (yearFrom || yearTo) {
      const yearConditions: any[] = [];
      
      if (yearFrom) {
        yearConditions.push({
          releaseDate: {
            gte: yearFrom.toString(),
          },
        });
      }
      
      if (yearTo) {
        yearConditions.push({
          releaseDate: {
            lte: yearTo.toString(),
          },
        });
      }
      
      if (yearConditions.length > 0) {
        whereClause.AND = yearConditions;
      }
    }
    
    return whereClause;
  }

  private buildSqlWhereConditions(
    search?: string, 
    genreSlug?: string, 
    countrySlug?: string, 
    languageSlug?: string,
    platformSlug?: string,
    year?: number,
    yearFrom?: number,
    yearTo?: number
  ): Prisma.Sql {
    const conditions: string[] = [];
    
    // Busca fuzzy: quebrar em palavras
    if (search) {
      const searchWords = search
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[\s\-_]+/)
        .filter(word => word.length > 0);

      if (searchWords.length > 1) {
        // Múltiplas palavras: procurar por cada uma (AND)
        const wordConditions = searchWords.map(word => 
          `("title" ILIKE '%${word}%' OR "alternativeTitlePt" ILIKE '%${word}%' OR "originalTitle" ILIKE '%${word}%')`
        ).join(' AND ');
        conditions.push(`(${wordConditions})`);
      } else {
        // Uma palavra só
        conditions.push(`("title" ILIKE '%${search}%' OR "alternativeTitlePt" ILIKE '%${search}%' OR "originalTitle" ILIKE '%${search}%')`);
      }
    }
    
    if (genreSlug) {
      conditions.push(`EXISTS (
        SELECT 1 FROM "_GenreToScrapedMovie" gm 
        JOIN "Genre" g ON g.id = gm."B" 
        WHERE gm."A" = "ScrapedMovie".id AND g.slug = '${genreSlug}'
      )`);
    }
    
    if (countrySlug) {
      conditions.push(`EXISTS (
        SELECT 1 FROM "_CountryToScrapedMovie" cm 
        JOIN "Country" c ON c.id = cm."B" 
        WHERE cm."A" = "ScrapedMovie".id AND c.slug = '${countrySlug}'
      )`);
    }
    
    if (languageSlug) {
      conditions.push(`EXISTS (
        SELECT 1 FROM "_LanguageToScrapedMovie" lm 
        JOIN "Language" l ON l.id = lm."B" 
        WHERE lm."A" = "ScrapedMovie".id AND l.slug = '${languageSlug}'
      )`);
    }
    
    if (platformSlug) {
      conditions.push(`EXISTS (
        SELECT 1 FROM "_ScrapedMovieToStreamingPlatform" pm 
        JOIN "StreamingPlatform" p ON p.id = pm."B" 
        WHERE pm."A" = "ScrapedMovie".id AND p.slug = '${platformSlug}'
      )`);
    }
    
    if (year) {
      conditions.push(`"releaseDate" = '${year}'`);
    } else if (yearFrom || yearTo) {
      if (yearFrom) {
        conditions.push(`"releaseDate" >= '${yearFrom}'`);
      }
      if (yearTo) {
        conditions.push(`"releaseDate" <= '${yearTo}'`);
      }
    }
    
    if (conditions.length > 0) {
      return Prisma.sql`WHERE ${Prisma.raw(conditions.join(' AND '))}`;
    }
    
    return Prisma.sql``;
  }

  private buildOrderByClause(
    orderBy: 'rating' | 'title' | 'releaseDate',
    order: 'ASC' | 'DESC',
  ): Prisma.Sql {
    const direction = order === 'ASC' ? 'ASC' : 'DESC';
    
    switch (orderBy) {
      case 'rating':
        return Prisma.sql`
          ORDER BY 
            CASE 
              WHEN "rating" IS NULL OR "rating" = '' OR "rating" = '0' THEN 0
              ELSE CAST("rating" AS DECIMAL(3,1))
            END ${Prisma.raw(direction)},
            CASE 
              WHEN "releaseDate" ~ '^[0-9]{4}$' THEN CAST("releaseDate" AS INTEGER)
              ELSE 0
            END DESC
        `;
      
      case 'title':
        return Prisma.sql`
          ORDER BY "title" ${Prisma.raw(direction)}
        `;
      
      case 'releaseDate':
        return Prisma.sql`
          ORDER BY 
            CASE 
              WHEN "releaseDate" ~ '^[0-9]{4}$' THEN CAST("releaseDate" AS INTEGER)
              ELSE 0
            END ${Prisma.raw(direction)},
            "title" ASC
        `;
      
      default:
        // Fallback para rating DESC
        return Prisma.sql`
          ORDER BY 
            CASE 
              WHEN "rating" IS NULL OR "rating" = '' OR "rating" = '0' THEN 0
              ELSE CAST("rating" AS DECIMAL(3,1))
            END DESC,
            CASE 
              WHEN "releaseDate" ~ '^[0-9]{4}$' THEN CAST("releaseDate" AS INTEGER)
              ELSE 0
            END DESC
        `;
    }
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

  async findAvailableYears() {
    const result = await this.prisma.$queryRaw<{year: string, count: bigint}[]>`
      SELECT 
        "releaseDate" as year,
        COUNT(*) as count
      FROM "ScrapedMovie"
      WHERE "releaseDate" ~ '^[0-9]{4}$'
      GROUP BY "releaseDate"
      ORDER BY "releaseDate" DESC
    `;

    return result.map(item => ({
      year: parseInt(item.year),
      count: Number(item.count)
    }));
  }

  async findYearRange() {
    const result = await this.prisma.$queryRaw<{min_year: number, max_year: number}[]>`
      SELECT 
        MIN(CAST("releaseDate" AS INTEGER)) as min_year,
        MAX(CAST("releaseDate" AS INTEGER)) as max_year
      FROM "ScrapedMovie"
      WHERE "releaseDate" ~ '^[0-9]{4}$'
    `;

    return result[0] || { min_year: 1900, max_year: new Date().getFullYear() };
  }

  async findAllMovieLists(featured?: boolean) {
    const where = featured !== undefined ? { isFeatured: featured } : {};
    
    return this.prisma.movieList.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isFeatured: true,
        _count: {
          select: { movies: true },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findMovieListBySlug(
    slug: string,
    page: number,
    pageSize: number,
  ) {
    const list = await this.prisma.movieList.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isFeatured: true,
      },
    });

    if (!list) return null;

    const [moviesResult, total] = await this.prisma.$transaction([
      this.prisma.movieList.findUnique({
        where: { slug },
        select: {
          movies: {
            select: {
              slug: true,
              title: true,
              releaseDate: true,
              rating: true,
              posterImage: true,
              genres: {
                select: {
                  nomePt: true,
                  slug: true,
                },
              },
            },
            take: pageSize,
            skip: (page - 1) * pageSize,
          },
        },
      }),
      this.prisma.scrapedMovie.count({
        where: {
          lists: {
            some: { slug },
          },
        },
      }),
    ]);

    return {
      list,
      movies: moviesResult?.movies || [],
      total,
      currentPage: page,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}