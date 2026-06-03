-- CreateTable
CREATE TABLE "MovieList" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MovieListToScrapedMovie" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MovieListToScrapedMovie_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieList_slug_key" ON "MovieList"("slug");

-- CreateIndex
CREATE INDEX "_MovieListToScrapedMovie_B_index" ON "_MovieListToScrapedMovie"("B");

-- AddForeignKey
ALTER TABLE "_MovieListToScrapedMovie" ADD CONSTRAINT "_MovieListToScrapedMovie_A_fkey" FOREIGN KEY ("A") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieListToScrapedMovie" ADD CONSTRAINT "_MovieListToScrapedMovie_B_fkey" FOREIGN KEY ("B") REFERENCES "ScrapedMovie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
