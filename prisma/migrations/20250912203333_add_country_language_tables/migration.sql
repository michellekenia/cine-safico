/*
  Warnings:

  - You are about to drop the column `country` on the `ScrapedMovie` table. All the data in the column will be lost.
  - You are about to drop the column `countryPt` on the `ScrapedMovie` table. All the data in the column will be lost.
  - You are about to drop the column `genresPt` on the `ScrapedMovie` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `ScrapedMovie` table. All the data in the column will be lost.
  - You are about to drop the column `languagePt` on the `ScrapedMovie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScrapedMovie" DROP COLUMN "country",
DROP COLUMN "countryPt",
DROP COLUMN "genresPt",
DROP COLUMN "language",
DROP COLUMN "languagePt";

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomePt" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomePt" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CountryToScrapedMovie" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CountryToScrapedMovie_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LanguageToScrapedMovie" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LanguageToScrapedMovie_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_nome_key" ON "Country"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Language_nome_key" ON "Language"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Language_slug_key" ON "Language"("slug");

-- CreateIndex
CREATE INDEX "_CountryToScrapedMovie_B_index" ON "_CountryToScrapedMovie"("B");

-- CreateIndex
CREATE INDEX "_LanguageToScrapedMovie_B_index" ON "_LanguageToScrapedMovie"("B");

-- AddForeignKey
ALTER TABLE "_CountryToScrapedMovie" ADD CONSTRAINT "_CountryToScrapedMovie_A_fkey" FOREIGN KEY ("A") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToScrapedMovie" ADD CONSTRAINT "_CountryToScrapedMovie_B_fkey" FOREIGN KEY ("B") REFERENCES "ScrapedMovie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LanguageToScrapedMovie" ADD CONSTRAINT "_LanguageToScrapedMovie_A_fkey" FOREIGN KEY ("A") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LanguageToScrapedMovie" ADD CONSTRAINT "_LanguageToScrapedMovie_B_fkey" FOREIGN KEY ("B") REFERENCES "ScrapedMovie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
