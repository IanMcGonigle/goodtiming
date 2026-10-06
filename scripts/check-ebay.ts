import { existsSync } from 'node:fs';
import { getEbayConfig } from '../lib/server/ebay/config';
import { getApplicationToken } from '../lib/server/ebay/auth';
import {
  searchEbayResponse,
  getEbayItemDetails,
} from '../lib/server/ebay/client';
import { normalizeSearchResult } from '../lib/server/ebay/normalize';
import type { EbaySearchOptions } from '../lib/server/ebay/types';
import { EbayError } from '../lib/server/ebay/errors';
import {
  array,
  record,
  listingSummary,
  fieldCoverage,
} from './ebay-diagnostics';

async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const args = process.argv.slice(2);
  const explore = args.includes('--explore');
  const details = args.includes('--details');
  if (
    args.some(
      (arg) =>
        arg.startsWith('--') && !['--explore', '--details'].includes(arg),
    )
  )
    throw new EbayError('Supported flags: --explore and --details.');
  if (details && !explore) throw new EbayError('--details requires --explore.');
  const config = getEbayConfig();
  await getApplicationToken(config);
  console.log(
    JSON.stringify({
      environment: config.environment,
      marketplace: 'EBAY_US',
      oauth: 'succeeded',
      observedAt: new Date().toISOString(),
    }),
  );
  const searches: EbaySearchOptions[] = explore
    ? [
        { query: 'Omega Speedmaster' },
        { query: 'Seiko watch' },
        { query: 'vintage watch' },
        { query: 'automatic watch' },
        { query: 'watch', maxPrice: { value: 499.99, currency: 'USD' } },
      ]
    : [{ query: args.find((arg) => !arg.startsWith('--')) ?? 'watch' }];
  const allItems: unknown[] = [];
  const detailIds: string[] = [];
  for (const options of searches) {
    const raw = await searchEbayResponse({ ...options, limit: 3 });
    const normalized = normalizeSearchResult(raw);
    const items = array(record(raw).itemSummaries);
    allItems.push(...items);
    if (detailIds.length < 2 && normalized.items[0])
      detailIds.push(normalized.items[0].itemId);
    console.log(
      JSON.stringify(
        {
          query: options.query,
          maxPrice: options.maxPrice,
          total: normalized.total,
          returned: normalized.items.length,
          listings: items.map(listingSummary),
        },
        null,
        2,
      ),
    );
  }
  console.log(
    JSON.stringify(
      {
        searchSampleSize: allItems.length,
        searchFieldCoverage: fieldCoverage(allItems),
      },
      null,
      2,
    ),
  );
  if (details) {
    for (const itemId of detailIds) {
      const item = await getEbayItemDetails(itemId);
      console.log(
        JSON.stringify(
          {
            details: listingSummary(item),
            detailFieldCoverage: fieldCoverage([item]),
            aspectNames: array(record(item).localizedAspects)
              .map((aspect) => record(aspect).name)
              .filter((name) => typeof name === 'string'),
          },
          null,
          2,
        ),
      );
    }
  }
}
main().catch((error) => {
  console.error(
    error instanceof EbayError
      ? `${error.message}${error.status ? ` (HTTP ${error.status})` : ''}`
      : 'eBay check failed unexpectedly.',
  );
  process.exitCode = 1;
});
