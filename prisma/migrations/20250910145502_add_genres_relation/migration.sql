/*
  Warnings:

  - You are about to drop the column `genres` on the `ScrapedMovie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScrapedMovie" DROP COLUMN "genres";

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GenreToScrapedMovie" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GenreToScrapedMovie_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Genre_nome_key" ON "Genre"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE INDEX "_GenreToScrapedMovie_B_index" ON "_GenreToScrapedMovie"("B");

-- AddForeignKey
ALTER TABLE "_GenreToScrapedMovie" ADD CONSTRAINT "_GenreToScrapedMovie_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToScrapedMovie" ADD CONSTRAINT "_GenreToScrapedMovie_B_fkey" FOREIGN KEY ("B") REFERENCES "ScrapedMovie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
