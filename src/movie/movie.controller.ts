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

  // Buscas paginadas e filtráveis
  @Get()
  async findPaginated(@Query(new ValidationPipe({ transform: true })) query: FindAllMoviesDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

    return this.movieService.findAllPaginated(
      page, 
      pageSize, 
      query.search,
      query.genre,
      query.country,
      query.language
    );
  }

  // Destacados e categorizados
  @Get('highlights')
  async findTopRated() {
   return this.movieService.findTopRated();
  }

  @Get('genres')
  async findByGenres() {
    return this.movieService.findMoviesByGenre();
  }

  // Endpoints de metadados
  @Get('metadata/genres')
  async findAllGenres() {
    return this.movieService.findAllGenres();
  }

  @Get('metadata/countries')
  async findAllCountries() {
    return this.movieService.findAllCountries();
  }

  @Get('metadata/languages')
  async findAllLanguages() {
    return this.movieService.findAllLanguages();
  }

  // Filtros por categoria
  @Get('by-genre/:slug')
  async findByGenre(@Param('slug') slug: string) {
    return this.movieService.findMoviesByGenreSlug(slug, 10);
  }

  @Get('by-country/:slug')
  async findByCountry(@Param('slug') slug: string) {
    return this.movieService.findMoviesByCountrySlug(slug, 10);
  }

  @Get('by-language/:slug')
  async findByLanguage(@Param('slug') slug: string) {
    return this.movieService.findMoviesByLanguageSlug(slug, 10);
  }

  // Detalhes de um filme específico
  @Get(':slug') 
  async findBySlug(@Param() params: FindDetailsMovieDto) {
    return this.movieService.findBySlug(params.slug);
  }
}
