import { Injectable } from '@nestjs/common';
import { ISlugGenerator } from '../interfaces/scraper.interface';

/**
 * SlugService
 * Responsável por gerar slugs normalizados a partir de strings
 * Usado para gêneros, países, idiomas e títulos de filmes
 */
@Injectable()
export class SlugService implements ISlugGenerator {
  /**
   * Gera um slug normalizado a partir de um texto
   * Remove acentos, caracteres especiais e substitui espaços por hífens
   * 
   * @param text - Texto a ser convertido em slug
   * @returns Slug normalizado
   * 
   * @example
   * generate('Action & Adventure') => 'action-adventure'
   * generate('Ficção Científica') => 'ficcao-cientifica'
   */
  generate(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/--+/g, '-') // Remove hífens duplicados
      .trim();
  }
}
