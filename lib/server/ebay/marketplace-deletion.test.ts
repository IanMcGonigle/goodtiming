import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { createHash } from 'node:crypto';
import {
  GET,
  POST,
} from '../../../app/api/ebay/marketplace-account-deletion/route';
import {
  getDeletionConfig,
  MARKETPLACE_DELETION_ENDPOINT,
} from './marketplace-deletion';

const tokenKey = 'EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN';
const endpointKey = 'EBAY_MARKETPLACE_DELETION_ENDPOINT';
const originalToken = process.env[tokenKey];
const originalEndpoint = process.env[endpointKey];
const token = 'test-verification_token-1234567890';
const payload = {
  metadata: { topic: 'MARKETPLACE_ACCOUNT_DELETION', schemaVersion: '1.0' },
  notification: {
    notificationId: 'test-notification',
    eventDate: '2026-10-06T12:00:00.000Z',
    publishDate: '2026-10-06T12:00:01.000Z',
    publishAttemptCount: 1,
    data: { userId: 'test-immutable-id' },
  },
};
const getRequest = (query = '?challenge_code=sample') =>
  new Request(
    `https://untrusted.example/api/ebay/marketplace-account-deletion${query}`,
    { headers: { 'x-forwarded-host': 'spoofed.example' } },
  );
const postRequest = (body: unknown = payload) =>
  new Request(MARKETPLACE_DELETION_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  process.env[tokenKey] = token;
  process.env[endpointKey] = MARKETPLACE_DELETION_ENDPOINT;
});
afterEach(() => {
  if (originalToken === undefined) delete process.env[tokenKey];
  else process.env[tokenKey] = originalToken;
  if (originalEndpoint === undefined) delete process.env[endpointKey];
  else process.env[endpointKey] = originalEndpoint;
});

test('GET hashes exact UTF-8 concatenation with configured URL, independent of request headers', async () => {
  const challenge = 'example + café';
  const response = GET(
    getRequest(`?challenge_code=${encodeURIComponent(challenge)}`),
  );
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('content-type') ?? '',
    /^application\/json/,
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const expected = createHash('sha256')
    .update(challenge)
    .update(token)
    .update(MARKETPLACE_DELETION_ENDPOINT)
    .digest('hex');
  assert.deepEqual(await response.json(), { challengeResponse: expected });
  assert.match(expected, /^[0-9a-f]{64}$/);
});

test('GET rejects absent, empty, whitespace-only and duplicate challenges', () => {
  for (const query of [
    '',
    '?challenge_code=',
    '?challenge_code=%20',
    '?challenge_code=a&challenge_code=b',
  ])
    assert.equal(GET(getRequest(query)).status, 400);
});

test('configuration validates token length/alphabet without trimming or disclosing values', async () => {
  for (const invalid of [
    '',
    'a'.repeat(31),
    'a'.repeat(81),
    'a'.repeat(31) + '!',
    ' ' + token,
    token + '\n',
  ]) {
    process.env[tokenKey] = invalid;
    assert.throws(getDeletionConfig);
    const response = GET(getRequest());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'Notification endpoint is not configured.',
    });
    assert.equal((await POST(postRequest())).status, 503);
  }
  for (const valid of ['a'.repeat(32), 'Z_-9'.repeat(20)]) {
    process.env[tokenKey] = valid;
    assert.doesNotThrow(getDeletionConfig);
  }
  delete process.env[tokenKey];
  assert.equal(GET(getRequest()).status, 503);
});

test('endpoint configuration requires the exact HTTPS registration URL', () => {
  for (const value of [
    '',
    MARKETPLACE_DELETION_ENDPOINT + '/',
    MARKETPLACE_DELETION_ENDPOINT + '?x=1',
    'http://goodtiming.ca/api/ebay/marketplace-account-deletion',
    'https://localhost/api/ebay/marketplace-account-deletion',
  ]) {
    process.env[endpointKey] = value;
    assert.equal(GET(getRequest()).status, 503);
  }
  delete process.env[endpointKey];
  assert.throws(getDeletionConfig);
});

test('POST acknowledges a valid notification with any supported identifier, including retries', async () => {
  for (const data of [
    { userId: 'test-id' },
    { username: 'test-name' },
    { eiasToken: 'test-eias' },
  ]) {
    const response = await POST(
      postRequest({
        ...payload,
        notification: { ...payload.notification, publishAttemptCount: 2, data },
      }),
    );
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('POST rejects wrong topics, invalid envelope/date/count and absent or malformed identifiers', async () => {
  const invalid = [
    null,
    [],
    {},
    { ...payload, metadata: { topic: 'OTHER' } },
    ...[
      { notificationId: '' },
      { eventDate: 'bad' },
      { publishDate: '' },
      { publishAttemptCount: 0 },
      { publishAttemptCount: 1.5 },
      { data: {} },
      { data: { userId: 5 } },
      { data: { username: ' ' } },
    ].map((change) => ({
      ...payload,
      notification: { ...payload.notification, ...change },
    })),
  ];
  for (const body of invalid)
    assert.equal((await POST(postRequest(body))).status, 400);
});

test('POST rejects wrong content type, malformed JSON, and streamed bodies exceeding 64 KiB', async () => {
  const wrongType = new Request(MARKETPLACE_DELETION_ENDPOINT, {
    method: 'POST',
    body: '{}',
  });
  assert.equal((await POST(wrongType)).status, 415);
  const malformed = new Request(MARKETPLACE_DELETION_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal((await POST(malformed)).status, 400);
  const huge = new Request(MARKETPLACE_DELETION_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': '10' },
    body: ' '.repeat(65537),
  });
  assert.equal((await POST(huge)).status, 413);
});
