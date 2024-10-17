import { Injectable, NotFoundException } from '@nestjs/common';
import { MovieRepositoryPort } from 'src/core/ports/movie-repository-port';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { Movie } from 'src/core/domain/movie.model';


@Injectable()
export class UpdateMovieUseCase {
    constructor(private readonly movieRepository: MovieRepositoryPort) {}

    async execute(id: number, updateMovieDto: UpdateMovieDto): Promise<Movie> {
        const existingMovie = await this.movieRepository.findById(id);
        
        if (!existingMovie) {
            throw new NotFoundException(`Filme com ID ${id} não encontrado`);
        }

        const updatedMovie = Movie.create({ ...existingMovie, ...updateMovieDto });
        
        return this.movieRepository.update(id, updatedMovie);
    }
}
