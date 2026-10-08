<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

### SL Maps

> Refactor target, glossary, conventions and migration status: [`docs/refactor/ARCHITECTURE.md`](docs/refactor/ARCHITECTURE.md).

A personal field-mapping tool for tracking real-world "placemarks" (dive sites, urbex spots, rockhounding, heritage sites, etc.) with categories, tags and visits, backed by PostGIS geometry. See `docs/sl-maps-schema-design.md` for the full data model design, and `docs/sl-maps.html` / `docs/sl-maps-style-guide.html` for the product plan and visual style guide (dark "Crimson & Patina field manual" theme — see the CSS token comment header in `app/globals.css`). Image upload is out of scope; the schema's `media` table is parked.

The base schema was created from the sibling repo `C:\Users\dave\Repos\sl-maps-supabase`; this repo's `sql/` files were applied on top by hand.

### Stack

- Next.js 16.3.0 (App Router), React 19.2.8, TypeScript
- Tailwind CSS v4 (`@tailwindcss/postcss`, no `tailwind.config.*` — CSS-based config in `app/globals.css`)
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for auth + Postgres/PostGIS
- `mapbox-gl` v3 for the map view
- `@hugeicons/react` + `@hugeicons/core-free-icons` for UI icons — `<HugeiconsIcon icon={SomeIcon} />`, icon data imported by name (e.g. `Search01Icon`) from `@hugeicons/core-free-icons`, tree-shakes per-icon since both packages are `sideEffects: false`. (Not `hugeicons-react`, which is deprecated.)
- `zod` v4 for validating server action and route handler input — `import { z } from 'zod'`; shared schemas go in `lib/validation/` (see `docs/refactor/ARCHITECTURE.md`).

### Commands

