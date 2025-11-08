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

  /**
   * Busca filmes com paginação, filtros e ordenação configurável.
   * 
   * Parâmetros de ordering:
   * - orderBy: 'rating' (padrão), 'title', 'releaseDate'
   * - order: 'DESC' (padrão), 'ASC'
   * 
   * Exemplos:
   * GET /movies?orderBy=rating&order=DESC (melhores filmes primeiro)
   * GET /movies?orderBy=title&order=ASC (ordem alfabética)
   * GET /movies?orderBy=releaseDate&order=DESC (mais recentes primeiro)
   */
  @Get()
  async findPaginated(@Query(new ValidationPipe({ transform: true })) query: FindAllMoviesDto) {
    const page = query.page ? parseInt(query.page) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize) : 24;

    // Manter compatibilidade: padrão rating DESC se não especificado
    const orderBy = query.orderBy || 'rating';
    const order = query.order || 'DESC';

    return this.movieService.findAllPaginated(
      page, 
      pageSize, 
      query.search,
      query.genre,
      query.country,
      query.language,
      query.platform,
      query.year,
      query.yearFrom,
      query.yearTo,
      orderBy,
      order
    );
  }

  // Destacados e categorizados
  @Get('highlights')
  async findTopRated() {
   return this.movieService.findTopRated();
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

  @Get('metadata/platforms')
  async findAllPlatforms() {
    return this.movieService.findAllPlatforms();
  }

  @Get('metadata/years')
  async findAvailableYears() {
    return this.movieService.findAvailableYears();
  }

  // Filtros por categoria
  @Get('by-genre')
  async findByGenre() {
    return this.movieService.findMoviesByGenre(5);
  }

  @Get('by-country/:slug')
  async findByCountry(@Param('slug') slug: string) {
    return this.movieService.findMoviesByCountrySlug(slug, 5);
  }

  @Get('by-language/:slug')
  async findByLanguage(@Param('slug') slug: string) {
    return this.movieService.findMoviesByLanguageSlug(slug, 5);
  }

  // Detalhes de um filme específico
  @Get(':slug') 
  async findBySlug(@Param() params: FindDetailsMovieDto) {
    return this.movieService.findBySlug(params.slug);
  }
}
