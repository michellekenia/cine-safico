import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

if (!globalThis.crypto) {
  globalThis.crypto = require('crypto');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(`🚀 Aplicação iniciada na porta ${process.env.PORT || 3000}`);
}

bootstrap();
