import { 
  Controller, 
  Get,  
  Param,  
  ValidationPipe, 
  Query 
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { FindDetailsMovieDto } from './dto/findDetails.movies.dto';
import { FindAllMoviesDto } from './dto/findAll.movies.dto';

@Controller('movies')
export class MovieController {
  constructor(
    private readonly movieService: MovieService, 
  ) { }

  @Get()
  async findPaginated(@Query(new ValidationPipe({ transform: true })) query: FindAllMoviesDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

    return this.movieService.findAllPaginated(page, pageSize, query.search);
  }

  @Get('highlights')
  async findTopRated() {
   return this.movieService.findTopRated();
  }

  @Get('genres')
  async findByGenres() {
    return this.movieService.findMoviesByGenre();
  }

  @Get(':slug') 
  async findBySlug(@Param() params: FindDetailsMovieDto) {
    return this.movieService.findBySlug(params.slug);
  }

}
