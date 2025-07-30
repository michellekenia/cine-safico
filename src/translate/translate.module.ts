import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../adapters/prisma.module';
import { TranslateCronService } from './translate.cron.service';


@Module({
  imports: [PrismaModule],
  providers: [TranslationService, TranslateCronService],
  exports: [TranslationService],
})
export class TranslateModule {}
