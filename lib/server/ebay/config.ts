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
  const prefix = environment === 'sandbox' ? 'EBAY_SANDBOX' : 'EBAY_PRODUCTION';
  const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  if (!clientId || !clientSecret) {
    throw new EbayError(
      `${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET are required for ${environment}.`,
    );
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
