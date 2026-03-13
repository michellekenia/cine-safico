import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/adapters/prisma.module';
import { ScraperService } from './scraper.service';
import { BrowserService } from './services/browser.service';
import { MovieParserService } from './services/movie-parser.service';
import { MovieStorageService } from './services/movie-storage.service';
import { SlugService } from './services/slug.service';
import { BROWSER_PROVIDER, MOVIE_PARSER, MOVIE_STORAGE } from './interfaces/scraper.interface';

/**
 * ScraperModule
 * 
 * Módulo de raspagem de filmes do Letterboxd
 * Exporta:
 * - ScraperService (orquestrador principal)
 * - BrowserService (gerencia Puppeteer)
 * - MovieParserService (extrai dados do HTML)
 * - MovieStorageService (salva no banco)
 * - SlugService (gera slugs normalizados)
 */
@Module({
  imports: [PrismaModule],
  providers: [
    SlugService,
    BrowserService,
    MovieParserService,
    MovieStorageService,
    ScraperService,
    // Registrar interfaces com tokens para injeção de dependência
    {
      provide: BROWSER_PROVIDER,
      useClass: BrowserService,
    },
    {
      provide: MOVIE_PARSER,
      useClass: MovieParserService,
    },
    {
      provide: MOVIE_STORAGE,
      useClass: MovieStorageService,
    },
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
