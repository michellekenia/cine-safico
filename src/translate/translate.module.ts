import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../adapters/prisma.module';



@Module({
  imports: [PrismaModule],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslateModule {}
