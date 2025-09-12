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

    // 1. Primeiro traduz os gêneros que ainda não possuem tradução
    await this.translateGenres();

    // 2. Buscar lote de até 10 filmes pendentes
    const movies = await this.prisma.scrapedMovie.findMany({
      where: {
        OR: [
          { synopsisEn: { not: null }, synopsisPt: null },
          { countryPt: {
                  isEmpty: true
              } },
          { languagePt: {
                  isEmpty: true
              } },
        ],
      },
      select: { 
        id: true, 
        synopsisEn: true, 
        country: true, 
        language: true,
        genres: true
      },
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
          updateData.countryPt = updateData.countryPt?.length ? updateData.countryPt : [];
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
          updateData.languagePt = updateData.languagePt?.length ? updateData.languagePt : [];
          for (const l of movie.language) {
            const result = await translate(l, { to: 'pt' });
            updateData.languagePt.push(result.text ?? '');
            this.logger.log(`Language traduzido: '${l}' -> '${result.text}' para o filme ID ${movie.id}`);
            await new Promise((res) => setTimeout(res, 500));
          }
        } catch (e) {
          this.logger.error(`Erro ao traduzir language do filme ID ${movie.id}: ${e.message}`);
        }
      }

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

  /**
   * Traduz os nomes dos gêneros que ainda não possuem tradução.
   * Atualiza diretamente a tabela Genre, adicionando a tradução no campo nomePt.
   */
  async translateGenres(): Promise<number> {
    let totalTraduzidos = 0;
    
    // Busca gêneros sem tradução
    const generos = await this.prisma.genre.findMany({
      where: {
        nomePt: null
      },
      select: {
        id: true,
        nome: true
      },
      take: 20 // Limita para não sobrecarregar a API de tradução
    });
    
    if (generos.length === 0) {
      this.logger.log('Nenhum gênero pendente para tradução.');
      return 0;
    }
    
    this.logger.log(`Traduzindo ${generos.length} gêneros...`);
    
    for (const genero of generos) {
      try {
        const result = await translate(genero.nome, { to: 'pt' });
        
        // Atualiza o gênero com a tradução
        await this.prisma.genre.update({
          where: { id: genero.id },
          data: { nomePt: result.text }
        });
        
        this.logger.log(`Gênero traduzido: '${genero.nome}' -> '${result.text}'`);
        totalTraduzidos++;
        
        // Aguarda um pouco para evitar exceder limites da API de tradução
        await new Promise((res) => setTimeout(res, 500));
      } catch (e) {
        this.logger.error(`Erro ao traduzir gênero '${genero.nome}': ${e.message}`);
      }
    }
    
    this.logger.log(`Total de gêneros traduzidos: ${totalTraduzidos}`);
    return totalTraduzidos;
  }
}
