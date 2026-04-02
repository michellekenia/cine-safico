-- AlterTable
ALTER TABLE "ScrapedMovie" ADD COLUMN "alternativeTitles" TEXT[] DEFAULT ARRAY[]::TEXT[];
