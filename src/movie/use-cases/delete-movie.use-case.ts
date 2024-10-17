import { Injectable, NotFoundException } from "@nestjs/common";
import { Movie } from "src/core/domain/movie.model"
import { MovieRepositoryPort } from "src/core/ports/movie-repository-port"

@Injectable()
export class DeleteMovieUseCase {
    constructor(private readonly movieRepository: MovieRepositoryPort) {}

    async execute(id: number): Promise<void>{
        const existingMovie = await this.movieRepository.findById(id)
        if (!existingMovie) {
            throw new NotFoundException(`Filme com ID ${id} não encontrado`);
        }

        await this.movieRepository.delete(id)
    }
}