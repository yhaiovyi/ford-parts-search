export interface WebSocketMessage<T> {
  type: string;
  data: T;
}

export interface ResolvedPart {
  search: string;
  name: string;
  url: string;
  packageQuantity: number;
  partNumber: string;
}

export interface Dealership {
  id: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  latitude: number;
  longitude: number;
  switchUrl: string;
}

export interface SearchResultPart {
  search: string;
  price: number;
  available: boolean;
}

export type SearchResultParts = SearchResultPart[];

export interface SearchResult {
  dealership: Dealership;
  results: SearchResultParts;
}

export type SearchResults = SearchResult[];

export type ResolvedParts = ResolvedPart[];

export interface SearchData {
  resolvedParts: ResolvedParts;
  searchResults: SearchResults;
}
