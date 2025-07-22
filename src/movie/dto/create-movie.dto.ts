import { IsNotEmpty, IsOptional, IsString, IsDate } from 'class-validator';

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsDate()
  releaseDate: Date;

  @IsNotEmpty()
  @IsString()
  director: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  @IsString()
  streamingPlatform?: string;

  @IsString()
  slug: string;
}
