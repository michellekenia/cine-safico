-- AlterTable add alternativeTitlePt, countryPt, genresPt, languagePt
ALTER TABLE "ScrapedMovie" ADD COLUMN "alternativeTitlePt" TEXT;
ALTER TABLE "ScrapedMovie" ADD COLUMN "countryPt" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ScrapedMovie" ADD COLUMN "genresPt" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ScrapedMovie" ADD COLUMN "languagePt" TEXT[] DEFAULT ARRAY[]::TEXT[];
