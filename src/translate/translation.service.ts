import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../adapters/prisma.service';
const translate = require('@iamtraction/google-translate');

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly prisma: PrismaService) { }
  /**
   * Traduz apenas as sinopses dos filmes que ainda não possuem tradução.
   * Processa em lotes para não sobrecarregar a API de tradução.
   */
  async translateSynopses(): Promise<number> {
    let totalTraduzidas = 0;

    // Buscar lote de até 10 filmes com sinopses pendentes
    const movies = await this.prisma.scrapedMovie.findMany({
      where: {
        synopsisEn: { not: null },
        synopsisPt: null,
      },
      select: {
        id: true,
        synopsisEn: true,
      },
      take: 10,
    });

    if (movies.length === 0) {
      this.logger.log('Nenhuma sinopse pendente para traduzir.');
      return 0;
    }

    this.logger.log(`Traduzindo sinopses de ${movies.length} filmes...`);

    for (const movie of movies) {
      try {
        const result = await translate(movie.synopsisEn, { to: 'pt' });

        // Atualiza apenas a sinopse
        await this.prisma.scrapedMovie.update({
          where: { id: movie.id },
          data: { synopsisPt: result.text },
        });

        this.logger.log(`Sinopse traduzida para o filme ID ${movie.id}`);
        totalTraduzidas++;

        // Pausa entre traduções para não sobrecarregar a API
        await new Promise((res) => setTimeout(res, 2000));
      } catch (e) {
        this.logger.error(`Erro ao traduzir sinopse do filme ID ${movie.id}: ${e.message}`);
      }
    }

    this.logger.log(`Total de sinopses traduzidas: ${totalTraduzidas}`);
    return totalTraduzidas;
  }

  /**
   * Coordena a tradução de todos os metadados (gêneros, países, idiomas).
   */
  async translateMetadata(): Promise<void> {
    this.logger.log('Iniciando tradução de metadados...');
    
    // Verificar quantos itens estão pendentes de tradução
    const pendingGenres = await this.prisma.genre.count({ where: { nomePt: null } });
    const pendingCountries = await this.prisma.country.count({ where: { nomePt: null } });
    const pendingLanguages = await this.prisma.language.count({ where: { nomePt: null } });
    
    this.logger.log(`Itens pendentes de tradução: ${pendingGenres} gêneros, ${pendingCountries} países, ${pendingLanguages} idiomas.`);

    const genresCount = await this.translateGenres();
    const countriesCount = await this.translateCountries();
    const languagesCount = await this.translateLanguages();

    this.logger.log(`Metadados traduzidos nesta execução: ${genresCount} gêneros, ${countriesCount} países, ${languagesCount} idiomas.`);
    
    // Verificar se ainda há itens pendentes
    const remainingGenres = await this.prisma.genre.count({ where: { nomePt: null } });
    const remainingCountries = await this.prisma.country.count({ where: { nomePt: null } });
    const remainingLanguages = await this.prisma.language.count({ where: { nomePt: null } });
    
    if (remainingGenres > 0 || remainingCountries > 0 || remainingLanguages > 0) {
      this.logger.log(`Ainda restam itens pendentes de tradução: ${remainingGenres} gêneros, ${remainingCountries} países, ${remainingLanguages} idiomas.`);
    } else {
      this.logger.log('Todos os metadados foram traduzidos com sucesso!');
    }
  }

  /**
   * Traduz os nomes dos gêneros que ainda não possuem tradução.
   */
  async translateGenres(): Promise<number> {
    let totalTraduzidos = 0;

    // Busca gêneros sem tradução (sem limite)
    const generos = await this.prisma.genre.findMany({
      where: {
        nomePt: null
      },
      select: {
        id: true,
        nome: true
      }
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
        await new Promise((res) => setTimeout(res, 1000));
      } catch (e) {
        this.logger.error(`Erro ao traduzir gênero '${genero.nome}': ${e.message}`);
      }
    }

    this.logger.log(`Total de gêneros traduzidos: ${totalTraduzidos}/${generos.length}`);
    return totalTraduzidos;
  }

  /**
   * Traduz os nomes dos países que ainda não possuem tradução.
   */
  async translateCountries(): Promise<number> {
    let totalTraduzidos = 0;

    // Busca todos os países sem tradução (sem limite)
    const paises = await this.prisma.country.findMany({
      where: {
        nomePt: null
      },
      select: {
        id: true,
        nome: true
      }
    });

    if (paises.length === 0) {
      this.logger.log('Nenhum país pendente para tradução.');
      return 0;
    }

    this.logger.log(`Traduzindo ${paises.length} países...`);

    for (const pais of paises) {
      try {
        const result = await translate(pais.nome, { to: 'pt' });

        // Atualiza o país com a tradução
        await this.prisma.country.update({
          where: { id: pais.id },
          data: { nomePt: result.text }
        });

        this.logger.log(`País traduzido: '${pais.nome}' -> '${result.text}'`);
        totalTraduzidos++;

        // Aguarda um pouco para evitar exceder limites da API de tradução
        await new Promise((res) => setTimeout(res, 1000));
      } catch (e) {
        this.logger.error(`Erro ao traduzir país '${pais.nome}': ${e.message}`);
      }
    }

    this.logger.log(`Total de países traduzidos: ${totalTraduzidos}/${paises.length}`);
    return totalTraduzidos;
  }

  /**
   * Traduz os nomes dos idiomas que ainda não possuem tradução.
   */
  async translateLanguages(): Promise<number> {
    let totalTraduzidos = 0;

    // Busca idiomas sem tradução (sem limite)
    const idiomas = await this.prisma.language.findMany({
      where: {
        nomePt: null
      },
      select: {
        id: true,
        nome: true
      }
    });

    if (idiomas.length === 0) {
      this.logger.log('Nenhum idioma pendente para tradução.');
      return 0;
    }

    this.logger.log(`Traduzindo ${idiomas.length} idiomas...`);

    for (const idioma of idiomas) {
      try {
        const result = await translate(idioma.nome, { to: 'pt' });

        // Atualiza o idioma com a tradução
        await this.prisma.language.update({
          where: { id: idioma.id },
          data: { nomePt: result.text }
        });

        this.logger.log(`Idioma traduzido: '${idioma.nome}' -> '${result.text}'`);
        totalTraduzidos++;

        // Aguarda um pouco para evitar exceder limites da API de tradução
        await new Promise((res) => setTimeout(res, 1000));
      } catch (e) {
        this.logger.error(`Erro ao traduzir idioma '${idioma.nome}': ${e.message}`);
      }
    }

    this.logger.log(`Total de idiomas traduzidos: ${totalTraduzidos}/${idiomas.length}`);
    return totalTraduzidos;
  }
}
