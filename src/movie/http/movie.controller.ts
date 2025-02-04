import { Controller, Get, Post, Body, Patch, Param, Delete, Injectable, ParseIntPipe } from '@nestjs/common';
import { MovieService } from '../movie.service';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { Movie } from 'src/core/domain/movie.model';

@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) { }

  @Post()
  async create(@Body() createMovieDto: CreateMovieDto): Promise<Movie> {
    return this.movieService.create(createMovieDto)
  }

  @Get()
  async findAll(): Promise<Movie[]> {
    return this.movieService.findAll()
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.findById(id)
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, @Body() updateMovieDto: UpdateMovieDto): Promise<Movie> {
    return this.movieService.update(id, updateMovieDto)
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.movieService.remove(id)
  }

}
