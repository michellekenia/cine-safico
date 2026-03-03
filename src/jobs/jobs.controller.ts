import { ScraperService } from "src/scraper/scraper.service";
import { TranslationService } from "src/translate/translation.service";
import { ConfigService } from "@nestjs/config";
import { Logger, Post, ForbiddenException, Controller, Body, BadRequestException } from "@nestjs/common";

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
        await this.scraperService.scrapeMovies('https://letterboxd.com/mih_kenia/list/lista1/');
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
  
    @Post('trigger-wakeup')
    async triggerWakeup() {
      this.logger.log('Aplicação sendo acordada via endpoint trigger-wakeup');
    
      const timestamp = new Date().toISOString();
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
    
      this.logger.log(`Aplicação acordada com sucesso em ${timestamp}`);
      this.logger.log(`Uptime: ${Math.floor(uptime / 60)} minutos`);

      return { 
        message: 'Application wakeup successful',
        status: 'awake',
        timestamp,
        uptime: `${Math.floor(uptime / 60)} minutes`,
       memoryUsage: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      };
    }

    /**
     * Endpoint genérico para scraping de listas específicas do Letterboxd e associação de gêneros.
     * 
     * USO:
     * POST /jobs/trigger-list-scraper
     * Content-Type: application/json
     * 
     * Body para filmes de Natal:
     * {
     *   "listUrl": "https://letterboxd.com/osasco12/list/selecao-natal-para-cinesafico/share/8PVrv3Roxba0JqVz/",
     *   "genreName": "Christmas"
     * }
     * 
     * Body para outras listas/gêneros:
     * {
     *   "listUrl": "https://letterboxd.com/usuario/list/minha-lista/",
     *   "genreName": "Horror"
     * }
     * 
     * O gênero será criado automaticamente se não existir.
     */
    @Post('trigger-list-scraper')
    async triggerListScraper(@Body() body: { listUrl: string; genreName: string }) {
      this.logger.log(`� Recebendo requisição para scraping de lista específica...`);
      this.logger.log(`📋 Lista: ${body.listUrl}`);
      this.logger.log(`🏷️ Gênero: ${body.genreName}`);
      
      // Validação dos parâmetros
      if (!body.listUrl || !body.genreName) {
        this.logger.error('❌ Parâmetros obrigatórios: listUrl e genreName');
        throw new BadRequestException('Required parameters: listUrl and genreName');
      }
      
      // Verifica se o job está habilitado no .env
      const isJobEnabled = this.configService.get('SCRAPER_JOB_ENABLED') === 'true';
      if (!isJobEnabled) {
        this.logger.warn('❌ Job de Scraping está desabilitado no .env');
        throw new ForbiddenException('Scraping job is currently disabled.');
      }
      
      // Dispara o job em segundo plano
      setTimeout(async () => {
        try {
          this.logger.log(`🚀 Iniciando scraping da lista para gênero "${body.genreName}"...`);
          
          // Scraping da lista específica
          const scrapedMovies = await this.scraperService.scrapeMovies(body.listUrl);
          
          this.logger.log(`📥 Scraping concluído (${scrapedMovies.length} filmes novos), marcando TODOS os filmes da lista como gênero "${body.genreName}"...`);
          
          // Marcar TODOS os filmes da lista com o gênero especificado (novos + existentes)
          const count = await this.scraperService.markMoviesFromListAsGenre(body.listUrl, body.genreName);
          
          this.logger.log(`🎉 Job de Scraping concluído com SUCESSO! ${scrapedMovies.length} filmes novos + ${count} total marcados como "${body.genreName}".`);
          
        } catch (error) {
          this.logger.error(`💥 ERRO durante scraping da lista: ${error.message}`);
          this.logger.error('Stack trace:', error.stack);
        }
      }, 0);
      
      this.logger.log('✅ Job de Scraping de lista disparado em segundo plano.');
      return { 
        message: `List scraping started in background for genre "${body.genreName}".`,
        status: 'started',
        listUrl: body.listUrl,
        genreName: body.genreName
      };
    }

    /**
     * Endpoint específico para filmes de Natal (mantido para compatibilidade).
     * Este endpoint usa o endpoint genérico internamente.
     */
    @Post('trigger-christmas-scraper')
    async triggerChristmasScraper() {
      this.logger.log('🎄 Recebendo requisição para scraping de filmes de Natal...');
      
      // Chama o endpoint genérico com parâmetros de Natal
      return this.triggerListScraper({
        listUrl: 'https://letterboxd.com/osasco12/list/selecao-natal-para-cinesafico/share/8PVrv3Roxba0JqVz/',
        genreName: 'Christmas'
      });
    }

}