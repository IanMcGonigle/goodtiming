/** Minimal validated projection of Browse search; not an ingestion or publication model. */
export interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
}

export interface EbaySearchResult {
  total: number;
  items: EbayItemSummary[];
}

export interface EbaySearchOptions {
  query: string;
  limit?: number;
  marketplace?: 'EBAY_US' | 'EBAY_CA';
}
