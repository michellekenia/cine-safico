export class Movie {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly releaseDate: Date | null | undefined,
    public readonly director: string,
    public readonly synopsis?: string,
    public readonly streamingPlatform?: string,
    public readonly image?: string



  ) { }

  static create(data: Partial<Movie>): Movie {
    const movie = new Movie(
      data.id,
      data.title,
      data.releaseDate ?? null,
      data.director,
      data.synopsis,
      data.streamingPlatform,
      data.image
    );
    return movie;
  }
}
