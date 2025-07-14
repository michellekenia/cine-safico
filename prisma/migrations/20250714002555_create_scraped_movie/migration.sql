-- CreateTable
CREATE TABLE "ScrapedMovie" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "releaseDate" TEXT,
    "director" TEXT,
    "synopsis" TEXT,
    "posterImage" TEXT,
    "slug" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapedMovie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedMovie_slug_key" ON "ScrapedMovie"("slug");
