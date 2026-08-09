<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

### SL Maps

A personal field-mapping tool for tracking real-world "placemarks" (dive sites, urbex spots, rockhounding, heritage sites, etc.) with categories, tags, visits, and photo media, backed by PostGIS geometry. See `sl-maps-schema-design.md` for the full data model design, and `sl-maps.html` / `sl-maps-style-guide.html` for the product plan and visual style guide (dark "Moss & Amber field manual" theme).

### Stack

- Next.js 16.3.0 (App Router), React 19.2.8, TypeScript
- Tailwind CSS v4 (`@tailwindcss/postcss`, no `tailwind.config.*` — CSS-based config in `app/globals.css`)
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for auth + Postgres/PostGIS
- `mapbox-gl` v3 for the map view

### Structure

- `app/actions/` — server actions: `auth.ts` (Supabase `signInWithPassword`), `categories.ts`, `placemarks.ts`
- `app/categories/`, `app/review/`, `app/sign-in/`, `app/page.tsx` — routes, each with `loading.tsx` where relevant
- `components/map/` — `MapExplorer.tsx`, `MapView.tsx` (mapbox-gl wrapper + clustering), `MapLoadingOverlay.tsx`, `Sidebar.tsx`/`SidebarShell.tsx`, `FilterPanel.tsx` (composes `CategoryFilter.tsx`, `StatusFilter.tsx`, `SearchField.tsx`), `FilterTransitionContext.tsx`/`useFilterParams.ts` (URL-search-param-backed filter state via `useTransition`), `DetailDrawer.tsx`
- `components/categories/`, `components/review/` — category management and backlog-placemark review UIs
- `components/ui/` — shared primitives (`Skeleton.tsx`, `Spinner.tsx`, `SubmitButton.tsx`)
- `lib/supabase/` — `client.ts`, `server.ts`, `middleware.ts` (`updateSession`)
- `lib/map/` — `categoryStyle.ts`, `shapeIcons.ts`
- `sql/` — incremental migrations (e.g. `0001_placemarks_needs_review.sql`)
- `proxy.ts` (repo root) — Next.js 16 renamed `middleware.ts` to `proxy.ts`; this invokes `lib/supabase/middleware.ts`'s `updateSession` for auth session handling. It is the framework's replacement, not a stray file.

### Database

PostgreSQL 15+ / PostGIS 3.3+ on Supabase. Core tables: `profiles` (ownership root), `placemarks` (central entity; single mixed `geometry(Geometry,4326)` column with a generated `anchor` point via `ST_PointOnSurface`; denormalized `visited`/`visit_count`/tag string for tile queries), `categories` (self-referencing parent/child, JSONB per-category fields), `tags`/`placemark_tags`, `visits`, `media` (dedup by checksum), `collections`/`collection_items`, `placemark_conflicts` (sync conflict archive). Conventions: client-generated UUIDs, soft delete only, `deleted_at`/`revision`/`server_seq` sync columns on every table, CHECK constraints instead of enums. Full details in `sl-maps-schema-design.md`.

### Auth

Fully on Supabase Auth (email/password). No Clerk remnants remain.
