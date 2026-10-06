import 'server-only';
import { getApplicationToken, invalidateApplicationToken } from './auth';
import { getEbayConfig } from './config';
import { EbayError } from './errors';
import { ebayFetch, readJson } from './http';
import { normalizeSearchResult } from './normalize';
import type { EbaySearchOptions, EbaySearchResult } from './types';

/** Raw response stays behind the server adapter; diagnostics inspect it without publishing it. */
export async function searchEbayResponse({
  query,
  limit = 5,
  marketplace = 'EBAY_US',
  maxPrice,
  buyingFormat,
}: EbaySearchOptions): Promise<unknown> {
  if (!query.trim() || query.length > 100)
    throw new EbayError('Search query must contain 1–100 characters.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 200)
    throw new EbayError('Search limit must be an integer between 1 and 200.');
  if (marketplace !== 'EBAY_US' && marketplace !== 'EBAY_CA')
    throw new EbayError('Unsupported eBay marketplace.');
  if (
    maxPrice &&
    (!Number.isFinite(maxPrice.value) ||
      maxPrice.value <= 0 ||
      !['USD', 'CAD'].includes(maxPrice.currency))
  )
    throw new EbayError(
      'Maximum price must be positive with USD or CAD currency.',
    );
  if (buyingFormat && !['FIXED_PRICE', 'AUCTION'].includes(buyingFormat))
    throw new EbayError('Unsupported buying format.');
  const filters = [];
  if (maxPrice)
    filters.push(
      `price:[..${maxPrice.value}],priceCurrency:${maxPrice.currency}`,
    );
  if (buyingFormat) filters.push(`buyingOptions:{${buyingFormat}}`);
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });
  if (filters.length) params.set('filter', filters.join(','));
  return requestBrowse(
    '/buy/browse/v1/item_summary/search',
    marketplace,
    params,
  );
}

export async function searchEbayItems(
  options: EbaySearchOptions,
): Promise<EbaySearchResult> {
  return normalizeSearchResult(await searchEbayResponse(options));
}

export async function getEbayItemDetails(
  itemId: string,
  marketplace: 'EBAY_US' | 'EBAY_CA' = 'EBAY_US',
): Promise<unknown> {
  if (!/^v1\|\d+\|\d+$/.test(itemId))
    throw new EbayError('Invalid Browse item ID.');
  return requestBrowse(
    `/buy/browse/v1/item/${encodeURIComponent(itemId)}`,
    marketplace,
    undefined,
    'item details',
  );
}

async function requestBrowse(
  path: string,
  marketplace: 'EBAY_US' | 'EBAY_CA',
  params?: URLSearchParams,
  operation = 'search',
): Promise<unknown> {
  const config = getEbayConfig();
  const url = new URL(path, config.baseUrl);
  if (params) url.search = params.toString();
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
      throw new EbayError(`eBay Browse ${operation} failed.`, response.status);
    return readJson(response, 'Browse');
  }
  throw new EbayError('eBay Browse authentication failed.');
}
