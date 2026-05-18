import { TranslationService } from "src/translate/translation.service";
import { ScraperService } from "src/scraper/scraper.service";
import { MovieUpdaterService } from "src/scraper/services/movie-updater.service";
import { ConfigService } from "@nestjs/config";
import { Logger, Post, ForbiddenException, Controller, Query } from "@nestjs/common";

@Controller('scraper')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly translationService: TranslationService,
    private readonly scraperService: ScraperService,
    private readonly movieUpdater: MovieUpdaterService,
    private readonly configService: ConfigService,
  ) {}

  @Post('/trigger-scraper')
  async triggerScraper(@Query('url') url: string = 'https://letterboxd.com/osasco12/list/saficos/') {
    const isJobEnabled = this.configService.get('SCRAPER_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      throw new ForbiddenException('Scraping job is currently disabled.');
    }

    const targetUrl = url?.trim() || 'https://letterboxd.com/osasco12/list/saficos/';

    // Dispara o job em segundo plano e retorna uma resposta imediata
    setTimeout(async () => {
      try {
        await this.scraperService.scrapeMovies(targetUrl);
        this.logger.log('Job de Scraping concluído com sucesso.');
      } catch (error) {
        this.logger.error(`Erro durante o scraping: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 0);

    this.logger.log('Job de Scraping disparado com sucesso.');
    return {
      message: 'Scraping job triggered successfully in the background.',
      url: targetUrl,
    };
  }

  @Post('trigger-translator-metadata')
  async triggerTranslatorMetadata() {
    const isJobEnabled = this.configService.get('TRANSLATION_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      throw new ForbiddenException('Translation job is currently disabled.');
    }

    // Iniciar a tradução em segundo plano
    setTimeout(async () => {
      try {
        await this.translationService.translateMetadata();
        this.logger.log('Job de Tradução de metadados concluído com sucesso.');
      } catch (error) {
        this.logger.error(`Erro durante a tradução de metadados: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 0);

    this.logger.log('Job de Tradução de metadados disparado em segundo plano.');
    return { message: 'Metadata translation job triggered successfully in the background.' };
  }

  @Post('trigger-translator-synopses')
  async triggerTranslatorSynopses() {
    const isJobEnabled = this.configService.get('TRANSLATION_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      throw new ForbiddenException('Translation job is currently disabled.');
    }

    // Iniciar a tradução em segundo plano
    setTimeout(async () => {
      try {
        const count = await this.translationService.translateSynopses();
        this.logger.log(`Job de Tradução de sinopses concluído com sucesso. ${count} sinopses traduzidas.`);
      } catch (error) {
        this.logger.error(`Erro durante a tradução de sinopses: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 0);

    this.logger.log('Job de Tradução de sinopses disparado em segundo plano.');
    return { message: 'Synopses translation job triggered successfully in the background.' };
  }

  @Post('/trigger-scraper-update')
  async updateNullFields(@Query('url') url: string = 'https://letterboxd.com/osasco12/list/saficos/') {
    const isJobEnabled = this.configService.get('SCRAPER_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      throw new ForbiddenException('Scraping job is currently disabled.');
    }

    setTimeout(async () => {
      try {
        await this.movieUpdater.updateNullFields(url);
        this.logger.log('Job de atualização de campos nulos concluído com sucesso.');
      } catch (error) {
        this.logger.error(`Falha na atualização de campos nulos: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 0);

    this.logger.log('Job de atualização de campos nulos disparado em segundo plano.');
    return {
      message: 'Update null fields job triggered successfully in the background.',
      url,
    };
  }
}