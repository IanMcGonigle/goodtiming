import 'server-only';
import { createHash } from 'node:crypto';

export const MARKETPLACE_DELETION_ENDPOINT =
  'https://goodtiming.ca/api/ebay/marketplace-account-deletion';

interface DeletionConfig {
  verificationToken: string;
  endpoint: string;
}

/** Lazy, independent of Browse credentials, and strict about the exact registered URL. */
export function getDeletionConfig(): DeletionConfig {
  const verificationToken =
    process.env.EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_MARKETPLACE_DELETION_ENDPOINT;
  if (
    !verificationToken ||
    verificationToken !== verificationToken.trim() ||
    !/^[A-Za-z0-9_-]{32,80}$/.test(verificationToken) ||
    endpoint !== MARKETPLACE_DELETION_ENDPOINT
  ) {
    // Never include configuration values in exceptions or HTTP responses.
    throw new Error(
      'Marketplace deletion endpoint configuration is unavailable.',
    );
  }
  return { verificationToken, endpoint };
}

export function createDeletionChallengeResponse(
  challenge: string,
  config: DeletionConfig,
): string {
  return createHash('sha256')
    .update(challenge + config.verificationToken + config.endpoint, 'utf8')
    .digest('hex');
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function timestamp(value: unknown): boolean {
  return (
    nonemptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

/** Shape validation only. This does not authenticate an eBay sender or perform deletion. */
export function isMarketplaceDeletionNotification(value: unknown): boolean {
  if (
    !record(value) ||
    !record(value.metadata) ||
    value.metadata.topic !== 'MARKETPLACE_ACCOUNT_DELETION' ||
    !record(value.notification)
  )
    return false;
  const notification = value.notification;
  if (
    !nonemptyString(notification.notificationId) ||
    !timestamp(notification.eventDate) ||
    !timestamp(notification.publishDate) ||
    !Number.isSafeInteger(notification.publishAttemptCount) ||
    (notification.publishAttemptCount as number) < 1 ||
    !record(notification.data)
  )
    return false;
  const data = notification.data;
  const identifiers = ['userId', 'username', 'eiasToken'] as const;
  // At least one usable identifier, but no specific identifier is assumed mandatory.
  return (
    identifiers.some((key) => nonemptyString(data[key])) &&
    identifiers.every(
      (key) => data[key] === undefined || nonemptyString(data[key]),
    )
  );
}

export class NotificationBodyError extends Error {
  constructor(public readonly status: 400 | 413) {
    super('Invalid notification body.');
  }
}

/** Count actual streamed bytes; Content-Length alone is not a trustworthy size limit. */
export async function readNotificationBody(request: Request): Promise<unknown> {
  const maxBytes = 64 * 1024;
  const reader = request.body?.getReader();
  if (!reader) throw new NotificationBodyError(400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new NotificationBodyError(413);
      }
      chunks.push(value);
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof NotificationBodyError) throw error;
    throw new NotificationBodyError(400);
  } finally {
    reader.releaseLock();
  }
}
