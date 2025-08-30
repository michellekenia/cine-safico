import {  Module } from '@nestjs/common';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { PrismaModule } from 'src/adapters/prisma.module';
import { PrismaService } from 'src/adapters/prisma.service';
import { MovieRepository } from './movie.repository';


@Module({
  imports: [PrismaModule],
  controllers: [MovieController],
  providers: [
    MovieService,
    PrismaService,
    MovieRepository,
   ]
})
export class MovieModule {}
