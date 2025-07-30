import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslationController } from './translate.controller';
import { PrismaModule } from '../adapters/prisma.module';


@Module({
  imports: [PrismaModule],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslateModule {}
