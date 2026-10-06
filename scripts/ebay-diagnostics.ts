/** Whitelisted listing diagnostics only: never dump a raw response or request. */
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
function money(value: unknown) {
  const item = record(value);
  return text(item.value) && text(item.currency)
    ? `${item.value} ${item.currency}`
    : undefined;
}
export function cleanItemUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !/^(www\.)?ebay\.(com|ca)$/.test(url.hostname) ||
      !/^\/itm\//.test(url.pathname)
    )
      return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}
export const inspectedPaths = [
  'itemId',
  'title',
  'price.value',
  'price.currency',
  'condition',
  'conditionId',
  'image.imageUrl',
  'additionalImages',
  'thumbnailImages',
  'itemWebUrl',
  'itemAffiliateWebUrl',
  'seller.username',
  'seller.feedbackScore',
  'seller.feedbackPercentage',
  'buyingOptions',
  'bidCount',
  'currentBidPrice',
  'shippingOptions',
  'shippingOptions.shippingCost',
  'shippingOptions.shippingCostType',
  'shippingOptions.type',
  'itemLocation',
  'itemLocation.country',
  'itemCreationDate',
  'itemOriginDate',
  'itemEndDate',
  'categories',
  'categoryId',
  'categoryPath',
  'localizedAspects',
  'brand',
  'model',
  'referenceNumber',
  'caseSize',
  'movement',
  'year',
  'authenticityGuarantee',
  'authenticityVerification',
  'returnTerms',
] as const;
function valuesAt(value: unknown, parts: string[]): unknown[] {
  if (!parts.length) return [value];
  if (Array.isArray(value))
    return value.flatMap((item) => valuesAt(item, parts));
  return valuesAt(record(value)[parts[0]], parts.slice(1));
}
export function fieldCoverage(items: unknown[]) {
  return Object.fromEntries(
    inspectedPaths.map((path) => [
      path,
      items.filter((item) =>
        valuesAt(item, path.split('.')).some(
          (value) =>
            value !== undefined &&
            value !== null &&
            (!Array.isArray(value) || value.length > 0),
        ),
      ).length,
    ]),
  );
}
export function listingSummary(value: unknown) {
  const item = record(value);
  const seller = record(item.seller);
  const location = record(item.itemLocation);
  const watchAspects = array(item.localizedAspects)
    .map(record)
    .filter(
      (aspect) =>
        typeof aspect.name === 'string' &&
        /brand|model|reference|case size|movement|year|manufactur|authentic/i.test(
          aspect.name,
        ),
    )
    .map((aspect) => ({ name: text(aspect.name), value: text(aspect.value) }));
  return {
    itemId: text(item.itemId),
    title: text(item.title),
    price: money(item.price),
    condition: text(item.condition),
    seller: {
      username: text(seller.username),
      feedbackScore:
        typeof seller.feedbackScore === 'number'
          ? seller.feedbackScore
          : undefined,
      feedbackPercentage: text(seller.feedbackPercentage),
    },
    buyingOptions: array(item.buyingOptions).filter(
      (option) => typeof option === 'string',
    ),
    shipping: array(item.shippingOptions)
      .map(record)
      .map((option) => ({
        cost: money(option.shippingCost),
        costType: text(option.shippingCostType),
        type: text(option.type),
      })),
    location: { city: text(location.city), country: text(location.country) },
    url: cleanItemUrl(item.itemWebUrl),
    additionalImageCount: array(item.additionalImages).length,
    categories: array(item.categories)
      .map(record)
      .map((category) => ({
        id: text(category.categoryId),
        name: text(category.categoryName),
      })),
    watchAspects,
    authenticityFieldsPresent: [
      'authenticityGuarantee',
      'authenticityVerification',
    ].filter((key) => item[key] !== undefined),
    returns:
      item.returnTerms === undefined
        ? undefined
        : {
            accepted: record(item.returnTerms).returnsAccepted,
            period: record(record(item.returnTerms).returnPeriod).value,
            unit: text(record(record(item.returnTerms).returnPeriod).unit),
            shippingCostPayer: text(
              record(item.returnTerms).returnShippingCostPayer,
            ),
          },
  };
}
