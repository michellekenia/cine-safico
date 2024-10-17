import { Controller, Get, Post, Body, Patch, Param, Delete, Injectable } from '@nestjs/common';
import { MovieService } from '../movie.service';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';

@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Post()
  create(@Body() createMovieDto: CreateMovieDto) {
    return this.movieService.create(createMovieDto)
  }

  @Get()
  findAll() {
    return this.movieService.findAll()
  }

  @Get(':id')
  findById(@Param('id') id: number) {
    return this.movieService.findById(id)
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateMovieDto: UpdateMovieDto) {
    return this.movieService.update(id, updateMovieDto)
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.movieService.remove(id)
  }
}
