/*
  Warnings:

  - The primary key for the `ScrapedMovie` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "ScrapedMovie" DROP CONSTRAINT "ScrapedMovie_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ScrapedMovie_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ScrapedMovie_id_seq";

-- CreateTable
CREATE TABLE "StreamingService" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "scrapedMovieId" TEXT NOT NULL,

    CONSTRAINT "StreamingService_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StreamingService" ADD CONSTRAINT "StreamingService_scrapedMovieId_fkey" FOREIGN KEY ("scrapedMovieId") REFERENCES "ScrapedMovie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
