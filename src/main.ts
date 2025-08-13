import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { exec } from 'child_process';

async function bootstrap() {
  console.log('🏁 Iniciando migração do banco...');
  exec('npx prisma migrate deploy', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Erro na migração:', err.message);
      return;
    }
    if (stderr) console.warn('⚠️ Aviso na migração:', stderr);
    console.log('✅ Migração concluída:\n', stdout);
  });

  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Aplicação rodando na porta ${port}`);
}

bootstrap();
