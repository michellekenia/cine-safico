import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../adapters/prisma.service';
const translate = require('@iamtraction/google-translate');

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Traduz sinopses em inglês que ainda não possuem tradução em português, processando em lotes de 10.
   * Atualiza o campo synopsisPt no banco e faz pausas entre traduções.
   * Também traduz os campos country, language e genres para campos *_Pt.
   */
  async translatePendingFields(): Promise<number> {
    let totalTraduzidas = 0;

    // Buscar lote de até 10 filmes pendentes
    const movies: { id: string; synopsisEn: string | null; country: string[]; language: string[]; genres: string[] }[] =
      await this.prisma.scrapedMovie.findMany({
        where: {
          OR: [
            { synopsisEn: { not: null }, synopsisPt: null },
            { countryPt: {
                    isEmpty: true
                } },
            { languagePt: {
                    isEmpty: true
                } },
            { genresPt: {
                    isEmpty: true
                } },
          ],
        },
        select: { id: true, synopsisEn: true, country: true, language: true, genres: true },
        take: 10,
      });
    if (movies.length === 0) {
      this.logger.log('Nenhum campo pendente para traduzir.');
      return 0;
    }
    this.logger.log(`Traduzindo lote de ${movies.length} filmes...`);
    for (const movie of movies) {
      const updateData: any = {};
      // Traduzir sinopse
      if (movie.synopsisEn) {
        try {
          const result = await translate(movie.synopsisEn, { to: 'pt' });
          updateData.synopsisPt = result.text;
          this.logger.log(`Sinopse traduzida para o filme ID ${movie.id}`);
          totalTraduzidas++;
        } catch (e) {
          this.logger.error(`Erro ao traduzir sinopse do filme ID ${movie.id}: ${e.message}`);
        }
      }
      // Traduzir country
      if (movie.country) {
        try {
          updateData.countryPt = [];
          for (const c of movie.country) {
            const result = await translate(c, { to: 'pt' });
            updateData.countryPt.push(result.text);
            this.logger.log(`Country traduzido: '${c}' -> '${result.text}' para o filme ID ${movie.id}`);
            await new Promise((res) => setTimeout(res, 500));
          }
        } catch (e) {
          this.logger.error(`Erro ao traduzir country do filme ID ${movie.id}: ${e.message}`);
        }
      }
      // Traduzir language
      if (movie.language) {
        try {
          updateData.languagePt = [];
          for (const l of movie.language) {
            const result = await translate(l, { to: 'pt' });
            updateData.languagePt.push(result.text);
            this.logger.log(`Language traduzido: '${l}' -> '${result.text}' para o filme ID ${movie.id}`);
            await new Promise((res) => setTimeout(res, 500));
          }
        } catch (e) {
          this.logger.error(`Erro ao traduzir language do filme ID ${movie.id}: ${e.message}`);
        }
      }
      // Traduzir genres
      if (movie.genres) {
        try {
          updateData.genresPt = [];
          for (const g of movie.genres) {
            const result = await translate(g, { to: 'pt' });
            updateData.genresPt.push(result.text);
            this.logger.log(`Genre traduzido: '${g}' -> '${result.text}' para o filme ID ${movie.id}`);
            await new Promise((res) => setTimeout(res, 500));
          }
        } catch (e) {
          this.logger.error(`Erro ao traduzir genres do filme ID ${movie.id}: ${e.message}`);
        }
      }
      // Salvar atualizações
      if (Object.keys(updateData).length > 0) {
        try {
          await this.prisma.scrapedMovie.update({
            where: { id: movie.id },
            data: updateData,
          });
          this.logger.log(`Dados atualizados com sucesso para o filme ID ${movie.id}`);
        } catch (error) {
          this.logger.error(`Erro ao atualizar o filme ID ${movie.id} no banco: ${error.message}`);
          // Continue para o próximo filme mesmo com erro de atualização
        }
      }
      // Pausa de 2 segundos entre filmes
      await new Promise((res) => setTimeout(res, 2000));
    }
    this.logger.log(`Total de campos traduzidos nesta execução: ${totalTraduzidas}`);
    return totalTraduzidas;
  }
}
