import { IsNotEmpty, IsString } from "class-validator";

export class FindDetailsMovieDto {
  @IsString()
  @IsNotEmpty()
  slug: string;
}