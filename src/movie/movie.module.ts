import { Delete, Module } from '@nestjs/common';
import { MovieController } from './http/movie.controller';
import { MovieService } from './movie.service';
import { CreateMovieUseCase } from './use-cases/create-movie.use-case';
import { UpdateMovieUseCase } from './use-cases/update-movie.use-case';
import { FindAllMoviesUseCase } from './use-cases/find-all-movies.use-case';
import { FindMovieByIdUseCase } from './use-cases/find-movie-by-id.use-case';
import { DeleteMovieUseCase } from './use-cases/delete-movie.use-case';
import { PrismaModule } from 'src/adapters/prisma.module';
import { PrismaMovieRepository } from './banco/prisma-movie-repository';


@Module({
  imports: [PrismaModule],
  controllers: [MovieController],
  providers: [
    MovieService,
    {
      provide: 'MovieRepositoryPort', 
      useClass: PrismaMovieRepository,
    },
    CreateMovieUseCase, 
    UpdateMovieUseCase, 
    FindAllMoviesUseCase, 
    FindMovieByIdUseCase, 
    DeleteMovieUseCase]
})
export class MovieModule {}
