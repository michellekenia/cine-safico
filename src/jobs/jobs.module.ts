import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobsController } from './jobs.controller';
import { TranslationService } from 'src/translate/translation.service';
import { ScraperModule } from 'src/scraper/scraper.module';
import { PrismaModule } from 'src/adapters/prisma.module';

/**
 * JobsModule
 * 
 * Módulo para controlar jobs em background (scraping, tradução, etc)
 * Imports:
 * - ConfigModule: Variáveis de ambiente
 * - ScraperModule: Acesso ao ScraperService
 * - PrismaModule: Acesso ao PrismaService (para TranslationService)
 * 
 * Providers:
 * - TranslationService: Tradução de metadados e sinopses
 */
@Module({
  imports: [ConfigModule, PrismaModule, ScraperModule],
  controllers: [JobsController],
  providers: [TranslationService],
})
export class JobsModule {}
