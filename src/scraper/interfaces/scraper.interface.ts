import { Browser, Page } from 'puppeteer-core';
import {
  MovieLink,
  MoviePageData,
  MovieData,
  ScrapedMovieRecord,
} from './models.interface';

/**
 * Tokens de injeção de dependência para as interfaces
 * Usados pelo NestJS para resolver tipos abstratados
 */
export const BROWSER_PROVIDER = Symbol('IBrowserProvider');
export const MOVIE_PARSER = Symbol('IMovieParser');
export const MOVIE_STORAGE = Symbol('IMovieStorage');

/**
 * Interface principal do Scraper
 * Orquestra o fluxo completo de scraping
 */
export interface IScraper {
  scrapeMovies(listLink: string): Promise<ScrapedMovieRecord[]>;
}

/**
 * Interface para gerenciar o navegador (Puppeteer)
 * Responsável por launch, close e criar páginas
 */
export interface IBrowserProvider {
  launch(): Promise<Browser>;
  close(): Promise<void>;
  createPage(): Promise<Page>;
}

/**
 * Interface para extrair dados do HTML
 * Responsável por parsing de links e detalhes de filmes
 */
export interface IMovieParser {
  extractLinks(browser: Browser, listUrl: string): Promise<MovieLink[]>;
  extractDetails(browser: Browser, movieUrl: string): Promise<MoviePageData>;
}

/**
 * Interface para salvar dados no banco de dados
 * Responsável por persistência de filmes e relacionados
 */
export interface IMovieStorage {
  findExistingSlugs(slugs: string[]): Promise<string[]>;
  saveMovie(movie: MovieData): Promise<ScrapedMovieRecord>;
  saveMovies(movies: MovieData[]): Promise<ScrapedMovieRecord[]>;
  optimizePosterUrl(posterUrl: string | null): string | null;
}

/**
 * Interface para geração de slugs
 * Responsável por normalizar nomes em slugs
 */
export interface ISlugGenerator {
  generate(text: string): string;
}
