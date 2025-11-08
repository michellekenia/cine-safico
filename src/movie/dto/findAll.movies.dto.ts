import { IsOptional, IsString, IsIn } from 'class-validator';

export class FindAllMoviesDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  yearFrom?: string;

  @IsOptional()
  @IsString()
  yearTo?: string;

  // Parâmetros de ordenação
  @IsOptional()
  @IsString()
  @IsIn(['rating', 'title', 'releaseDate'], {
    message: 'orderBy deve ser um dos valores: rating, title, releaseDate'
  })
  orderBy?: 'rating' | 'title' | 'releaseDate';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'], {
    message: 'order deve ser ASC ou DESC'
  })
  order?: 'ASC' | 'DESC';
}