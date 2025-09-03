import { ScraperService } from "src/scraper/scraper.service";
import { TranslationService } from "src/translate/translation.service";
import { ConfigService } from "@nestjs/config";
import { Logger, Post, UnauthorizedException, Headers, ForbiddenException, Controller} from "@nestjs/common";

@Controller('scraper')
export class JobsController {
    private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly translationService: TranslationService,
    private readonly scraperService: ScraperService,
    private readonly configService: ConfigService,

  ) {}

  @Post("/trigger-scraper")
  async triggerScraper(@Headers('authorization') authHeader: string) {
    this.logger.log("Recebendo requisição do scraping");
    this.authorizeRequest(authHeader);
    // 2. Verifica se o job está habilitado no .env
    const isJobEnabled = this.configService.get('SCRAPER_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      this.logger.warn('Job de Scraping está desabilitado. Nenhuma ação tomada.');
      throw new ForbiddenException('Scraping job is currently disabled.');
    }
    // 3. Dispara o job em segundo plano e retorna uma resposta imediata
    this.scraperService.scrapeMovies('https://letterboxd.com/osasco12/list/saficos/');
    this.logger.log('Job de Scraping disparado com sucesso.');
    
    return { message: 'Scraping job triggered successfully in the background.' };
  } 
  
  @Post('trigger-translator')
  async triggerTranslator(@Headers('authorization') authHeader: string) {
    this.logger.log('Recebida requisição para iniciar o job de tradução...');
    this.authorizeRequest(authHeader);
    
    const isJobEnabled = this.configService.get('TRANSLATION_JOB_ENABLED') === 'true';
    if (!isJobEnabled) {
      this.logger.warn('Job de Tradução está desabilitado. Nenhuma ação tomada.');
      throw new ForbiddenException('Translation job is currently disabled.');
    }
    this.translationService.translatePendingFields();
    this.logger.log('Job de Tradução disparado em segundo plano.');
    
    return { message: 'Translation job triggered successfully in the background.' };
  } 

   private authorizeRequest(authHeader: string) {
    const secret = this.configService.get<string>('JOB_TRIGGER_SECRET');
    const token = authHeader?.split(' ')[1]; // Espera um header "Bearer SEU_SECRET"

    if (token !== secret) {
      this.logger.error('Falha na autorização do job: segredo inválido.');
      throw new UnauthorizedException('Invalid job trigger secret.');
    }
    this.logger.log('Autorização do job bem-sucedida.');
  }
}