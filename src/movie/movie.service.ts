import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/adapters/prisma.service';
import { MovieRepository } from './movie.repository';

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
export class MovieService {
  constructor(
    private readonly movieRepository: MovieRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Busca filmes de forma paginada, com opção de busca por título.
   * As consultas de dados e contagem total são executadas em paralelo para otimizar a resposta.
   * @param page O número da página atual.
   * @param pageSize O número de itens por página.
   * @param search O termo para buscar no título dos filmes.
   * @returns Uma promessa que resolve para um objeto com os dados paginados.
   */
  async findAllPaginated(
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<PaginatedResult<MovieSummary>> {
    const pageNumber = Math.max(1, page);
    const size = Math.max(1, pageSize);

    const where = this.buildWhereClause(search);
    const skip = (pageNumber - 1) * size;

    const [movies, total] = await this.prisma.$transaction([
      this.prisma.scrapedMovie.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
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

  async findBySlug(slug: string) {
    const movie = await this.movieRepository.findDetailsMovieBySlug(slug);

    if (!movie) {
      throw new NotFoundException(`Filme com slug "${slug}" não encontrado.`);
    }
    return movie;
  }

    /**
   * Constrói a cláusula 'where' para a consulta Prisma com base no termo de busca.
   * @param search O termo de busca opcional.
   * @returns Um objeto de condição 'where' para o Prisma.
   */
  private buildWhereClause(search?: string): Prisma.ScrapedMovieWhereInput {
    if (!search) {
      return {};
    }
    return {
      title: {
        contains: search,
        mode: 'insensitive',
      },
    };
  }

}
