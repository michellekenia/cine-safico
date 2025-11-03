import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { exec } from 'child_process';

// Função para obter origins CORS baseado no ambiente
function getCorsOrigin(): string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return process.env.CORS_ORIGIN_PROD?.split(',') || [];
  } else {
    return process.env.CORS_ORIGIN_LOCAL?.split(',') || [];
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuração CORS detalhada
  app.enableCors({
    origin: getCorsOrigin(),
    credentials: process.env.CORS_CREDENTIALS === 'true',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  
  const env = process.env.NODE_ENV || 'development';
  const origins = getCorsOrigin();
  
  console.log(`🚀 API online em 0.0.0.0:${port}`);
  console.log(`🌐 Environment: ${env}`);
  console.log(`🔒 CORS Origins: ${origins.join(', ')}`);
}

bootstrap();
