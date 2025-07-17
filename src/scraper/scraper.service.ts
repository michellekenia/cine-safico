import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { PrismaService } from 'src/adapters/prisma.service';

@Injectable()
export class ScraperService {
    constructor(private readonly prisma: PrismaService) {}
    async scrapeMovies(listLink: string): Promise<any[]> {
        console.log(`Iniciando a raspagem de filmes na lista: ${listLink}`)
        
        const existingMovies = await this.prisma.scrapedMovie.findMany({ select: { slug: true } });
        const existingSlugs = new Set(existingMovies.map((m) => m.slug));

        const movieLinks = await this.scrapeMovieLinks(listLink);
        const movies = [];

        for (const link of movieLinks) {
            console.log(`Raspando detalhes do filme: ${link}`);
            const slug = this.extractSlugFromUrl(link);
            if (slug && existingSlugs.has(slug)) {
                console.log(`Filme já existe no banco: ${slug}`);
                continue;
            }
            try {
                const movieDetails = await this.scrapeMovieDetails(link);
                const movieData = {
                    title: movieDetails.title,
                    releaseDate: movieDetails.releaseDate || null,
                    director: movieDetails.director || null,
                    synopsis: movieDetails.synopsis || null,
                    posterImage: movieDetails.posterImage || null,
                    slug: slug,
                };
                console.log('Dados a serem salvos:', movieData);
                try {
                    await this.prisma.scrapedMovie.create({ data: movieData });
                    console.log('Filme salvo:', movieData.slug);
                    movies.push(movieData);
                } catch (err) {
                    console.error('Erro ao salvar no banco:', err);
                    movies.push({ error: true, link, slug, message: err.message });
                }
            } catch (e) {
                console.warn(`Erro ao raspar ${link}: ${e.message}`);
                movies.push({ error: true, link, slug, message: e.message });
            }
        }

        console.log(`Total de filmes raspados: ${movies.length}`);
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

    extractSlugFromUrl(url: string): string | null {
    const match = url.match(/letterboxd\.com\/film\/([^\/]+)\//);
    return match ? match[1] : null;
  }
}
