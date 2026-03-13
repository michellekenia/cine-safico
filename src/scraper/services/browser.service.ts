import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import { Browser, Page } from 'puppeteer-core';
import { IBrowserProvider } from '../interfaces/scraper.interface';

/**
 * BrowserService
 * Responsável por gerenciar a instância do Puppeteer
 * Handles launch, close e criação de páginas
 */
@Injectable()
export class BrowserService implements IBrowserProvider, OnModuleDestroy {
  private readonly logger = new Logger(BrowserService.name);
  private browser: Browser | null = null;

  /**
   * Inicia uma instância do navegador Puppeteer
   * @returns Browser iniciado
   */
  async launch(): Promise<Browser> {
    if (this.browser) {
      this.logger.warn('Navegador já foi iniciado');
      return this.browser;
    }

    const launchOptions: puppeteer.LaunchOptions = {
      headless: true,
      timeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--memory-pressure-off',
        '--no-zygote',
        '--disable-blink-features=AutomationControlled',
      ],
    };

    // Configurar executable path dependendo do ambiente
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.env.NODE_ENV === 'production') {
      launchOptions.executablePath = '/usr/bin/google-chrome-stable';
    } else {
      launchOptions.channel = 'chrome';
    }

    try {
      this.browser = await puppeteer.launch(launchOptions);
      this.logger.log('✅ Navegador iniciado com sucesso');
      return this.browser;
    } catch (error) {
      this.logger.error(`❌ Erro ao iniciar navegador: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fecha a instância do navegador
   */
  async close(): Promise<void> {
    if (!this.browser) {
      this.logger.warn('Navegador não está iniciado');
      return;
    }

    try {
      await this.browser.close();
      this.browser = null;
      this.logger.log('✅ Navegador fechado com sucesso');
    } catch (error) {
      this.logger.error(`❌ Erro ao fechar navegador: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria uma nova página no navegador
   * @returns Page criada com User-Agent realista
   */
  async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Navegador não foi iniciado. Chame launch() primeiro.');
    }

    const page = await this.browser.newPage();

    // Definir User-Agent realista para não ser detectado como bot
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    // Aumentar timeout de navegação para 3 minutos
    page.setDefaultNavigationTimeout(180000);

    return page;
  }

  /**
   * Hook do NestJS para fechar recursos quando o módulo é destruído
   */
  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
