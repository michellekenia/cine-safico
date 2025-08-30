class StreamingServiceResponseDto {
  service: string;
  link: string;
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
  streamingServices: StreamingServiceResponseDto[];
}