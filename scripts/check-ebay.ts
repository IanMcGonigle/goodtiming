import { existsSync } from 'node:fs';
import { getEbayConfig } from '../lib/server/ebay/config';
import { searchEbayItems } from '../lib/server/ebay/client';
import { EbayError } from '../lib/server/ebay/errors';

async function main() {
  // Node's env loader keeps credentials out of shell arguments and tool output.
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  if (getEbayConfig().environment !== 'sandbox') {
    throw new EbayError('The smoke check requires EBAY_ENVIRONMENT=sandbox.');
  }
  const query = process.argv[2] ?? 'watch';
  const first = await searchEbayItems({ query, limit: 3 });
  const second = await searchEbayItems({ query, limit: 3 });
  console.log(
    JSON.stringify(
      {
        environment: 'sandbox',
        marketplace: 'EBAY_US',
        successfulSearches: 2,
        total: first.total,
        returnedItems: first.items.length,
        secondReturnedItems: second.items.length,
      },
      null,
      2,
    ),
  );
  if (first.items.length === 0)
    console.log('Browse succeeded; this query returned no Sandbox listings.');
}

main().catch((error) => {
  // Never dump an arbitrary exception, upstream body, credentials, or access token.
  console.error(
    error instanceof EbayError
      ? `${error.message}${error.status ? ` (HTTP ${error.status})` : ''}`
      : 'Sandbox check failed unexpectedly.',
  );
  process.exitCode = 1;
});
