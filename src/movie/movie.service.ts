import { Injectable } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { CreateMovieUseCase } from './use-cases/create-movie.use-case';
import { DeleteMovieUseCase } from './use-cases/delete-movie.use-case';
import { FindAllMoviesUseCase } from './use-cases/find-all-movies.use-case';
import { FindMovieByIdUseCase } from './use-cases/find-movie-by-id.use-case';
import { UpdateMovieUseCase } from './use-cases/update-movie.use-case';


@Injectable()
export class MovieService {

  constructor(
    private readonly createMovieUseCase: CreateMovieUseCase,
    private readonly updateMovieUseCase: UpdateMovieUseCase,
    private readonly findMovieByIdUseCase: FindMovieByIdUseCase,
    private readonly findAllMoviesUseCase: FindAllMoviesUseCase,
    private readonly deleteMovieUseCase: DeleteMovieUseCase,
) {}

  create(createMovieDto: CreateMovieDto) {
    return this.createMovieUseCase.execute(createMovieDto)
  }

  findAll() {
    return this.findAllMoviesUseCase.execute()
  }

  findById(id: number) {
    return this.findMovieByIdUseCase.execute(id)
  }

  update(id: number, updateMovieDto: UpdateMovieDto) {
    return this.updateMovieUseCase.execute(id, updateMovieDto)
  }

  remove(id: number) {
    return this.deleteMovieUseCase.execute(id)
  }
}
