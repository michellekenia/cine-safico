export class Movie {
    constructor(
      public readonly id: number,
      public readonly title: string,
      public readonly releaseDate: Date,
      public readonly director: string,
      public readonly synopsis?: string,
      public readonly streamingPlatform?: string,
    ) {}
  }
  