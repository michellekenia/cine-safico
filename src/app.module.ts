import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './adapters/prisma.module';
import { MovieModule } from './movie/movie.module';
import { TranslateModule } from './translate/translate.module';
import { JobsModule } from './jobs/jobs.module';

/**
 * AppModule
 * 
 * Módulo raiz da aplicação
 * Imports:
 * - ConfigModule: Variáveis de ambiente globais
 * - PrismaModule: Acesso ao banco de dados
 * - MovieModule: Endpoints de filmes
 * - TranslateModule: Serviços de tradução
 * - JobsModule: Controllers e services de jobs
 * - ScheduleModule: Agendamento de tarefas
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MovieModule,
    TranslateModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
