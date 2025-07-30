import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

if (!globalThis.crypto) {
  globalThis.crypto = require('crypto');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
