-- CreateTable
CREATE TABLE "Movie" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "director" TEXT NOT NULL,
    "synopsis" TEXT,
    "streaming_platform" VARCHAR(255),

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);
