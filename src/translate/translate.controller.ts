import { Controller, Post } from '@nestjs/common';
import { TranslationService } from './translation.service';

@Controller('translate')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post('sinopses')
  async traduzirSinopses() {
    const total = await this.translationService.translatePendingSynopses();
    return { message: `Total de sinopses traduzidas: ${total}` };
  }
}
