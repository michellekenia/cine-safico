/*
  Warnings:

  - You are about to drop the `Movie` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "ScrapedMovie" ADD COLUMN     "country" TEXT[],
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "genres" TEXT[],
ADD COLUMN     "language" TEXT[],
ADD COLUMN     "rating" TEXT;

-- DropTable
DROP TABLE "Movie";
