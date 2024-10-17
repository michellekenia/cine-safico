import { UpdateMovieDto } from "src/movie/dto/update-movie.dto";
import { MovieRepositoryPort } from "src/core/ports/movie-repository-port";
import { Movie } from "src/core/domain/movie.model";
import { PrismaService } from "src/adapters/prisma.service";
import { CreateMovieDto } from "../dto/create-movie.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PrismaMovieRepository implements MovieRepositoryPort {

    constructor(private readonly prismaService: PrismaService) { }

    async create(createMovieDto: CreateMovieDto): Promise<Movie> {
        try {
            return await this.prismaService.movie.create({ data: createMovieDto })
        } catch (error) {
            throw new Error(`Erro ao criar o filme: ${error.message}`)
        }
    }

    async update(id: number, updateMovieDto: UpdateMovieDto): Promise<Movie | null> {
        try {
            return await this.prismaService.movie.update({
                where: { id },
                data: updateMovieDto
            })
        } catch (error) {
            throw new Error(`Erro ao atualizar o filme: ${error.message}`);
        }
    }

    async findById(id: number): Promise<Movie | null> {
        try {
            return await this.prismaService.movie.findUnique({
                where: { id },
            });
        } catch (error) {
            throw new Error(`Erro ao buscar o filme: ${error.message}`);
        }
    }

    async findAll(): Promise<Movie[]> {
        try {
            return await this.prismaService.movie.findMany();
        } catch (error) {
            throw new Error(`Erro ao buscar filmes: ${error.message}`);
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await this.prismaService.movie.delete({
                where: { id },
            });
        } catch (error) {
            throw new Error(`Erro ao deletar o filme: ${error.message}`);
        }
    }
}