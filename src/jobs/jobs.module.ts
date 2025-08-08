import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { TranslationService } from 'src/translate/translation.service';
import { PrismaService } from 'src/adapters/prisma.service';
import { ScraperService } from 'src/scraper/scraper.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
  controllers: [JobsController],
    providers: [TranslationService, PrismaService, ScraperService],
})
export class JobsModule {}
