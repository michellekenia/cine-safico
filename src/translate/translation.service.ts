import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../adapters/prisma.service';
// import translate from 'google-translate-api-browser';
const translate = require('@iamtraction/google-translate');

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Traduz sinopses em inglês que ainda não possuem tradução em português, processando em lotes de 10.
   * Atualiza o campo synopsisPt no banco e faz pausas entre traduções.
   */
  async translatePendingSynopses(): Promise<number> {
    let totalTraduzidas = 0;

    //Buscar lote de até 10 filmes pendentes
    const movies: { id: string; synopsisEn: string | null }[] =
      await this.prisma.scrapedMovie.findMany({
        where: {
          synopsisEn: { not: null },
          synopsisPt: null,
        },
        select: { id: true, synopsisEn: true },
        take: 10,
      });
    if (movies.length === 0) {
      this.logger.log('Nenhuma sinopse pendente para traduzir.');
      return 0;
    }
    this.logger.log(`Traduzindo lote de ${movies.length} sinopses...`);
    for (const movie of movies) {
      if (!movie.synopsisEn) continue;
      try {
        //Traduzir
        const result = await translate(movie.synopsisEn, { to: 'pt' });

        //Salvar
        await this.prisma.scrapedMovie.update({
          where: { id: movie.id },
          data: { synopsisPt: result.text },
        });
        this.logger.log(`Sinopse traduzida para o filme ID ${movie.id}`);
        totalTraduzidas++;
      } catch (e) {
        this.logger.error(
          `Erro ao traduzir filme ID ${movie.id}: ${e.message}`,
        );
      }

      //Pausa de 2 segundos
      await new Promise((res) => setTimeout(res, 2000));
    }
    this.logger.log(
      `Total de sinopses traduzidas nesta execução: ${totalTraduzidas}`,
    );
    return totalTraduzidas;
  }
}
