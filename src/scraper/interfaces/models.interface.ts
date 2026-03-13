/**
 * Modelos de dados do scraper
 * Representa estruturas de dados compartilhadas entre serviços
 */

export interface MovieLink {
  href: string;
  poster: string | null;
}

export interface MovieDetails {
  title: string | null;
  releaseYear: string | null;
  director: string | null;
  synopsis: string | null;
  posterImage: string | null;
  duration: string | null;
  rating: string | null;
  genres: string[];
  country: string[];
  language: string[];
}

export interface StreamingService {
  service: string;
  link: string;
}

export interface MoviePageData {
  details: MovieDetails;
  streaming: StreamingService[];
}

export interface MovieData extends MoviePageData {
  slug: string;
  posterUrl: string | null;
}

export interface ScrapedMovieRecord {
  id: string;
  slug: string;
  title: string;
  releaseDate: string | null;
  director: string | null;
  posterImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
