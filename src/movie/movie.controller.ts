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

    // Normalizar termo de busca:
    // 1. Remover espaços extras no início/fim
    // 2. Collapsar espaços internos múltiplos
    // 3. Remover pontuação (pontos, vírgulas, etc)
    // 4. Remover acentos
    const normalizedSearch = query.search
      ? query.search
          .trim()
          .replace(/\s+/g, ' ')                          // Collapsar espaços
          .replace(/[.,!?;:'"()\-—–—]/g, '')            // Remover pontuação
          .normalize('NFD')                              // Separar acentos
          .replace(/[\u0300-\u036f]/g, '')              // Remover diacríticos
      : undefined;

    return this.movieService.findAllPaginated(
      page, 
      pageSize, 
      normalizedSearch,
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

  // Endpoints de listas temáticas
  @Get('lists-all')
  async findAllMovieLists(@Query('featured') featured?: string) {
    const isFeatured = featured === 'true' ? true : featured === 'false' ? false : undefined;
    return this.movieService.findAllMovieLists(isFeatured);
  }

  @Get('lists/:slug')
  async findMovieListBySlug(
    @Param('slug') slug: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '12',
  ) {
    return this.movieService.findMovieListBySlug(
      slug,
      parseInt(page),
      parseInt(pageSize),
    );
  }

  // Detalhes de um filme específico
  @Get(':slug') 
  async findBySlug(@Param() params: FindDetailsMovieDto) {
    return this.movieService.findBySlug(params.slug);
  }
}
