import { ScraperService } from "src/scraper/scraper.service";
import { TranslationService } from "src/translate/translation.service";
import { ConfigService } from "@nestjs/config";
import { Logger, Post, ForbiddenException, Controller} from "@nestjs/common";

@Controller('scraper')
export class JobsController {
    private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly translationService: TranslationService,
    private readonly scraperService: ScraperService,
    private readonly configService: ConfigService,
  ) {}

  @Post("/trigger-scraper")
  async triggerScraper() {
    this.logger.log("Recebendo requisição do scraping");
    
    // Verifica se o job está habilitado no .env
    const isJobEnabled = this.configService.get('SCRAPER_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      this.logger.warn('Job de Scraping está desabilitado. Nenhuma ação tomada.');
      throw new ForbiddenException('Scraping job is currently disabled.');
    }
    
    // Dispara o job em segundo plano e retorna uma resposta imediata
    setTimeout(async () => {
      try {
        await this.scraperService.scrapeMovies('https://letterboxd.com/osasco12/list/saficos/');
        this.logger.log('Job de Scraping concluído com sucesso.');
      } catch (error) {
        this.logger.error(`Erro durante o scraping: ${error.message}`);
      }
    }, 0);
    
    this.logger.log('Job de Scraping disparado com sucesso.');
    
    return { message: 'Scraping job triggered successfully in the background.' };
  } 
  
  @Post('trigger-translator-metadata')
  async triggerTranslatorMetadata() {
    this.logger.log('Recebida requisição para iniciar o job de tradução de metadados...');
    
    const isJobEnabled = this.configService.get('TRANSLATION_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      this.logger.warn('Job de Tradução está desabilitado. Nenhuma ação tomada.');
      throw new ForbiddenException('Translation job is currently disabled.');
    }
    
    // Iniciar a tradução em segundo plano
    setTimeout(async () => {
      try {
        await this.translationService.translateMetadata();
        this.logger.log('Job de Tradução de metadados concluído com sucesso.');
      } catch (error) {
        this.logger.error(`Erro durante a tradução de metadados: ${error.message}`);
      }
    }, 0);
    
    this.logger.log('Job de Tradução de metadados disparado em segundo plano.');
    return { message: 'Metadata translation job triggered successfully in the background.' };
  }

  @Post('trigger-translator-synopses')
  async triggerTranslatorSynopses() {
    this.logger.log('Recebida requisição para iniciar o job de tradução de sinopses...');
    
    const isJobEnabled = this.configService.get('TRANSLATION_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      this.logger.warn('Job de Tradução está desabilitado. Nenhuma ação tomada.');
      throw new ForbiddenException('Translation job is currently disabled.');
    }
    
    // Iniciar a tradução em segundo plano
    setTimeout(async () => {
      try {
        const count = await this.translationService.translateSynopses();
        this.logger.log(`Job de Tradução de sinopses concluído com sucesso. ${count} sinopses traduzidas.`);
      } catch (error) {
        this.logger.error(`Erro durante a tradução de sinopses: ${error.message}`);
      }
    }, 0);
    
    this.logger.log('Job de Tradução de sinopses disparado em segundo plano.');
    return { message: 'Synopses translation job triggered successfully in the background.' };
  } 
}