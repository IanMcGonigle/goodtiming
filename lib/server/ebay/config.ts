import 'server-only';
import { EbayError } from './errors';

export type EbayEnvironment = 'sandbox' | 'production';
export interface EbayConfig {
  environment: EbayEnvironment;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

// Read lazily: public pages and builds do not require integration credentials.
export function getEbayConfig(): EbayConfig {
  const environment = process.env.EBAY_ENVIRONMENT;
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new EbayError('EBAY_ENVIRONMENT must be sandbox or production.');
  }
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new EbayError('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required.');
  }
  return {
    environment,
    baseUrl:
      environment === 'sandbox'
        ? 'https://api.sandbox.ebay.com'
        : 'https://api.ebay.com',
    clientId,
    clientSecret,
  };
}
