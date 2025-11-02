export interface YearRangeDto {
  year: number;
  count: number;
}

export interface YearMetadataDto {
  items: YearRangeDto[];
  total: number;
  minYear: number;
  maxYear: number;
}
