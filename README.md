# Good Timing

**Interesting watches. Found daily.**

Good Timing is an independent watch-discovery and affiliate publication at [goodtiming.ca](https://goodtiming.ca). It will curate a small selection of noteworthy online listings, from affordable oddities to modern icons and vintage finds.

## Current status

The first milestone is a polished, responsive launch homepage. Original CSS/SVG dial artwork, semantic content, reduced-motion support, canonical metadata, a favicon, and a generated Open Graph image establish the public foundation. A server-only eBay OAuth/Browse integration now supports separate Sandbox/Production keysets and a local Browse exploration command. Sandbox was verified; the latest Production attempt was rejected at OAuth with HTTP 401. There are no public listings, signup forms, ingestion jobs, persistence, or approval workflows yet.

## Stack and development

Next.js App Router, React, strict TypeScript, CSS Modules/native CSS, ESLint, and Prettier. Use Node.js 22.13+ (see `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No environment variables are needed. `.env.example` documents future server credentials; copy it to `.env.local` only when integrations are introduced. Never commit credentials or expose them through `NEXT_PUBLIC_` variables.

```sh
npm run lint          # ESLint, zero warnings
npm run typecheck     # Generate route types and check TypeScript
npm test              # Offline eBay integration tests (mocked HTTP)
npm run format:check  # Check formatting
npm run format       # Apply formatting
npm run build        # Production build
npm start            # Serve the production build locally
```

The eBay test suite uses Node’s test runner and mocked HTTP; it needs no credentials or network. It covers OAuth scope/headers, concurrent token reuse, expiry, environment/credential changes, failed requests, 401 recovery, input validation, normalization, and sanitized errors.

## Structure and future architecture

- `app/`: routes, root layout, styles, and metadata assets.
- `components/`: reusable presentation; currently the decorative dial.
- `lib/site.ts`: public brand/site constants.
- `lib/server/ebay/`: server-only configuration, OAuth, Browse HTTP client, minimal response types, and normalization.
- `scripts/check-ebay.ts`: local eBay smoke/exploration check; no public diagnostic endpoint.
- `types/`: domain modeling notes, ready for concrete shared types when listings arrive.
- `public/`: future static assets.

The homepage remains a Server Component; its animation needs no client JavaScript. System fonts avoid third-party font requests and build-time font downloads.

Introduce integrations and application logic in `lib/server/` as needed, using `import 'server-only'` to enforce the boundary. Add the official MongoDB Node.js driver only when persistence is implemented. Keep browser-safe domain types separate from database and API transport types.

Future milestones will retrieve eBay Browse API candidates, persist them in MongoDB, filter and score deterministically, evaluate a reduced set with AI, and propose approximately 1–5 watches per day to a private approval dashboard. **Human approval is required before publication.** Affiliate tracking and platform-specific social content follow later. The planned listing lifecycle is documented in `types/README.md`; none of this pipeline is implemented yet.

## Deployment

Target: **Netlify**. Its current Next.js adapter supports the App Router and automatically configures framework support: [Netlify Next.js documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). No custom `netlify.toml`, adapter pin, static export, or Vercel-specific API is needed.

When deployment is authorized, connect the GitHub repository in Netlify, use Node.js 22.13+, and accept detected Next.js settings (`npm run build`, `.next`). Production metadata assumes `https://goodtiming.ca`. No accounts, resources, domains, or deployments have been configured by this implementation.

## eBay configuration and checks

Use separate keysets in your ignored `.env.local`:

```dotenv
EBAY_ENVIRONMENT=production
EBAY_SANDBOX_CLIENT_ID=<Sandbox App ID>
EBAY_SANDBOX_CLIENT_SECRET=<Sandbox Cert ID>
EBAY_PRODUCTION_CLIENT_ID=<Production App ID>
EBAY_PRODUCTION_CLIENT_SECRET=<Production Cert ID>
```

Only the selected environment’s pair is required. Endpoint and keyset selection switch together. Missing/invalid environments or missing selected credentials fail explicitly; there is no cross-environment or legacy `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET` fallback. The homepage and build do not require any eBay variables. `.env.local` is never tracked, while `.env.example` contains only empty credential placeholders.

```sh
npm run ebay:check                      # One small search in the selected environment
npm run ebay:check -- "Seiko watch"       # One custom query
npm run ebay:check -- --explore           # Five searches, three results per query
npm run ebay:check -- --explore --details # Also inspect two selected item details
EBAY_ENVIRONMENT=sandbox npm run ebay:check
```

The CLI loads `.env.local` with Node’s environment loader; existing shell variables take precedence. Exploration searches Omega Speedmaster, Seiko watch, vintage watch, automatic watch, and `watch` with `price:[..499.99],priceCurrency:USD`. This is under **USD** $500, not CAD, and does not include shipping/tax. Marketplace is explicitly `EBAY_US`. No pagination or large ingestion occurs. OAuth is checked once before search; its token is reused for subsequent requests. `--details` adds at most two item calls to distinguish observed search fields from observed detail fields.

Output whitelists concise listing summaries and field-presence counts: title, price, condition, seller feedback, buying options, shipping, location, item ID, normal item URL with query/hash tracking removed, and selected watch aspects from details. Field counts describe this small sample, not guaranteed API availability. Affiliate URL **presence** is counted, but affiliate URLs are neither printed nor used. No authorization headers, credentials, tokens, or raw responses/errors are printed. Errors exit nonzero with sanitized messages and HTTP status; OAuth 401 requires checking the selected App ID/Cert ID pair or its account status, Browse 403 can indicate access restrictions, and 429 indicates rate limiting.

OAuth still uses the client credentials grant and `https://api.ebay.com/oauth/api_scope`. Tokens remain in process memory, concurrent mint requests are deduplicated, expiry includes a safety margin, and Browse retries once after 401. The cache compares environment and both credential values, preventing token reuse when either changes. Failed mint requests can retry on the next call. There is no persistent cache; separate Netlify processes/cold starts have separate caches. Native fetch has a 15-second timeout, no HTTP caching, and redirects are rejected.

`searchEbayItems` preserves the small normalized projection: total, item ID, title, optional price/currency. Search options now also support `maxPrice` (USD/CAD) and an explicit buying format. Server-only `searchEbayResponse` and `getEbayItemDetails` return unknown raw data for diagnostics; callers must validate it, and it never forms a browser or domain model. There is no implemented `WatchListing` model yet, only `types/README.md` planning notes. No schema expansion was made without real Production observations.

`server-only` enforces Next.js browser boundaries. `tsx` is development tooling for executing TypeScript scripts/tests; commands enable the `react-server` condition so the same guarded modules can run outside Next.js. No public API route or homepage UI was added.

References: [eBay OAuth/client credentials](https://developer.ebay.com/develop/guides/sell/authorization) and [Browse API](https://developer.ebay.com/api-docs/buy/static/api-browse.html).

### Verification notes

The initial live Sandbox check succeeded: two searches for `watch`, 44 total matches, three returned items per call. Inventory counts can change. Offline tests, lint, type checking, formatting, and the production build are the repeatable checks.

Local Node 22.7 is below the documented 22.13+ tooling requirement and produces engine/experimental JSON warnings; upgrade Node before regular development. The dependency audit currently reports five high-severity entries from one existing development-only ESLint dependency chain (`braces` → `micromatch` → `fast-glob` → Next ESLint packages). npm proposes a major downgrade of `eslint-config-next`; it was not applied as part of this integration. Reassess when the upstream lint dependency has a compatible fix.

## Production discovery findings

On 2026-10-06, the selected environment was Production, both named credential pairs were present, and no shell variable overrides were present. The request reached the Production OAuth endpoint but returned **HTTP 401**. No Browse or item-detail calls were made after authentication failed. Query counts, listing examples, actual field coverage, and affiliate URL observations are therefore **unavailable**, not zero. Run the exploration command after correcting the matching Production App ID/Cert ID or resolving account access. No scraping or mock results substitute for live verification.

Documentation-based expectations, **not observed Production findings**:

- Search provides listing summaries; full aspects and returns information should be investigated with `getItem`. Watch brand/model/reference/case size/movement/year may be localized seller-provided aspects, inconsistently completed—not dependable dedicated fields.
- Search price filtering requires an explicit currency. Search results can contain irrelevant accessories, parts, or non-watch products; future discovery should investigate wristwatch categories and aspects before ranking.
- Buying options and bid fields vary by listing format. Broad searches are not enough to characterize auctions; explicitly request auctions in a later small check. A current bid is not a fixed purchase price.
- Shipping is destination-dependent. This probe uses US marketplace defaults and cannot establish Canadian delivery or landed cost. Missing shipping cost is not free shipping.
- Returns/authenticity flags are conditional; missing flags do not establish authenticity or policy. Seller feedback is useful evidence, not authentication of a watch.

The eventual persistence model should start with source/environment/marketplace and item ID, title, decimal money and currency, normal URL, primary image, condition, seller feedback snapshot, buying options, optional shipping/location, and discovery/last-checked timestamps. Add auction state/end time only for an auction feature. Enrich a reduced candidate set with detail aspects, additional images, returns, and authenticity flags once verified. Keep absent fields nullable/optional and preserve provenance; never promote seller assertions to verified brand/model/authenticity. Workflow/publication fields remain separate from the eBay adapter.

References: [Browse overview](https://developer.ebay.com/api-docs/buy/api-browse.html), [price/buying filters](https://developer.ebay.com/api-docs/buy/static/ref-buy-browse-filters.html). These support investigation planning, not claims about responses that were not obtained.
