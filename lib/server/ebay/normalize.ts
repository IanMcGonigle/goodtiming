import 'server-only';
import { EbayError } from './errors';
import type { EbayItemSummary, EbaySearchResult } from './types';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeSearchResult(body: unknown): EbaySearchResult {
  if (
    !record(body) ||
    typeof body.total !== 'number' ||
    !Number.isSafeInteger(body.total) ||
    body.total < 0 ||
    (body.itemSummaries !== undefined && !Array.isArray(body.itemSummaries)) ||
    (body.total > 0 && body.itemSummaries === undefined)
  ) {
    throw new EbayError('eBay Browse returned an invalid search response.');
  }
  const items: EbayItemSummary[] = (body.itemSummaries ?? []).map(
    (item: unknown) => {
      if (
        !record(item) ||
        typeof item.itemId !== 'string' ||
        !item.itemId ||
        typeof item.title !== 'string' ||
        !item.title
      ) {
        throw new EbayError('eBay Browse returned an invalid item summary.');
      }
      let price: EbayItemSummary['price'];
      if (item.price !== undefined) {
        if (
          !record(item.price) ||
          typeof item.price.value !== 'string' ||
          typeof item.price.currency !== 'string'
        ) {
          throw new EbayError('eBay Browse returned an invalid item price.');
        }
        price = { value: item.price.value, currency: item.price.currency };
      }
      return {
        itemId: item.itemId,
        title: item.title,
        ...(price ? { price } : {}),
      };
    },
  );
  return { total: body.total, items };
}
