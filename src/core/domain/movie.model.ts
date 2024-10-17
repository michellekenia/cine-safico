export class Movie {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly releaseDate: Date,
    public readonly director: string,
    public readonly synopsis?: string,
    public readonly streamingPlatform?: string,
  ) { }

  static create(data: Partial<Movie>): Movie {
    const movie = new Movie(
      data.id,
      data.title,
      data.releaseDate,
      data.director,
      data.synopsis,
      data.streamingPlatform
    );
    return movie;
  }
}
