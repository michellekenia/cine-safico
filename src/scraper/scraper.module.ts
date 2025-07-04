// src/scraper/scraper.module.ts
import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { PrismaService } from 'src/adapters/prisma.service';


@Module({
    controllers: [ScraperController],
    providers: [ScraperService, PrismaService],
})
export class ScraperModule {}
