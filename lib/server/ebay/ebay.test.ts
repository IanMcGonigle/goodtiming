import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { getApplicationToken, invalidateApplicationToken } from './auth';
import { searchEbayItems } from './client';
import { getEbayConfig } from './config';
import { EbayError } from './errors';
import { normalizeSearchResult } from './normalize';

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const keys = [
  'EBAY_ENVIRONMENT',
  'EBAY_CLIENT_ID',
  'EBAY_CLIENT_SECRET',
] as const;
const originalEnv = Object.fromEntries(
  keys.map((key) => [key, process.env[key]]),
);
let sequence = 0;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const token = (value = 'test-token', expires = 7200) =>
  json({ access_token: value, expires_in: expires });
const results = {
  total: 1,
  itemSummaries: [
    {
      itemId: 'v1|123|0',
      title: 'Test watch',
      price: { value: '120.00', currency: 'USD' },
    },
  ],
};

beforeEach(() => {
  process.env.EBAY_ENVIRONMENT = 'sandbox';
  process.env.EBAY_CLIENT_ID = `test-client-${++sequence}`;
  process.env.EBAY_CLIENT_SECRET = 'test-secret';
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  for (const key of keys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test('OAuth uses Sandbox Basic credentials and the Browse scope; concurrent callers share a token', async () => {
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(
      String(url),
      'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
    );
    assert.equal(init?.method, 'POST');
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.redirect, 'error');
    const headers = new Headers(init?.headers);
    assert.equal(
      headers.get('Authorization'),
      `Basic ${Buffer.from(`${process.env.EBAY_CLIENT_ID}:test-secret`).toString('base64')}`,
    );
    assert.equal(
      headers.get('Content-Type'),
      'application/x-www-form-urlencoded',
    );
    const body = new URLSearchParams(String(init?.body));
    assert.equal(body.get('grant_type'), 'client_credentials');
    assert.equal(body.get('scope'), 'https://api.ebay.com/oauth/api_scope');
    await Promise.resolve();
    return token();
  };
  const values = await Promise.all(
    Array.from({ length: 5 }, () => getApplicationToken()),
  );
  assert.deepEqual(values, Array(5).fill('test-token'));
  assert.equal(await getApplicationToken(), 'test-token');
  assert.equal(calls, 1);
});

test('expires with a safety margin and renews without a refresh token', async () => {
  let now = 1_000_000;
  Date.now = () => now;
  let calls = 0;
  globalThis.fetch = async () => token(`token-${++calls}`, 120);
  assert.equal(await getApplicationToken(), 'token-1');
  now += 107_000;
  assert.equal(await getApplicationToken(), 'token-1');
  now += 1_000;
  assert.equal(await getApplicationToken(), 'token-2');
  invalidateApplicationToken('token-1');
  assert.equal(await getApplicationToken(), 'token-2');
  assert.equal(calls, 2);
});

test('environment and credential changes cannot reuse an old token', async () => {
  const urls: string[] = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return token(`token-${urls.length}`);
  };
  await getApplicationToken();
  process.env.EBAY_ENVIRONMENT = 'production';
  assert.equal(await getApplicationToken(), 'token-2');
  process.env.EBAY_CLIENT_SECRET = 'rotated-test-secret';
  assert.equal(await getApplicationToken(), 'token-3');
  assert.deepEqual(urls, [
    'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
    'https://api.ebay.com/identity/v1/oauth2/token',
    'https://api.ebay.com/identity/v1/oauth2/token',
  ]);
});

test('failed OAuth requests clear the pending promise and redact upstream details', async () => {
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls === 1 ? json({ error: 'test-secret test-token' }, 401) : token();
  await assert.rejects(
    getApplicationToken(),
    (error) =>
      error instanceof EbayError &&
      error.status === 401 &&
      !error.message.includes('test-secret') &&
      !error.message.includes('test-token'),
  );
  assert.equal(await getApplicationToken(), 'test-token');
  assert.equal(calls, 2);
});

test('malformed OAuth responses are rejected', async () => {
  for (const body of [
    { access_token: '', expires_in: 7200 },
    { access_token: 'test-token', expires_in: 0 },
    { access_token: 'test-token', expires_in: '7200' },
    null,
  ]) {
    globalThis.fetch = async () => json(body);
    await assert.rejects(getApplicationToken(), /invalid token response/);
  }
  globalThis.fetch = async () => new Response('not JSON');
  await assert.rejects(getApplicationToken(), /invalid JSON/);
});

