import { Inject, Injectable } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieRepositoryPort } from 'src/core/ports/movie-repository-port';
import { Movie } from 'src/core/domain/movie.model';



@Injectable()
export class MovieService {

  constructor(
    @Inject('MovieRepositoryPort')
    private readonly movieRepository: MovieRepositoryPort
  ) { }

  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    return this.movieRepository.create(createMovieDto)
  }

  async findAll(): Promise<Movie[]> {
    return this.movieRepository.findAll();
  }

  async findById(id: number): Promise<Movie | null> {
    return this.movieRepository.findById(id);
  }

  async update(id: number, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    return this.movieRepository.update(id, updateMovieDto);
  }

  async remove(id: number): Promise<void> {
    return this.movieRepository.delete(id);
  }

}
