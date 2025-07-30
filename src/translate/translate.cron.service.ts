import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TranslationService } from './translation.service';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../../translate-cron-config.json');

function isTranslationEnabled(): boolean {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return config.enabled === true;
  } catch {
    return false;
  }
}

@Injectable()
export class TranslateCronService {
  private readonly logger = new Logger(TranslateCronService.name);

  constructor(private readonly translationService: TranslationService) {}

  //Executa a cada hora
  @Cron(CronExpression.EVERY_HOUR)
  async handleTranslatePending() {
    if (!isTranslationEnabled()) {
      this.logger.log('Tradução automática DESLIGADA pelo interruptor. Dormindo...');
      return;
    }
    this.logger.log('Despertador automático: iniciando rotina de tradução...');
    await this.translationService.translatePendingSynopses();
  }
}
