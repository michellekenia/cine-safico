/*
  Warnings:

  - You are about to drop the column `synopsis` on the `ScrapedMovie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScrapedMovie" DROP COLUMN "synopsis",
ADD COLUMN     "synopsisEn" TEXT,
ADD COLUMN     "synopsisPt" TEXT;
