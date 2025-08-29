import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Injectable, 
  ParseIntPipe, 
  ValidationPipe, 
  Query 
} from '@nestjs/common';
import { MovieService } from '../movie.service';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { Movie } from 'src/core/domain/movie.model';
import { FindAllMoviesDto } from '../dto/findAll-movies.dto';

@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) { }

  @Post()
  async create(@Body() createMovieDto: CreateMovieDto): Promise<Movie> {
    return this.movieService.create(createMovieDto)
  }

  @Get()
  async findPaginated(@Query(new ValidationPipe({ transform: true })) query: FindAllMoviesDto) {
    
    // Converte os parâmetros da query (que vêm como string) para números.
    // Define valores padrão caso não sejam fornecidos.
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

    return this.movieService.findAllPaginated(page, pageSize, query.search);
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
