-- DropForeignKey
ALTER TABLE "StreamingService" DROP CONSTRAINT "StreamingService_scrapedMovieId_fkey";

-- AddForeignKey
ALTER TABLE "StreamingService" ADD CONSTRAINT "StreamingService_scrapedMovieId_fkey" FOREIGN KEY ("scrapedMovieId") REFERENCES "ScrapedMovie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
