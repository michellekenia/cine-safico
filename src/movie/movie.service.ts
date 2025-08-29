import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/adapters/prisma.service';
import { Movie } from 'src/core/domain/movie.model';
import { MovieRepositoryPort } from 'src/core/ports/movie-repository-port';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

/**
 * Define a estrutura para um resumo do filme, usado na listagem.
 */
type MovieSummary = {
  id: number;
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
    @Inject('MovieRepositoryPort')
    private readonly movieRepository: MovieRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    return this.movieRepository.create(createMovieDto);
  }

  async findAll(): Promise<Movie[]> {
    return this.movieRepository.findAll()
  }

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
      data: movies.map(movie => ({
        ...movie,
        id: Number(movie.id),
      })),
      total,
      currentPage: pageNumber,
      totalPages: Math.ceil(total / size),
    };
  }

  async findById(id: number): Promise<Movie | null> {
    return this.movieRepository.findById(id)
  }

  async update(id: number, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    return this.movieRepository.update(id, updateMovieDto)
  }

  async remove(id: number): Promise<void> {
    return this.movieRepository.delete(id)
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
