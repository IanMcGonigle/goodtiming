import 'server-only';
import { getEbayConfig, type EbayConfig } from './config';
import { EbayError } from './errors';
import { ebayFetch, readJson } from './http';

const BROWSE_SCOPE = 'https://api.ebay.com/oauth/api_scope';
interface Token {
  value: string;
  expiresAt: number;
}
interface CacheEntry {
  config: EbayConfig;
  token?: Token;
  pending?: Promise<Token>;
}
let cache: CacheEntry | undefined;

function entryFor(config: EbayConfig): CacheEntry {
  if (
    !cache ||
    cache.config.environment !== config.environment ||
    cache.config.clientId !== config.clientId ||
    cache.config.clientSecret !== config.clientSecret
  ) {
    cache = { config };
  }
  return cache;
}

async function mintToken(config: EbayConfig): Promise<Token> {
  const startedAt = Date.now();
  const response = await ebayFetch(
    `${config.baseUrl}/identity/v1/oauth2/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: BROWSE_SCOPE,
      }),
    },
    'OAuth',
  );
  if (!response.ok)
    throw new EbayError(
      'eBay OAuth rejected the application token request.',
      response.status,
    );
  const body = await readJson(response, 'OAuth');
  if (
    !body ||
    typeof body !== 'object' ||
    !('access_token' in body) ||
    typeof body.access_token !== 'string' ||
    !body.access_token.trim() ||
    !('expires_in' in body) ||
    typeof body.expires_in !== 'number' ||
    !Number.isFinite(body.expires_in) ||
    body.expires_in <= 0
  ) {
    throw new EbayError('eBay OAuth returned an invalid token response.');
  }
  // Allow for network time and clock skew; short-lived tokens keep a proportional margin.
  const margin = Math.min(60, body.expires_in * 0.1);
  const expiresAt = startedAt + (body.expires_in - margin) * 1000;
  if (expiresAt <= Date.now())
    throw new EbayError(
      'eBay OAuth returned a token with insufficient remaining lifetime.',
    );
  return { value: body.access_token, expiresAt };
}

export async function getApplicationToken(
  config = getEbayConfig(),
): Promise<string> {
  const entry = entryFor(config);
  if (entry.token && entry.token.expiresAt > Date.now())
    return entry.token.value;
  // Share one mint request across concurrent callers; clear failures so the next call can retry.
  if (!entry.pending) {
    entry.pending = mintToken(config)
      .then((token) => {
        entry.token = token;
        return token;
      })
      .finally(() => {
        entry.pending = undefined;
      });
  }
  return (await entry.pending).value;
}

export function invalidateApplicationToken(rejectedToken: string): void {
  // A late 401 for an older token must not evict a newly minted one.
  if (cache?.token?.value === rejectedToken) cache.token = undefined;
}
