import { Movie } from "@prisma/client";
import { CreateMovieDto } from "src/movie/dto/create-movie.dto";
import { UpdateMovieDto } from "src/movie/dto/update-movie.dto";
import { PrismaService } from "src/adapters/prisma.service";

export class PrismaMovieRepository {

    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateMovieDto): Promise<Movie> {
        return this.prisma.movie.create({data})
    }

    async findAll(): Promise<Movie[]> {
        return this.prisma.movie.findMany()
    }

    async update(id: number, data: UpdateMovieDto): Promise <Movie | null> {
        return this.prisma.movie.update({
            where: { id },
            data
        })
    }

    async delete (id: number): Promise <Movie | null> {
        return this.prisma.movie.delete ({
            where: { id}
        })

    }

}