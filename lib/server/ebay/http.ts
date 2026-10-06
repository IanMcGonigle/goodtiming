import 'server-only';
import { EbayError } from './errors';

export async function ebayFetch(
  url: URL | string,
  init: RequestInit,
  operation: string,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Do not propagate transport errors that could contain sensitive request details.
    throw new EbayError(`eBay ${operation} request failed or timed out.`);
  }
}

export async function readJson(
  response: Response,
  operation: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new EbayError(
      `eBay ${operation} returned invalid JSON.`,
      response.status,
    );
  }
}
