import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ScraperService {
    async scrapeMovies(listLink: string): Promise<any[]> {
        console.log(`Iniciando a raspagem de filmes na lista: ${listLink}`)
        const movieLinks = await this.scrapeMovieLinks(listLink)
        const movies = [];

        for (const link of movieLinks) {
            console.log(`Raspando detalhes do filme: ${link}`)
            const movieDetails = await this.scrapeMovieDetails(link)
            movies.push(movieDetails)
        }

        console.log(`Total de filmes raspados: ${movies.length}`)
        return movies;
    }

    private async scrapeMovieLinks(listLink: string): Promise<string[]> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
    
        console.log(`Navegando para a lista de filmes: ${listLink}`)
        await page.goto(listLink, { waitUntil: 'domcontentloaded' })
    
        await page.waitForSelector('a.frame');
        
        const allMovieLinks: string[] = [];
        let hasNextPage = true;
        let currentPage = 1;
    
        while (hasNextPage) {
            console.log(`Coletando links da página: ${currentPage}`)

            const linksOnPage = await page.evaluate(() => {
                const links: string[] = []
                const filmElements = document.querySelectorAll('a.frame')
    
                filmElements.forEach((element) => {
                    const href = element.getAttribute('href')
                    if (href) {
                        links.push(`https://letterboxd.com${href}`)
                    }
                });
    
                return links
            });
    
            allMovieLinks.push(...linksOnPage);
            console.log(`Links coletados nesta página: ${linksOnPage.length}`)
    
            hasNextPage = await page.$('.paginate-nextprev a.next') !== null
    
        
            if (hasNextPage) {
                const nextButton = await page.$('.paginate-nextprev a.next')
                if (nextButton) {
                    await nextButton.click();
                    await page.waitForSelector('a.frame')
                }
            }
    
            currentPage++;
        }
    
        console.log(`Total de links coletados: ${allMovieLinks.length}`)
        await browser.close()
        return allMovieLinks
    }
    
    private async scrapeMovieDetails(movieLink: string): Promise<any> {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        
        console.log(`Navegando para a página do filme: ${movieLink}`)
        await page.goto(movieLink, { waitUntil: 'domcontentloaded' })

        const movieDetails = await page.evaluate(() => {
            const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
            const releaseDate = document.querySelector('span#film-release-date')?.textContent || '';
            const director = document.querySelector('meta[name="twitter:data1"]')?.getAttribute('content') || ''
            const synopsis = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
            const posterImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

            return { title, releaseDate, director, synopsis, posterImage }
        });

        console.log(`Detalhes do filme coletados: ${movieDetails.title}`)
        await browser.close()
        return movieDetails
    }
}
