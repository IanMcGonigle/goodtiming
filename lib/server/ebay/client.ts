import 'server-only';
import { getApplicationToken, invalidateApplicationToken } from './auth';
import { getEbayConfig } from './config';
import { EbayError } from './errors';
import { ebayFetch, readJson } from './http';
import { normalizeSearchResult } from './normalize';
import type { EbaySearchOptions, EbaySearchResult } from './types';

export async function searchEbayItems({
  query,
  limit = 5,
  marketplace = 'EBAY_US',
}: EbaySearchOptions): Promise<EbaySearchResult> {
  if (!query.trim() || query.length > 100)
    throw new EbayError('Search query must contain 1–100 characters.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 200)
    throw new EbayError('Search limit must be an integer between 1 and 200.');
  if (marketplace !== 'EBAY_US' && marketplace !== 'EBAY_CA')
    throw new EbayError('Unsupported eBay marketplace.');
  const config = getEbayConfig();
  const url = new URL('/buy/browse/v1/item_summary/search', config.baseUrl);
  url.search = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  }).toString();
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getApplicationToken(config);
    const response = await ebayFetch(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': marketplace,
          Accept: 'application/json',
        },
      },
      'Browse',
    );
    if (response.status === 401) {
      invalidateApplicationToken(token);
      if (attempt === 0) continue;
    }
    if (!response.ok)
      throw new EbayError('eBay Browse search failed.', response.status);
    return normalizeSearchResult(await readJson(response, 'Browse'));
  }
  throw new EbayError('eBay Browse authentication failed.');
}
