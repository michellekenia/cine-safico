// src/scraper/scraper.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) {}

    @Get('movies') // Endpoint para iniciar o scraping
    async getMovies() {
        const listLink = 'https://letterboxd.com/osasco12/list/saficos/'; // Link da lista de filmes
        const movies = await this.scraperService.scrapeMovies(listLink);
        return movies;
    }
}
