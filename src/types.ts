export enum IpcMessageType {
  SEARCH = 'search',
  SEARCH_VALIDATION_ERROR = 'searchValidationError',
  RESOLVED_PARTS = 'resolvedParts',
  SEARCH_RESULTS = 'searchResult',
  SEARCH_PROGRESS = 'searchProgress',
  SEARCH_COMPLETE = 'searchComplete',
  SEARCH_CANCEL = 'searchCancel',
  CANCEL_SEARCH = 'cancelSearch',
  DISCONNECT = 'disconnect',
}

export interface SearchValidationError {
  zip?: string;
  radius?: string;
  searches?: string;
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

export enum Availability {
  IN_STOCK = 'In Stock',
  AVAILABLE = 'Available',
  OUT_OF_STOCK = 'Unavailable',
}

export interface SearchResultPart {
  search: string;
  price: number;
  available: Availability;
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
