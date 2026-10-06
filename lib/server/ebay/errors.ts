import 'server-only';

/** Messages are generated locally; upstream bodies and request headers are never attached. */
export class EbayError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'EbayError';
  }
}
