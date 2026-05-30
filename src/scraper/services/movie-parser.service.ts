import { Injectable, Logger, Inject } from '@nestjs/common';
import { Page } from 'puppeteer-core';
import { IMovieParser, IBrowserProvider, BROWSER_PROVIDER } from '../interfaces/scraper.interface';
import { MovieLink, MoviePageData, MovieDetails } from '../interfaces/models.interface';

const SELECTORS = {
  list: {
    movieFrame: 'ul.poster-list li a.frame',
    nextPageButton: 'a.next',
  },
  moviePage: {
    title: 'meta[property="og:title"]',
    originalTitle: 'h2.originalname',
    director: 'meta[name="twitter:data1"]',
    synopsis: 'meta[name="description"]',
    posterImageSrc: '.poster .film-poster img',
    releaseYear: 'a[href*="/year/"]',
    serviceItem: 'section.watch-panel .services p.service',
    serviceLink: 'a.label',
    serviceName: 'a.label .title .name',
    serviceLocale: 'a.label .title .locale',
    duration: 'p.text-link.text-footer',
    rating: 'a.display-rating',
  },
};

const NAVIGATION_TIMEOUTS = {
  list: 45000,
  detail: 45000,
  detailFallback: 60000,
};

/**
 * MovieParserService
 * Responsável por extrair dados do HTML de filmes
 * Parse de links de listas e detalhes de páginas de filmes
 */
@Injectable()
export class MovieParserService implements IMovieParser {
  private readonly logger = new Logger(MovieParserService.name);

  constructor(
    @Inject(BROWSER_PROVIDER)
    private readonly browserService: IBrowserProvider,
  ) {}

