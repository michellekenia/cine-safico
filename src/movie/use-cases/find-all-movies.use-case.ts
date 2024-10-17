import { Injectable } from '@nestjs/common';
import { Movie } from 'src/core/domain/movie.model';
import { MovieRepositoryPort } from 'src/core/ports/movie-repository-port';

@Injectable()
export class FindAllMoviesUseCase {
    constructor(private readonly movieRepository: MovieRepositoryPort) {}

    async execute(): Promise<Movie[]> {
        return this.movieRepository.findAll()
    }
}
