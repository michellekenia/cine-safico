import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/adapters/prisma.service';
import { MovieRepository } from './movie.repository';

@Injectable()
export class MovieService {
  constructor(
    private readonly movieRepository: MovieRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAllPaginated(
    page: number,
    pageSize: number,
    search?: string,
  ) {
    return this.movieRepository.findAllPaginated(page, pageSize, search);
  }


  async findBySlug(slug: string) {
    const movie = await this.movieRepository.findDetailsMovieBySlug(slug);

    if (!movie) {
      throw new NotFoundException(`Filme com slug "${slug}" não encontrado.`);
    }
    return movie;
  }
  
  async findTopRated() {
  const topRatedMovies = await this.movieRepository.findTopRatedByLandingPage(5);

    return topRatedMovies;
  }
  
  async findMoviesByGenre() {
  const numberOfMoviesPerGenre = 5;
    const [horrorMovies, actionMovies, comedyMovies] = await Promise.all([
      this.movieRepository.findManyByGenre('Horror', numberOfMoviesPerGenre),
      this.movieRepository.findManyByGenre('Action', numberOfMoviesPerGenre),
      this.movieRepository.findManyByGenre('Comedy', numberOfMoviesPerGenre),
    ]);

    return {
      horror: horrorMovies,
      action: actionMovies,
      comedy: comedyMovies,
    };

  }
}
