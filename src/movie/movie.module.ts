import { Module } from '@nestjs/common';
import { MovieService } from './application/movie.service';
import { MovieController } from './infrastructure/controllers/movie.controller';

@Module({
  controllers: [MovieController],
  providers: [MovieService],
})
export class MovieModule {}
