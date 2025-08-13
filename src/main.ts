// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { execSync } from 'child_process';

if (!globalThis.crypto) {
  globalThis.crypto = require('crypto');
}

async function bootstrap() {
  try {
    console.log('🏁 Iniciando migração do banco de dados...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migração do banco de dados concluída com sucesso.');
  } catch (error) {
    console.error('❌ Falha ao executar a migração do banco de dados:', error);

    process.exit(1);
  }
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(`🚀 Aplicação iniciada na porta ${process.env.PORT || 3000}`);
}

bootstrap();