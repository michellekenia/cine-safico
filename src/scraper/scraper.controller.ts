// src/scraper/scraper.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('movies')
  async getMovies() {
    const listLink = 'https://letterboxd.com/osasco12/list/saficos/';
    const movies = await this.scraperService.scrapeMovies(listLink);
    return movies;
  }
}
