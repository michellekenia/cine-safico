import { MovieRepositoryPort } from "src/core/ports/movie-repository-port";
import { CreateMovieDto } from "../dto/create-movie.dto";
import { Movie } from "src/core/domain/movie.model";

export class CreateMovieUseCase {
    constructor(private readonly movieRepository: MovieRepositoryPort) {}

    async execute(createMovieDto: CreateMovieDto): Promise<Movie>{
        const movie = Movie.create(createMovieDto)
        Object.assign(movie, createMovieDto)
        return this.movieRepository.create(movie)
    }
}