import {  Module } from '@nestjs/common';
import { MovieController } from './http/movie.controller';
import { MovieService } from './movie.service';
import { PrismaModule } from 'src/adapters/prisma.module';
import { PrismaMovieRepository } from './banco/prisma-movie-repository';
import { PrismaService } from 'src/adapters/prisma.service';


@Module({
  imports: [PrismaModule],
  controllers: [MovieController],
  providers: [
    MovieService,
    PrismaService,
    {
      provide: 'MovieRepositoryPort', 
      useClass: PrismaMovieRepository,
    },
   ]
})
export class MovieModule {}
