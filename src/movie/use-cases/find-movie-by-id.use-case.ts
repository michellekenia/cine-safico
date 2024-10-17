import { Injectable, NotFoundException } from '@nestjs/common';
import { Movie } from 'src/core/domain/movie.model';
import { MovieRepositoryPort } from 'src/core/ports/movie-repository-port';


@Injectable()
export class FindMovieByIdUseCase {
    constructor(private readonly movieRepository: MovieRepositoryPort) {}

    async execute(id: number): Promise<Movie> {
        const movie = await this.movieRepository.findById(id);

        if (!movie) {
            throw new NotFoundException(`Filme com ID ${id} não encontrado`);
        }

        return movie
    }
}
