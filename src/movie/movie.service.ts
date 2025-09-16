import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/adapters/prisma.service';
import { MovieRepository } from './movie.repository';
import { MetadataItemDto, MetadataListResponseDto } from './dto/metadata.response.dto';

@Injectable()
export class MovieService {
  private readonly logger = new Logger(MovieService.name);
  
  constructor(
    private readonly movieRepository: MovieRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAllPaginated(
    page: number,
    pageSize: number,
    search?: string,
    genre?: string,
    country?: string,
    language?: string,
  ) {
    this.logger.log(`Buscando filmes paginados: página ${page}, tamanho ${pageSize}, filtros: ${JSON.stringify({
      search, genre, country, language
    })}`);
    
    return this.movieRepository.findAllPaginated(
      page, 
      pageSize, 
      search,
      genre,
      country,
      language
    );
  }

  async findBySlug(slug: string) {
    const movie = await this.movieRepository.findDetailsMovieBySlug(slug);

    if (!movie) {
      throw new NotFoundException(`Filme com slug "${slug}" não encontrado.`);
    }
    return movie;
  }
  
  async findTopRated() {
    const topRatedMovies = await this.movieRepository.findTopRatedByLandingPage(5);
    return topRatedMovies;
  }
  
  async findMoviesByGenre() {
    const numberOfMoviesPerGenre = 5;
    const [horrorMovies, actionMovies, comedyMovies] = await Promise.all([
      this.movieRepository.findManyByGenre('horror', numberOfMoviesPerGenre),
      this.movieRepository.findManyByGenre('action', numberOfMoviesPerGenre),
      this.movieRepository.findManyByGenre('comedy', numberOfMoviesPerGenre),
    ]);

    return {
      horror: horrorMovies,
      action: actionMovies,
      comedy: comedyMovies,
    };
  }

  // Métodos para acessar metadados

  async findAllGenres(): Promise<MetadataListResponseDto> {
    this.logger.log('Buscando todos os gêneros');
    const genres = await this.movieRepository.findAllGenres();
    
    const items = genres.map(genre => ({
      slug: genre.slug,
      nome: genre.nome,
      nomePt: genre.nomePt,
      count: genre._count.movies
    }));
    
    return {
      items,
      total: items.length
    };
  }
  
  async findAllCountries(): Promise<MetadataListResponseDto> {
    this.logger.log('Buscando todos os países');
    const countries = await this.movieRepository.findAllCountries();
    
    const items = countries.map(country => ({
      slug: country.slug,
      nome: country.nome,
      nomePt: country.nomePt,
      count: country._count.movies
    }));
    
    return {
      items,
      total: items.length
    };
  }
  
  async findAllLanguages(): Promise<MetadataListResponseDto> {
    this.logger.log('Buscando todos os idiomas');
    const languages = await this.movieRepository.findAllLanguages();
    
    const items = languages.map(language => ({
      slug: language.slug,
      nome: language.nome,
      nomePt: language.nomePt,
      count: language._count.movies
    }));
    
    return {
      items,
      total: items.length
    };
  }
  
  async findMoviesByGenreSlug(genreSlug: string, limit: number) {
    this.logger.log(`Buscando filmes por gênero: ${genreSlug}, limite: ${limit}`);
    return this.movieRepository.findManyByGenre(genreSlug, limit);
  }

  async findMoviesByCountrySlug(countrySlug: string, limit: number) {
    this.logger.log(`Buscando filmes por país: ${countrySlug}, limite: ${limit}`);
    return this.movieRepository.findManyByCountry(countrySlug, limit);
  }

  async findMoviesByLanguageSlug(languageSlug: string, limit: number) {
    this.logger.log(`Buscando filmes por idioma: ${languageSlug}, limite: ${limit}`);
    return this.movieRepository.findManyByLanguage(languageSlug, limit);
  }
}
