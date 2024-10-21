// src/scraper/scraper.service.ts
import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ScraperService {
    async scrapeMovies(listLink: string): Promise<any[]> {
        const movieLinks = await this.scrapeMovieLinks(listLink);
        const movies = [];

        for (const link of movieLinks) {
            const movieDetails = await this.scrapeMovieDetails(link);
            movies.push(movieDetails);
        }

        return movies;
    }

    private async scrapeMovieLinks(listLink: string): Promise<string[]> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Acesse a página da lista
        await page.goto(listLink, { waitUntil: 'domcontentloaded' });

        // Aguardar até que os links dos filmes estejam presentes
        await page.waitForSelector('a.frame');

        // Coletar links dos filmes
        const movieLinks = await page.evaluate(() => {
            const links: string[] = [];
            const filmElements = document.querySelectorAll('a.frame');

            filmElements.forEach((element) => {
                const href = element.getAttribute('href');
                if (href) {
                    links.push(`https://letterboxd.com${href}`); // Construindo a URL completa
                }
            });

            return links;
        });

        await browser.close();
        return movieLinks;
    }

    private async scrapeMovieDetails(movieLink: string): Promise<any> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Acesse a página do filme
        await page.goto(movieLink, { waitUntil: 'domcontentloaded' });

        // Raspar informações do filme
        const movieDetails = await page.evaluate(() => {
            const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
            const releaseDate = document.querySelector('span#film-release-date')?.textContent || '';
            const director = document.querySelector('meta[name="twitter:data1"]')?.getAttribute('content') || '';
            const synopsis = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const posterImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

            return { title, releaseDate, director, synopsis, posterImage };
        });

        await browser.close();
        return movieDetails;
    }
}
