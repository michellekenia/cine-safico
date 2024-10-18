import { PartialType } from '@nestjs/mapped-types';
import { CreateMovieDto } from './create-movie.dto';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateMovieDto extends PartialType(CreateMovieDto) {

    @IsOptional()
    @IsString()
    title?: string;
  
    @IsOptional()
    @IsDate() 
    releaseDate?: Date;
  
    @IsOptional()
    @IsString()
    director?: string;
  
    @IsOptional()
    @IsString()
    synopsis?: string;
  
    @IsOptional()
    @IsString()
    streamingPlatform?: string;
}