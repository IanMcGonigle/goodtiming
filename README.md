# Good Timing

**Interesting watches. Found daily.**

Good Timing is an independent watch-discovery and affiliate publication at [goodtiming.ca](https://goodtiming.ca). It will curate a small selection of noteworthy online listings, from affordable oddities to modern icons and vintage finds.

## Current status

The first milestone is a polished, responsive launch homepage. Original CSS/SVG dial artwork, semantic content, reduced-motion support, canonical metadata, a favicon, and a generated Open Graph image establish the public foundation. There are no listings, credentials, external integrations, signup forms, or approval workflows yet.

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
npm run format:check  # Check formatting
npm run format       # Apply formatting
npm run build        # Production build
npm start            # Serve the production build locally
```

There is no automated test suite in this presentation-only milestone. Lint, type checks, formatting, and a production build are the current verification baseline. Add behavior-focused tests when application logic arrives.

## Structure and future architecture

- `app/`: routes, root layout, styles, and metadata assets.
- `components/`: reusable presentation; currently the decorative dial.
- `lib/site.ts`: public brand/site constants.
- `types/`: domain modeling notes, ready for concrete shared types when listings arrive.
- `public/`: future static assets.

The homepage remains a Server Component; its animation needs no client JavaScript. System fonts avoid third-party font requests and build-time font downloads.

Introduce integrations and application logic in `lib/server/` as needed, using `import 'server-only'` to enforce the boundary. Add the official MongoDB Node.js driver only when persistence is implemented. Keep browser-safe domain types separate from database and API transport types.

Future milestones will retrieve eBay Browse API candidates, persist them in MongoDB, filter and score deterministically, evaluate a reduced set with AI, and propose approximately 1–5 watches per day to a private approval dashboard. **Human approval is required before publication.** Affiliate tracking and platform-specific social content follow later. The planned listing lifecycle is documented in `types/README.md`; none of this pipeline is implemented yet.

## Deployment

Target: **Netlify**. Its current Next.js adapter supports the App Router and automatically configures framework support: [Netlify Next.js documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). No custom `netlify.toml`, adapter pin, static export, or Vercel-specific API is needed.

When deployment is authorized, connect the GitHub repository in Netlify, use Node.js 22.13+, and accept detected Next.js settings (`npm run build`, `.next`). Production metadata assumes `https://goodtiming.ca`. No accounts, resources, domains, or deployments have been configured by this implementation.
