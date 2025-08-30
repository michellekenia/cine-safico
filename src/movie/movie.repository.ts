import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/adapters/prisma.service';

@Injectable()
export class MovieRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDetailsMovieBySlug(slug: string) {
    return this.prisma.scrapedMovie.findUnique({
      where: {
        slug: slug,
      },
      include: {
        streamingServices: true,
      },
    });
  }
}