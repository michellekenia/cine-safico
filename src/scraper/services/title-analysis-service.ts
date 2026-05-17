import * as fs from 'fs';
import * as path from 'path';

export class TitleAnalysisService {
  private static ptbrSet: Set<string>;
  private static stopwords: Set<string>;
  private static blacklistIdiomas: Set<string>;
  private static blacklistTecnica: Set<string>;

  // =========================
  // INIT
  // =========================
  static init() {
    if (this.ptbrSet) return;

    // Carregar dicionario_br.json (vocabulário)
    const dictFile = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'data-analysis/dicionario_br.json'),
        'utf-8'
      )
    );

    // Extrair palavras do vocabulário (pode ser array ou objeto)
    let vocabList: string[] = [];
    if (Array.isArray(dictFile)) {
      vocabList = dictFile;
    } else if (typeof dictFile === 'object') {
      vocabList = Object.keys(dictFile);
    }
    this.ptbrSet = new Set(
      vocabList.map((w: string) => this.normalize(w))
    );

    // Carregar blacklist.json
    const blacklist = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'data-analysis/blacklist.json'),
        'utf-8'
      )
    ).config;

    this.stopwords = new Set(blacklist.stopwords.map((w: string) => this.normalize(w)));
    this.blacklistIdiomas = new Set(blacklist.blacklist_idiomas.map((w: string) => this.normalize(w)));
    this.blacklistTecnica = new Set(blacklist.blacklist_tecnica.map((w: string) => this.normalize(w)));
  }

  // =========================
  // NORMALIZAÇÃO
  // =========================
  private static normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}0-9\s]/gu, '')
      .trim();
  }

  // =========================
  // TOKENIZAÇÃO
  // =========================
  private static tokenize(text: string): string[] {
    return this.normalize(text)
      .split(/\s+/)
      .filter(Boolean);
  }

  // =========================
  // DETECÇÃO DE IDIOMA (LEVE)
  // =========================
  private static detectLanguage(text: string): string {
    const t = this.normalize(text);

    if (/\b(the|and|with|of)\b/.test(t)) return 'en';
    if (/\b(que|los|las|con)\b/.test(t)) return 'es';
    if (/\b(le|la|les|avec)\b/.test(t)) return 'fr';
    if (/\b(il|la|che|con)\b/.test(t)) return 'it';

    return 'unknown';
  }

  // =========================
  // SCORE DO DICIONÁRIO
  // =========================
  private static dictionaryScore(tokens: string[]): number {
    let hits = 0;

    for (const t of tokens) {
      if (this.ptbrSet.has(t)) hits++;
    }

    return hits / Math.max(tokens.length, 1);
  }

  // =========================
  // BONUS ESTRUTURAL PT
  // =========================

  private static structureBonus(text: string): number {
    let score = 0;

    const ptStructures = text.match(
      /\b(de|da|do|das|dos|e|em|para|com|uma|um|minha|meu|sobre)\b/g
    );

    if (ptStructures) {
      score += Math.min(ptStructures.length * 0.08, 0.35);
    }

    if (/(cao|coes|mente|idade|ismo)/.test(text)) {
      score += 0.3;
    }

    return score;
  }

  private static lengthBonus(tokens: string[]): number {
  if (tokens.length >= 5) return 0.25;
  if (tokens.length === 4) return 0.18;
  if (tokens.length === 3) return 0.10;
  if (tokens.length === 2) return 0.03;

  return -0.10;
  }

  // =========================
  // PENALIDADE DE IDIOMA
  // =========================
  private static languagePenalty(text: string): number {
    const lang = this.detectLanguage(text);

    switch (lang) {
      case 'en': return 0.6;
      case 'es': return 0.35;
      case 'fr': return 0.35;
      case 'it': return 0.35;
      default: return 0.40;
    }
  }

  // =========================
  // SCORE FINAL (HEURÍSTICA FLEXÍVEL)
  // =========================
  private static scoreTitle(title: string): number {
    const tokens = this.tokenize(title);
    const text = this.normalize(title);
    const dict = this.dictionaryScore(tokens);
    const ptHits = tokens.filter(t => this.ptbrSet.has(t)).length;
    const structure = ptHits > 0 ? this.structureBonus(text): 0;
    const length = this.lengthBonus(tokens);
    const penalty = this.languagePenalty(title);
    if (tokens.length >= 2 && ptHits === 0) {
       return 0;
    }

    // Nova heurística: se houver acentuação típica do PT-BR, bônus
    const hasAccent = /[áéíóúãõâêôç]/i.test(title);
    let accentBonus = hasAccent ? 0.05: 0;

    // Se não houver palavras da blacklist de idiomas, bônus
    const hasBlacklistIdioma = tokens.some(t => this.blacklistIdiomas.has(t));
    let idiomaBonus = 0;

    // Se houver stopwords típicas do português, bônus
    const hasStopword = tokens.some(t => this.stopwords.has(t));
    let stopwordBonus = hasStopword ? 0.10 : 0;

    

    const score =
      (dict * 1.) +
      structure +
      length +
      accentBonus +
      idiomaBonus +
      stopwordBonus -
      penalty;

    return Math.max(0, Math.min(1, score));
  }

  // =========================
  // DECISÃO FINAL
  // =========================
  private static isValidPTBR(title: string): boolean {
    const score = this.scoreTitle(title);
    // Reduzir threshold de 0.55 para 0.20 (muito menos rigoroso)
    return score >= 0.20;
  }

  // =========================
  // MELHOR TÍTULO (prioriza PT-BR no vocabulário)
  // =========================
  static getBestPortugueseTitle(titles: string[]): string | null {
    if (!titles?.length) return null;

    this.init();

    let best: string | null = null;
    let bestScore = -1;
    let bestIsPtbr = false;
    let bestHasAccent = false;
    let bestPtHits = 0;

    for (const title of titles) {
      if (!title) continue;

      const text = this.normalize(title);
      if (this.blacklistTecnica.has(text)) continue;

      const score = this.scoreTitle(title);
      const tokens = this.tokenize(title);
    
      const ptHits = tokens.filter(t => this.ptbrSet.has(t)).length;
      const isPtbr = ptHits >= 2;
      const hasAccent = /[áéíóúãõâêôç]/i.test(title);

      if (
        score > bestScore ||
        (score === bestScore && isPtbr && !bestIsPtbr) ||
        (score === bestScore && isPtbr === bestIsPtbr && isPtbr && bestIsPtbr && hasAccent && !bestHasAccent)
      ) {
        bestScore = score;
        best = title;
        bestIsPtbr = isPtbr;
        bestHasAccent = hasAccent;
      }
    }

    if (bestScore >= 0.10) {
      return best;
    }


    return null;
  }

  // =========================
  // BATCH
  // =========================
  static processDatabaseTitles(movies: any[]) {
    this.init();

    console.log('\n DEBUG - TitleAnalysisService.processDatabaseTitles');
    console.log(`Total de filmes: ${movies.length}`);
    console.log(`Palavras no dicionário: ${this.ptbrSet.size}`);
    console.log(`Stopwords: ${this.stopwords.size}`);
    console.log(`Blacklist idiomas: ${this.blacklistIdiomas.size}`);
    console.log(`Blacklist técnica: ${this.blacklistTecnica.size}\n`);

    return movies.map((movie, idx) => {
      const titles = movie.alternativeTitles || [];
      const bestTitle = this.getBestPortugueseTitle(titles);
      
      console.log(`[${idx + 1}] ${movie.title}`);
      console.log(`    Títulos: ${titles.join(', ')}`);
      console.log(`    ➜ Melhor título PT: ${bestTitle || '(nenhum)'}`);
      
      if (titles.length > 0) {
        titles.forEach(t => {
          const score = this.scoreTitle(t);
          console.log(`      • "${t}" → score: ${score.toFixed(2)}`);
        });
      }
      console.log('');

      return {
        ...movie,
        titlePtBr: bestTitle
      };
    });
  }
}