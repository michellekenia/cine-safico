-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "poster_image" TEXT,
ALTER COLUMN "release_date" DROP NOT NULL;
