import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './adapters/prisma.module';
import { MovieModule } from './movie/movie.module';
import { ScraperService } from './scraper/scraper.service';
import { ScraperController } from './scraper/scraper.controller';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [PrismaModule, MovieModule, ScraperModule],
  controllers: [AppController, ScraperController],
  providers: [AppService, ScraperService],
})
export class AppModule {}
