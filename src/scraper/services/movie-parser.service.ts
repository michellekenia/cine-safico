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

      // Tentar com networkidle2 primeiro, se falhar tenta com domcontentloaded
      try {
        await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 180000 });
        this.logger.log('✅ Página carregada com networkidle2');
      } catch (e) {
        this.logger.warn(`⏳ Tentando recarregar com domcontentloaded: ${e.message}`);
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
        this.logger.log('✅ Página carregada com domcontentloaded');
      }

      // Esperar renderização de conteúdo dinâmico
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const movieLinks: MovieLink[] = [];
      let hasNextPage = true;
      let pageCount = 1;

      while (hasNextPage) {
        this.logger.log(`📄 Analisando página ${pageCount}...`);

        // Aguardar seletor ou prosseguir se não encontrar
        try {
          await page.waitForSelector(SELECTORS.list.movieFrame, { timeout: 60000 });
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
        if (nextButton) {
          try {
            await Promise.all([
              nextButton.click(),
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 180000 }),
            ]);
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 + Math.random() * 3000),
            );
            pageCount++;
          } catch (navError) {
            this.logger.warn(`⚠️ Erro na navegação: ${navError.message}`);
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

      // Tentar com networkidle2 primeiro
      try {
        await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 180000 });
      } catch (e) {
        this.logger.warn(`⏳ Timeout com networkidle2, tentando domcontentloaded: ${e.message}`);
        await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
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
          releaseYear: document.querySelector(s.moviePage.releaseYear)?.textContent || null,
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
            const detailsTab = document.querySelector('#tab-details');
            let altTitles: string[] = [];
            
            if (detailsTab) {
              const h3s = Array.from(detailsTab.querySelectorAll('h3'));
              for (const h3 of h3s) {
                const h3Text = h3.textContent?.trim().toLowerCase();
                if (h3Text === 'alternative titles') {
                  // Log para debug: encontrou a seção
                  console.log('[DEBUG] Seção "Alternative Titles" encontrada');
                  
                  let next = h3.nextElementSibling;
                  let elementIndex = 0;
                  
                  // Procurar por diferentes estruturas HTML
                  while (next) {
                    elementIndex++;
                    const tagName = next.tagName;
                    const textContent = next.textContent?.trim() || '';
                    
                    console.log(`[DEBUG] Elemento ${elementIndex}: <${tagName}> = "${textContent.substring(0, 100)}"`);
                    
                    if (tagName === 'H3') {
                      console.log('[DEBUG] Encontrado outro H3, parando busca');
                      break; // Parou em outra seção
                    }
                    
                    // Procurar por texto com títulos
                    if (textContent && !textContent.startsWith('•')) {
                      console.log('[DEBUG] Texto extraído:', textContent);
                      
                      // Tentar diferentes separadores: "/" ou "," ou quebra de linha
                      let rawTitles: string[] = [];
                      
                      // Dividir por "/" primeiro (formato comum)
                      if (textContent.includes('/')) {
                        rawTitles = textContent
                          .split(/\s*\/\s*/)
                          .map((t) => t.trim())
                          .filter((t) => t.length > 0 && t !== '');
                      }
                      // Se não houver "/", tentar ","
                      else if (textContent.includes(',')) {
                        rawTitles = textContent
                          .split(/\s*,\s*/)
                          .map((t) => t.trim())
                          .filter((t) => t.length > 0 && t !== '');
                      }
                      // Se não houver separadores, considerar como um único título
                      else if (textContent.length > 0) {
                        rawTitles = [textContent];
                      }
                      
                      console.log('[DEBUG] Títulos extraídos:', rawTitles);
                      altTitles = altTitles.concat(rawTitles);
                      break;
                    }
                    
                    next = next.nextElementSibling;
                  }
                  
                  if (elementIndex === 0) {
                    console.log('[DEBUG] Nenhum elemento encontrado após "Alternative Titles"');
                  }
                }
              }
            } else {
              console.log('[DEBUG] Tab de detalhes (#tab-details) não encontrada');
            }
            
            // Remover duplicatas mantendo ordem
            const uniqueTitles = Array.from(new Set(altTitles));
            console.log('[DEBUG] Títulos únicos finais:', uniqueTitles);
            return uniqueTitles;
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
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }
}
