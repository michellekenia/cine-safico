import { CreateMovieDto } from '../../movie/dto/create-movie.dto';
import { UpdateMovieDto } from '../../movie/dto/update-movie.dto';
import { Movie } from '../domain/movie.model';


export interface MovieRepositoryPort {
    create(movie: CreateMovieDto): Promise<Movie>;
    update(id: number, movie: UpdateMovieDto): Promise<Movie>;
    findById(id: number): Promise<Movie | null>;
    findAll(): Promise<Movie[]>;
    delete(id: number): Promise<void>;
}
