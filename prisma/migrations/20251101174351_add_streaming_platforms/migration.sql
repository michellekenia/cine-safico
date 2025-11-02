-- CreateTable
CREATE TABLE "StreamingPlatform" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomePt" TEXT,
    "slug" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamingPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ScrapedMovieToStreamingPlatform" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ScrapedMovieToStreamingPlatform_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreamingPlatform_nome_key" ON "StreamingPlatform"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "StreamingPlatform_slug_key" ON "StreamingPlatform"("slug");

-- CreateIndex
CREATE INDEX "_ScrapedMovieToStreamingPlatform_B_index" ON "_ScrapedMovieToStreamingPlatform"("B");

-- AddForeignKey
ALTER TABLE "_ScrapedMovieToStreamingPlatform" ADD CONSTRAINT "_ScrapedMovieToStreamingPlatform_A_fkey" FOREIGN KEY ("A") REFERENCES "ScrapedMovie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScrapedMovieToStreamingPlatform" ADD CONSTRAINT "_ScrapedMovieToStreamingPlatform_B_fkey" FOREIGN KEY ("B") REFERENCES "StreamingPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
