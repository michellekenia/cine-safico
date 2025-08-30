
import { IsOptional, IsString } from 'class-validator';

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
}