import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/adapters/prisma.service';
import { Prisma } from '@prisma/client';

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

  async findTopRatedByLandingPage(take: number): Promise<any[]> {
    const query = Prisma.sql`
      SELECT
        "slug",
        "title",
        "releaseDate",
        "rating",
        "posterImage"
      FROM
        "ScrapedMovie"
      WHERE
        "rating" IS NOT NULL AND "rating" != ''
      ORDER BY
        CAST("rating" AS DECIMAL(2,1)) DESC
      LIMIT ${take};
    `;

    return this.prisma.$queryRaw(query);
  }

async findManyByGenre(genre: string, take: number) {
    return this.prisma.scrapedMovie.findMany({
      where: {
        genres: {
          has: genre,
        },
      },
      select: {
        slug: true,
        title: true,
        releaseDate: true,
        rating: true,
        posterImage: true,
      },
      orderBy: {
        rating: 'desc',
      },
      take: take,
    });
  }

}