  /**
   * Extrai links de filmes de uma página de lista (com paginação)
   * @param browser - Browser Puppeteer
   * @param listUrl - URL da lista de filmes
   * @returns Array de MovieLink contendo href e poster
   */
  async extractLinks(browser: any, listUrl: string): Promise<MovieLink[]> {
    const page = await this.browserService.createPage();

    try {
      this.logger.log(`Navegando para lista: ${listUrl}`);

      // Tentar com networkidle2 (mais rígido) primeiro, depois domcontentloaded (mais rápido)
      try {
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUTS.list });
        this.logger.log('✅ Página carregada com domcontentloaded');
      } catch (e) {
        this.logger.warn(`⏳ Timeout com domcontentloaded, tentando load...`);
        await page.goto(listUrl, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUTS.detailFallback });
        this.logger.log('✅ Página carregada com load');
      }

      // Esperar renderização de conteúdo dinâmico
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const movieLinks: MovieLink[] = [];
      let hasNextPage = true;
      let pageCount = 1;
      const testPageLimit = Number(process.env.SCRAPER_TEST_PAGE_LIMIT ?? '0');

      while (hasNextPage) {
        this.logger.log(`📄 Analisando página ${pageCount}...`);

        // Aguardar seletor ou prosseguir se não encontrar
        try {
          await page.waitForSelector(SELECTORS.list.movieFrame, { timeout: 15000 });
        } catch (e) {
          const elementCount = await page.evaluate(() => {
            return document.querySelectorAll('ul.poster-list li').length;
          });

          if (elementCount === 0) {
            hasNextPage = false;
            break;
          }
        }

        // Scroll para carregar lazy loading
        await this.autoScroll(page);

        // Extrair links desta página
        const linksOnPage = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('ul.poster-list li')).map((li) => {
            // Tentar primeiro a.frame, se não existir tenta só a
            let a = li.querySelector('a.frame') as HTMLAnchorElement;
            if (!a) {
              a = li.querySelector('a') as HTMLAnchorElement;
            }

            const href = a ? a.href : null;

            // Extrair poster
            const img = li.querySelector('img');
            let poster = null;
            if (img) {
              const srcset = img.getAttribute('srcset');
              if (srcset) {
                poster = srcset.split(',').pop()?.trim().split(' ')[0] || null;
              } else {
                poster = img.getAttribute('src');
              }
            }

            return { href, poster };
          });
        });

        if (linksOnPage.length === 0) {
          hasNextPage = false;
        } else {
          movieLinks.push(...linksOnPage);
        }

        // Tentar ir para próxima página
        const nextButton = await page.$(SELECTORS.list.nextPageButton);
        //Para testes usar após nextButton ->  && pageCount < 1
        if (nextButton) {
          try {
            await nextButton.click();
            await page.waitForSelector(SELECTORS.list.movieFrame, { timeout: 15000 });
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 + Math.random() * 3000),
            );
            pageCount++;
          } catch (navError) {
            const errorMessage = navError instanceof Error ? navError.message : String(navError);
            this.logger.warn(`⚠️ Erro na navegação: ${errorMessage}`);
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      }

      this.logger.log(`✅ Total de filmes coletados: ${movieLinks.length}`);
      return movieLinks;
    } finally {
      await page.close();
    }
  }

  /**
   * Extrai detalhes de um filme de sua página individual
   * @param browser - Browser Puppeteer
   * @param movieUrl - URL da página do filme
   * @returns MoviePageData contendo detalhes e serviços de streaming
   */
  async extractDetails(browser: any, movieUrl: string): Promise<MoviePageData> {
    const page = await this.browserService.createPage();

    try {
      this.logger.log(`Raspando detalhes de: ${movieUrl}`);

      // networkidle2 costuma travar em sites com requests persistentes; domcontentloaded é mais estável.
      try {
        await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUTS.detail });
        await page.waitForSelector('body', { timeout: 10000 });
      } catch (e) {
        this.logger.warn('⏳ Timeout com domcontentloaded, tentando load com timeout maior...');
        await page.goto(movieUrl, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUTS.detailFallback });
      }

      const pageData = await page.evaluate((s): MoviePageData => {
        const query = (selector: string, attribute = 'content') =>
          document.querySelector(selector)?.getAttribute(attribute) || null;

        const details: MovieDetails = {
          title: (() => {
            const rawTitle = query(s.moviePage.title);
            if (!rawTitle) return null;
            return rawTitle.replace(/\s*\(\d{4}\)$/, '').trim();
          })(),
          originalTitle: (() => {
            const el = document.querySelector(s.moviePage.originalTitle);
            const value = el?.textContent?.trim() || null;
            if (value) {
              console.log(`[DEBUG] originalTitle encontrado: ${value}`);
            } else {
              console.log(`[DEBUG] originalTitle NÃO encontrado (seletor: ${s.moviePage.originalTitle})`);
            }
            return value;
          })(),
          director: query(s.moviePage.director),
          synopsis: query(s.moviePage.synopsis),
          posterImage: (() => {
            const img = document.querySelector(s.moviePage.posterImageSrc);
            const srcset = img?.getAttribute('srcset');
            if (srcset) {
              return srcset.split(',').pop()?.trim().split(' ')[0] || null;
            }
            return img?.getAttribute('src') || null;
          })(),
          releaseYear: (() => {
            // Extrair o ano de lançamento
            const yearEl = document.querySelector(s.moviePage.releaseYear);
            if (!yearEl) return null;
            
            const yearText = yearEl.textContent?.trim() || '';
            console.log(`[DEBUG] releaseYear bruto: "${yearText}"`);
            
            // Se for um ano como "2024" ou "2024 •", extrair apenas os 4 dígitos
            const yearMatch = yearText.match(/(\d{4})/);
            const extracted = yearMatch ? yearMatch[1] : yearText || null;
            console.log(`[DEBUG] releaseYear extraído: "${extracted}"`);
            
            return extracted;
          })(),
          duration: (() => {
            const el = document.querySelector('p.text-link.text-footer');
            if (!el) return null;
            const raw = el.textContent.trim();
            const match = raw.match(/(\d+\s*mins?)/);
            return match ? match[1] : null;
          })(),
          rating: (() => {
            const el = document.querySelector(s.moviePage.rating);
            if (!el) return '0';
            const value = el.textContent.trim();
            return value ? value : '0';
          })(),
          genres: Array.from(
            document.querySelectorAll('#tab-genres .text-sluglist.capitalize:nth-of-type(1) a.text-slug'),
          ).map((el) => el.textContent?.trim() || ''),
          country: (() => {
            const detailsTab = document.querySelector('#tab-details');
            let countries: string[] = [];
            if (detailsTab) {
              const h3s = Array.from(detailsTab.querySelectorAll('h3'));
              for (const h3 of h3s) {
                const h3Text = h3.textContent?.trim().toLowerCase();
                if (h3Text === 'country' || h3Text === 'countries') {
                  const next = h3.nextElementSibling;
                  if (next && next.classList.contains('text-sluglist')) {
                    countries = countries.concat(
                      Array.from(next.querySelectorAll('a.text-slug')).map(
                        (el) => el.textContent?.trim() || '',
                      ),
                    );
                  }
                }
              }
            }
            return countries;
          })(),
          language: (() => {
            const detailsTab = document.querySelector('#tab-details');
            let languages: string[] = [];
            if (detailsTab) {
              const h3s = Array.from(detailsTab.querySelectorAll('h3'));
              for (const h3 of h3s) {
                const h3Text = h3.textContent?.trim().toLowerCase();
                if (h3Text === 'language' || h3Text === 'primary language') {
                  const next = h3.nextElementSibling;
                  if (next && next.classList.contains('text-sluglist')) {
                    languages = languages.concat(
                      Array.from(next.querySelectorAll('a.text-slug')).map(
                        (el) => el.textContent?.trim() || '',
                      ),
                    );
                  }
                }
              }
            }
            return languages;
          })(),
          alternativeTitles: (() => {
            let altTitles: string[] = [];
            
            // Procurar pelo h3 com "Alternative Titles"
            const headings = Array.from(document.querySelectorAll('h3'));
            for (const heading of headings) {
              const headingText = heading.textContent?.trim().toLowerCase() || '';
              if (headingText.includes('alternative title')) {
                console.log('[DEBUG] Seção "Alternative Titles" encontrada');
                
                // Procurar pelo div.text-indentedlist mais próximo
                let current = heading.nextElementSibling;
                let searchLimit = 5;
                
                while (current && searchLimit > 0) {
                  searchLimit--;
                  
                  // Se encontrar outro heading, parar
                  if (/^h[1-6]$/i.test(current?.tagName || '')) {
                    break;
                  }
                  
                  // Procurar por div.text-indentedlist
                  if (current?.classList.contains('text-indentedlist')) {
                    const p = current.querySelector('p');
                    if (p) {
                      const content = p.textContent?.trim() || '';
                      console.log('[DEBUG] Conteúdo encontrado em text-indentedlist:', content);
                      
                      if (content.length > 0) {
                        // Dividir por vírgula e limpar espaços
                        altTitles = content
                          .split(',')
                          .map((title) => title.trim())
                          .filter((title) => title.length > 0);
                        
                        console.log('[DEBUG] Títulos extraídos:', altTitles);
                        return altTitles;
                      }
                    }
                  }
                  
                  current = current?.nextElementSibling;
                }
              }
            }
            
            console.log('[DEBUG] Nenhum título alternativo encontrado');
            return altTitles;
          })(),
        };

        const streaming = [];
        document.querySelectorAll(s.moviePage.serviceItem).forEach((el) => {
          const linkEl = el.querySelector(s.moviePage.serviceLink);
          const nameEl = el.querySelector(s.moviePage.serviceName);
          const localeEl = el.querySelector(s.moviePage.serviceLocale);

          if (
            linkEl &&
            nameEl &&
            (localeEl as HTMLElement)?.innerText.trim() === 'BR'
          ) {
            const rawLink = linkEl.getAttribute('href');
            if (!rawLink) return;
            try {
              const finalLink = new URL(rawLink).searchParams.get('r');
              if (finalLink && !streaming.some((s) => s.link === finalLink)) {
                streaming.push({
                  service: (nameEl as HTMLElement).innerText.trim(),
                  link: finalLink,
                });
              }
            } catch {}
          }
        });

        return { details, streaming };
      }, SELECTORS);

      return pageData;
    } finally {
      await page.close();
    }
  }

  /**
   * Faz scroll automático da página para carregar lazy loading
   * @param page - Página Puppeteer
   */
  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 150;
        const maxScroll = 5000; // Máximo de scroll em pixels
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight >= maxScroll) {
            clearInterval(timer);
            resolve();
          }
        }, 50); // Aumenta velocidade do scroll
      });
    });
  }
}
