class StreamingServiceResponseDto {
  service: string;
  link: string;
}

class GenreResponseDto {
  id: string;
  nome: string;
  nomePt: string | null;
  slug: string;
}

class CountryResponseDto {
  id: string;
  nome: string;
  nomePt: string | null;
  slug: string;
}

class LanguageResponseDto {
  id: string;
  nome: string;
  nomePt: string | null;
  slug: string;
}

export class MovieDetailsResponseDto {
  id: string;
  slug: string;
  title: string;
  releaseDate: string | null;
  director: string | null;
  synopsisEn: string | null;
  synopsisPt: string | null;
  posterImage: string | null;
  duration: string | null;
  rating: string | null;
  streamingServices: StreamingServiceResponseDto[];
  genres: GenreResponseDto[];
  country: CountryResponseDto[];
  language: LanguageResponseDto[];
}