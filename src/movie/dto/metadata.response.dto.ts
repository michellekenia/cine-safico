export class MetadataItemDto {
  slug: string;
  nome: string;
  nomePt: string | null;
  count: number;
}

export class PlatformItemDto {
  slug: string;
  nome: string;
  count: number;
  categoria: string;
  isFeatured: boolean;
}

export class MetadataListResponseDto {
  items: MetadataItemDto[];
  total: number;
}

export class PlatformListResponseDto {
  items: PlatformItemDto[];
  total: number;
}
