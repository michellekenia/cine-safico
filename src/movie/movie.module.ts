import { Delete, Module } from '@nestjs/common';
import { MovieController } from './http/movie.controller';
import { MovieService } from './movie.service';
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
   ]
})
export class MovieModule {}
