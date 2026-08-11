# Address Insights

Search a street address, explore nearby OpenStreetMap amenities, and view heuristic walking, driving, and urban-density scores on a shareable insights page.

**Live app:** [https://vercel.com/tektektechnologies-projects/address-insights](https://vercel.com/tektektechnologies-projects/address-insights)

## What I built vs AI assistance

This project was developed with AI coding assistants under my direction.

**I owned:**
- Requirements and incremental delivery plan
- Architecture choices (server-side geocoding/amenities, URL-shareable results, pure scoring functions)
- Environment/secrets setup and Vercel deployment
- Debugging real provider failures (LocationIQ auth/timeouts, Overpass QL syntax, mirror failover)
- Review, verification (`lint` / `tsc` / `test` / `build`), and UX acceptance

**AI assistants accelerated:**
- Boilerplate and feature implementation from my prompts
- First-pass UI wiring, tests, and repetitive refactoring

This is an accurate split for interviews: I can explain every decision and failure mode; AI helped ship faster, not replace ownership.

## Approach

1. Keep secrets and provider calls on the server (`/api/geocode`, `/api/amenities`).
2. Put shareable state in the URL (`lat`, `lng`, `address`) so results work in a fresh browser.
3. Keep scoring deterministic and testable in `src/lib/scoring.ts`.
4. Render Leaflet only on the client; use Overpass mirrors + clear timeout/retry UX when public OSM infrastructure is busy.

## Assumptions & design decisions

- Scores are transparent heuristics from nearby POI density/diversity — not official walkability or travel-time models.
- Amenity radius is fixed server-side (~3.5 km); clients cannot choose arbitrary Overpass radii.
- `localStorage` is only for recent searches; never the source of truth for shared links.
- LocationIQ + OpenStreetMap attributions remain visible per provider terms.
- Requires `LOCATIONIQ_TOKEN` in `.env.local` (local) and Vercel project env (production).
