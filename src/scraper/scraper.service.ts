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

    async scrapeMovieLinks(listLink: string): Promise<string[]> {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        const movieLinks: string[] = []
    
        console.log(`Navegando para a lista de filmes: ${listLink}`)
        await page.goto(listLink, { waitUntil: 'domcontentloaded' })
    
        while (true) {
            await page.waitForSelector('a.frame')
    
            const linksOnPage = await page.evaluate(() => {
                const links: string[] = [];
                const filmElements = document.querySelectorAll('a.frame')
    
                filmElements.forEach((element) => {
                    const href = element.getAttribute('href')
                    if (href) {
                        links.push(`https://letterboxd.com${href}`)
                    }
                });
    
                return links;
            });
    
            console.log(`Links coletados nesta página: ${linksOnPage.length}`)
            movieLinks.push(...linksOnPage)
    
            const nextButton = await page.$('a.next')
            if (nextButton) {
                console.log('Clicando no botão "Próxima Página"...')
                await Promise.all([
                    nextButton.click(),
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                ]);
            } else {
                console.log('Não há mais páginas para navegar.')
                break;
            }
        }
    
        await browser.close();
        console.log(`Total de links coletados: ${movieLinks.length}`)
        return movieLinks;
    }
    
    
    async scrapeMovieDetails(movieLink: string): Promise<any> {
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
