# Good Timing

A curated watch-discovery and affiliate publication at goodtiming.ca: “Interesting watches. Found daily.” Prioritize a small editorial selection over marketplace breadth.

- Stack: Next.js App Router, React, strict TypeScript, npm, ESLint, Prettier, native CSS/CSS Modules.
- Deploy to Netlify, not Vercel. Prefer framework auto-detection over custom hosting configuration.
- Future persistence uses MongoDB's official Node.js driver, not Redis.
- Human approval is mandatory before any discovered or AI-evaluated content is published.
- Keep integrations under `lib/server/` when needed, marked with `import 'server-only'`. Secrets must never reach browser code or use NEXT_PUBLIC_ prefixes.
- Preserve the confident, high-end editorial direction: strong typography, generous whitespace, restrained color and motion. Respect accessibility and reduced motion.
- Avoid unnecessary dependencies, speculative abstractions, fake content, and dead navigation. Build functionality only when its milestone requires it.
- eBay integration lives in `lib/server/ebay/`; `npm run ebay:check` is a local check for the explicitly selected environment (separate Sandbox/Production keysets), never a public diagnostic route. Use `--explore --details` for bounded diagnostics. Token caching stays in process memory. Never log credentials, access tokens, or raw upstream error bodies.
- Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` after meaningful changes.
- Never deploy, create cloud resources, or commit/push without explicit user instruction.
