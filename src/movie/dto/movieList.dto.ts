export class MovieListItemDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  isFeatured: boolean;
  totalMovies: number;
}

export class MovieListDetailDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  isFeatured: boolean;
}

export class MovieListMovieDto {
  slug: string;
  title: string;
  releaseDate: string | null;
  rating: string | null;
  posterImage: string | null;
  genres: Array<{ nomePt: string; slug: string }>;
}

export class MovieListResponseDto {
  list: MovieListDetailDto;
  data: MovieListMovieDto[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export class AllMovieListsResponseDto {
  items: MovieListItemDto[];
  total: number;
}