Node 24 (`.nvmrc`; `engines.node` matches the Vercel project's Node.js 24.x).

| Command                | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Dev server                                                   |
| `npm run build`        | Production build                                             |
| `npm run typecheck`    | `next typegen` then `tsc --noEmit`                           |
| `npm run lint`         | ESLint (Next config + `sl-maps/no-server-imports-in-client`) |
| `npm run lint:fix`     | ESLint with `--fix`                                          |
| `npm run format`       | Prettier `--write` over the repo                             |
| `npm run format:check` | Prettier `--check` over the repo                             |
| `npm test`             | Vitest, single run (`tests/**/*.test.ts`)                    |
| `npm run test:watch`   | Vitest in watch mode                                         |

Keep `build`, `typecheck`, `lint` and `test` green. The codebase has not been run through Prettier yet (baseline in `docs/refactor/AUDIT.md` §16), so `format:check` fails until the one-off formatting commit lands; don't run `npm run format` as part of any other change. Prettier settings: single quotes, semicolons, 2 spaces, `prettier-plugin-tailwindcss` with `app/globals.css` as the stylesheet; generated icon data and `docs/*.html` are ignored.

A `'use client'` file must not import `@lib/supabase/server` or `lib/data/` (except `lib/data/client/`). `eslint-rules/no-server-imports-in-client.mjs` enforces this for files that declare the directive themselves; hook modules without it aren't checked.

Line endings are LF everywhere (`.gitattributes`).

Tests live in `tests/`, mirroring the source path (`lib/url/mapParams.ts` → `tests/lib/url/mapParams.test.ts`). `vitest.config.mts` resolves the tsconfig path aliases, so tests import with `@lib/*` etc. and run in the `node` environment; stub browser globals (`vi.stubGlobal`) rather than adding jsdom for pure helpers. A pure function that needs a test lives in a `lib/` module, not inside a component or route file.

CI (`.github/workflows/ci.yml`) runs on every push and pull request: `npm ci`, then `format:check`, `typecheck`, `lint`, `test` and `build`, all blocking. The build uses placeholder `NEXT_PUBLIC_*` values and never contacts Supabase or Mapbox, so keep build-time code free of network calls. `format:check` fails until the formatting commit lands, so CI is red until then.

`npm install` runs `prepare`, which installs a `simple-git-hooks` pre-commit hook: `lint-staged` runs `prettier --write` then `eslint --fix` on staged files only, and an unfixable lint error blocks the commit. Until the formatting commit lands, staging any file reformats the whole file. Skip the hook once with `SKIP_SIMPLE_GIT_HOOKS=1`.

### Structure

- `app/actions/` — server actions: `auth.ts` (Supabase `signInWithPassword`), `categories.ts` (CRUD + `createCategoryQuick` for inline creation from other forms), `placemarks.ts` (`createPlacemark`; `savePlacemark`, the general edit used by both the home map and the `/review` queue, which clears `needs_review` on every save; `deletePlacemark` soft delete; `logVisit`; tag find-or-create/replace-all helpers)
- `app/api/search/route.ts` — `GET /api/search`, a proxy for the `placemarks_search` RPC that returns a GeoJSON `FeatureCollection` (params documented in `README.md`)
- `app/(app)/` — route group for every signed-in route (`page.tsx` = map search/filters, `review/`, `categories/`), each with a panel-only `loading.tsx`. Its `layout.tsx` is the app shell: icon rail, providers, and one persistent `MapView` that survives switching routes. Each page renders only its context panel + detail panel. `app/sign-in/` sits outside the group (no rail).
- `components/shell/` — app shell: `ShellContext.tsx` (active rail context + panel open state; Search ↔ Filters is a `?panel=` pushState on `/`, and leaving `/` saves its filter params so returning restores them), `AppRail.tsx` (left icon rail on desktop, bottom tab bar on mobile), `ContextPanel.tsx` (scrolling list panel between rail and map; mobile sheet), `DetailPanel.tsx` (bottom-right panel over the map — full map width, ⅔ height; stacked mobile sheet), `AppShellSkeleton.tsx`, `PanelSkeleton.tsx`
- `components/map/` — `MapView.tsx` (mapbox-gl wrapper + clustering + crosshair placing mode + geolocation; route-aware since it persists in the layout — scopes to `needs_review=true` on `/review`, only offers search/creation on `/`, and pads the camera's bottom edge while a `DetailPanel` is open), `MapLoadingOverlay.tsx`, `AddPlacemarkToolbar.tsx` ("Add placemark" / "Use my location" / "Place here" map overlay), `PlacingCrosshair.tsx` (fixed crosshair while placing), `BasemapSwitcher.tsx` (streets/satellite toggle, persisted via `lib/map/basemaps.ts`), `MapPanels.tsx` (server: category counts) / `MapPanelSwitcher.tsx` (client: picks the Search or Filters `ContextPanel`), `FilterPanel.tsx` (composes `CategoryFilter.tsx` and `StatusFilter.tsx`, plus a live "N of M" count), search (`SearchBox.tsx` — text input, coordinate parsing, Mapbox geocode suggestions, proximity toggle; `SearchResultsContext.tsx` — one debounced `/api/search` fetch shared by the map and the list; `SearchResultsList.tsx` — the Search panel's results), `FilterTransitionContext.tsx`/`useFilterParams.ts` (URL-search-param-backed filter state via `useTransition`), `MapControlsContext.tsx` (exposes MapView's `refresh`/`flyTo` to sibling components without exposing the mapbox instance directly), `DetailDrawer.tsx` (URL-driven view/edit/create `DetailPanel` — `?id=<uuid>`, `?id=<uuid>&edit=1`, `?id=new&lat=&lon=`), `PlacemarkForm.tsx` (shared create/edit form: category inline-create, autosave-on-blur description, log-a-visit, delete-with-confirm), `LogVisitModal.tsx` (`<dialog>` for logging a visit), `CopyPermalinkButton.tsx` (copies a `/?id=&mlat=&mlng=&z=` link), `TagInput.tsx` (debounced tag autocomplete + inline tag creation), `placemarkDetails.ts` (shared `PlacemarkDetails` type + `detailsToFormValues`, used by `DetailDrawer` and the review queue's detail panel)
- `components/categories/` — category management UI (`CategoryDetailPanel.tsx` wraps the server-rendered `CategoryDetail` in a `DetailPanel`)
- `components/review/` — backlog-placemark review UI: `ReviewQueueContext.tsx` (client-side queue list, progress and next id; provided by the review page so the queue only loads there; mirrors `MapControlsContext.tsx`'s provider pattern), `ReviewList.tsx`, `ReviewDetailPanel.tsx` (always-editing `PlacemarkForm` with Save & next / Skip)
- `components/ui/` — shared primitives (`Skeleton.tsx`, `Spinner.tsx`, `SubmitButton.tsx`)
- `lib/supabase/` — `client.ts`, `server.ts`, `middleware.ts` (`updateSession`)
- `lib/map/` — `basemaps.ts` (basemap ids, style URLs, localStorage persistence), `categoryStyle.ts`, `markerIcons.ts` (canvas pin rendering + image registration), `geometry.ts` (`toPointGeometry`), `camera.ts` (`detailBottomPadding`), `hugeiconsNames.json` (generated list of every icon name)
- `lib/url/` — pure URL-state parsers: `mapParams.ts` (`parseInitialView`, `parseFilters`, `parseNear`), `searchRadius.ts` (`parseRadiusMeters`, used by `/api/search`), `shellContext.ts` (`ShellContextId`, `contextFromLocation`). The start of the typed URL helpers in `docs/refactor/ARCHITECTURE.md`; there is no param registry yet
- `lib/slug.ts` — shared `slugify`, kept outside `app/actions/` because `"use server"` files may only export async functions
- `scripts/generate-hugeicons-names.mjs` — manual script that regenerates `lib/map/hugeiconsNames.json` and the per-icon JSON in `public/hugeicons/` (read by `IconPicker` previews and map pins)
- `sql/` — incremental migrations (e.g. `0001_placemarks_needs_review.sql`)
- `tests/` — Vitest unit tests, mirroring source paths
- `.github/workflows/ci.yml` — CI (see Commands)
- `proxy.ts` (repo root) — Next.js 16 renamed `middleware.ts` to `proxy.ts`; this invokes `lib/supabase/middleware.ts`'s `updateSession` for auth session handling. It is the framework's replacement, not a stray file.

### Database

PostgreSQL 15+ / PostGIS 3.3+ on Supabase. Core tables: `profiles` (ownership root), `placemarks` (central entity; single mixed `geometry(Geometry,4326)` column with a generated `anchor` point via `ST_PointOnSurface`; denormalized `visited`/`visit_count`/tag string for tile queries), `categories` (self-referencing parent/child, JSONB per-category fields), `tags`/`placemark_tags`, `visits`, `media` (dedup by checksum), `collections`/`collection_items`, `placemark_conflicts` (sync conflict archive). Conventions: soft delete only, `deleted_at`/`revision`/`server_seq` sync columns on every table, CHECK constraints instead of enums. The design calls for client-generated UUIDs, but today only tags get an app-side id; placemarks, categories and visits use the `uuid_generate_v7()` default. Full details in `docs/sl-maps-schema-design.md`.

### Auth

Fully on Supabase Auth (email/password). No Clerk remnants remain.