test('Browse encodes query, sets marketplace and Bearer token, and validates results', async () => {
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    if (String(url).includes('/oauth2/')) return token();
    const parsed = new URL(String(url));
    assert.equal(parsed.origin, 'https://api.sandbox.ebay.com');
    assert.equal(parsed.pathname, '/buy/browse/v1/item_summary/search');
    assert.equal(parsed.searchParams.get('q'), 'watch & vintage');
    assert.equal(parsed.searchParams.get('limit'), '3');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Authorization'), 'Bearer test-token');
    assert.equal(headers.get('X-EBAY-C-MARKETPLACE-ID'), 'EBAY_CA');
    return json(results);
  };
  assert.deepEqual(
    await searchEbayItems({
      query: 'watch & vintage',
      limit: 3,
      marketplace: 'EBAY_CA',
    }),
    { total: 1, items: results.itemSummaries },
  );
  await searchEbayItems({
    query: 'watch & vintage',
    limit: 3,
    marketplace: 'EBAY_CA',
  });
  assert.equal(calls, 3);
});

test('Browse renews on 401 once and does not loop on repeated rejection', async () => {
  let oauth = 0;
  let browse = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/oauth2/')) return token(`token-${++oauth}`);
    return ++browse === 1 ? json({}, 401) : json(results);
  };
  await searchEbayItems({ query: 'watch' });
  assert.equal(oauth, 2);
  assert.equal(browse, 2);
  globalThis.fetch = async (url) => {
    if (String(url).includes('/oauth2/')) return token(`token-${++oauth}`);
    browse++;
    return json({}, 401);
  };
  await assert.rejects(
    searchEbayItems({ query: 'watch' }),
    (error) => error instanceof EbayError && error.status === 401,
  );
  assert.equal(browse, 4);
});

test('Browse preserves HTTP status without exposing response bodies; network errors are sanitized', async () => {
  for (const status of [403, 429, 500]) {
    globalThis.fetch = async (url) =>
      String(url).includes('/oauth2/')
        ? token()
        : json({ message: 'test-secret test-token' }, status);
    await assert.rejects(
      searchEbayItems({ query: 'watch' }),
      (error) =>
        error instanceof EbayError &&
        error.status === status &&
        error.message === 'eBay Browse search failed.',
    );
  }
  globalThis.fetch = async () => {
    throw new Error('test-secret test-token');
  };
  await assert.rejects(
    searchEbayItems({ query: 'watch' }),
    /eBay Browse request failed or timed out/,
  );
});

test('configuration and search input fail before network access', async () => {
  globalThis.fetch = async () => {
    assert.fail('must not call network');
  };
  for (const value of [undefined, '', 'typo']) {
    if (value === undefined) delete process.env.EBAY_ENVIRONMENT;
    else process.env.EBAY_ENVIRONMENT = value;
    assert.throws(getEbayConfig, /EBAY_ENVIRONMENT/);
  }
  process.env.EBAY_ENVIRONMENT = 'sandbox';
  delete process.env.EBAY_CLIENT_SECRET;
  assert.throws(getEbayConfig, /EBAY_CLIENT_ID and EBAY_CLIENT_SECRET/);
  for (const options of [
    { query: '' },
    { query: ' '.repeat(3) },
    { query: 'w'.repeat(101) },
    { query: 'watch', limit: 0 },
    { query: 'watch', limit: 201 },
    { query: 'watch', limit: 1.5 },
  ]) {
    await assert.rejects(searchEbayItems(options), EbayError);
  }
});

test('normalization accepts empty Sandbox results and rejects malformed items', () => {
  assert.deepEqual(normalizeSearchResult({ total: 0 }), {
    total: 0,
    items: [],
  });
  for (const body of [
    {},
    { total: -1 },
    { total: 1 },
    { total: 1, itemSummaries: [{}] },
    {
      total: 1,
      itemSummaries: [
        { itemId: 'id', title: 'watch', price: { value: 12, currency: 'USD' } },
      ],
    },
  ]) {
    assert.throws(() => normalizeSearchResult(body), EbayError);
  }
});
