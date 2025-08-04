import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './adapters/prisma.module';
import { MovieModule } from './movie/movie.module';
import { ScraperService } from './scraper/scraper.service';
import { TranslateModule } from './translate/translate.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TranslationService } from './translate/translation.service';
import { JobsController } from './jobs/jobs.controller';
import { JobsModule } from './jobs/jobs.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, MovieModule, TranslateModule, JobsModule, ConfigModule, ScheduleModule.forRoot()],
  controllers: [AppController, JobsController],
  providers: [AppService, ScraperService, TranslationService],
})
export class AppModule {}
