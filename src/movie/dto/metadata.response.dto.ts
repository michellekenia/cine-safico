export class MetadataItemDto {
  slug: string;
  nome: string;
  nomePt: string | null;
  count: number;
}

export class MetadataListResponseDto {
  items: MetadataItemDto[];
  total: number;
}
