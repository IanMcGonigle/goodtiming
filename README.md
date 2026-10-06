# Good Timing

**Interesting watches. Found daily.**

Good Timing is an independent watch-discovery and affiliate publication at [goodtiming.ca](https://goodtiming.ca). It will curate a small selection of noteworthy online listings, from affordable oddities to modern icons and vintage finds.

## Current status

The first milestone is a polished, responsive launch homepage. Original CSS/SVG dial artwork, semantic content, reduced-motion support, canonical metadata, a favicon, and a generated Open Graph image establish the public foundation. A server-only eBay OAuth/Browse integration now proves Sandbox access through a local command-line check. There are no public listings, signup forms, ingestion jobs, persistence, or approval workflows yet.

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
- `scripts/check-ebay.ts`: local Sandbox smoke check; no public diagnostic endpoint.
- `types/`: domain modeling notes, ready for concrete shared types when listings arrive.
- `public/`: future static assets.

The homepage remains a Server Component; its animation needs no client JavaScript. System fonts avoid third-party font requests and build-time font downloads.

Introduce integrations and application logic in `lib/server/` as needed, using `import 'server-only'` to enforce the boundary. Add the official MongoDB Node.js driver only when persistence is implemented. Keep browser-safe domain types separate from database and API transport types.

Future milestones will retrieve eBay Browse API candidates, persist them in MongoDB, filter and score deterministically, evaluate a reduced set with AI, and propose approximately 1–5 watches per day to a private approval dashboard. **Human approval is required before publication.** Affiliate tracking and platform-specific social content follow later. The planned listing lifecycle is documented in `types/README.md`; none of this pipeline is implemented yet.

## Deployment

Target: **Netlify**. Its current Next.js adapter supports the App Router and automatically configures framework support: [Netlify Next.js documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). No custom `netlify.toml`, adapter pin, static export, or Vercel-specific API is needed.

When deployment is authorized, connect the GitHub repository in Netlify, use Node.js 22.13+, and accept detected Next.js settings (`npm run build`, `.next`). Production metadata assumes `https://goodtiming.ca`. No accounts, resources, domains, or deployments have been configured by this implementation.

## eBay Sandbox check

Set these in your ignored `.env.local`, using the **Sandbox** App ID and Cert ID:

```dotenv
EBAY_ENVIRONMENT=sandbox
EBAY_CLIENT_ID=<Sandbox App ID>
EBAY_CLIENT_SECRET=<Sandbox Cert ID>
```

```sh
npm run ebay:check
npm run ebay:check -- "vintage watch"
```

The check loads `.env.local` using Node’s environment loader (existing shell variables take precedence), requires Sandbox, and makes two Browse searches with `EBAY_US` and a limit of three. It prints only environment, marketplace, and result counts. Empty results are a successful API call, not proof of available watch inventory; Sandbox is test data. A failed request exits nonzero and prints a locally generated error plus HTTP status when available. For OAuth 401, check the Sandbox credential pair; Browse 403 can indicate application access restrictions, and 429 indicates rate limiting. Neither secrets nor upstream response bodies are logged.

The client uses native `fetch` with a 15-second timeout, disabled HTTP caching, and redirects rejected. OAuth uses the client credentials grant and `https://api.ebay.com/oauth/api_scope`. Tokens are held only in module memory, shared across concurrent callers, and renewed before expiry with a safety margin. Failed mint requests can be retried on the next call. Browse retries once after a 401, invalidating only the rejected cached token. Tokens are not persisted; separate server processes/Netlify instances have separate caches, and cold starts mint new tokens. Application tokens are renewed with client credentials, not OAuth refresh tokens.

Use `searchEbayItems({ query, limit, marketplace })` from server code. Marketplace defaults to `EBAY_US`; `EBAY_CA` is also supported. The validated result includes only total count, item ID, title, and optional price/currency. It is not a publication or database model. No credentials are read until the integration is called, so the homepage and production build remain independent of eBay configuration.

For a later Production integration, set `EBAY_ENVIRONMENT=production` and provide the matching Production keyset. OAuth and Browse endpoints switch together; invalid or absent environments fail explicitly rather than defaulting to Production. The smoke check deliberately refuses Production. Production API access requirements remain a separate milestone.

`server-only` enforces Next.js browser boundaries. `tsx` is development tooling for executing TypeScript scripts/tests; commands enable the `react-server` condition so the same guarded modules can run outside Next.js. No public API route or homepage UI was added.

References: [eBay OAuth/client credentials](https://developer.ebay.com/develop/guides/sell/authorization) and [Browse API](https://developer.ebay.com/api-docs/buy/static/api-browse.html).

### Verification notes

The initial live Sandbox check succeeded: two searches for `watch`, 44 total matches, three returned items per call. Inventory counts can change. Offline tests, lint, type checking, formatting, and the production build are the repeatable checks.

Local Node 22.7 is below the documented 22.13+ tooling requirement and produces engine/experimental JSON warnings; upgrade Node before regular development. The dependency audit currently reports five high-severity entries from one existing development-only ESLint dependency chain (`braces` → `micromatch` → `fast-glob` → Next ESLint packages). npm proposes a major downgrade of `eslint-config-next`; it was not applied as part of this integration. Reassess when the upstream lint dependency has a compatible fix.
