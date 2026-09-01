<div align="center">
  <a href="https://sl-maps-neon.vercel.app">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://sl-maps-neon.vercel.app/logo.svg">
      <img alt="SL Maps logo" src="https://sl-maps-neon.vercel.app/logo-light.svg" height="128">
    </picture>
  </a>
  <h1>SL Maps</h1>

<a href="https://www.npmjs.com/package/next"><img alt="NPM version" src="https://img.shields.io/npm/v/next.svg?style=for-the-badge&labelColor=000000"></a>
<img alt="License" src="https://img.shields.io/github/license/SlightlyLostDave/sl-maps?style=for-the-badge">

</div>

A personal field-mapping tool for tracking real-world places: dive sites, urbex spots, rockhounding locations, heritage sites, and anything else worth going back to. Placemarks carry categories, tags, visit logs, and photo media, backed by PostGIS geometry.

Live: [sl-maps-neon.vercel.app](https://sl-maps-neon.vercel.app)

Built by [Dave Beach](https://davebeach.me) as the web front end for a QGIS-to-PostGIS placemark pipeline. The QGIS side produced years of unsorted layers; this app is the tool for browsing, cleaning up, and adding to that data in the field.

## Features

**Map explorer.** A clustered Mapbox GL map of every placemark, with category-coloured pins, labels, and a dark basemap tuned at runtime to match the app theme. Basemap toggles between streets and satellite, and the choice persists locally.

**Add from the map.** Drop a placemark by clicking the map in placing mode, or use device geolocation to place one at your current position.

**Detail drawer.** View, edit, and create panels are URL-driven (`?id=<uuid>`, `?id=<uuid>&edit=1`, `?id=new&lat=&lon=`), so any state is linkable and survives a refresh. The form handles inline category creation, autosave-on-blur descriptions, visit logging, and soft delete with confirmation.

**Tags.** Debounced autocomplete with inline creation, replace-all semantics on save.

**Filtering.** Category, visited status, and free-text filters are backed by URL search params and applied through React transitions, so the map and list stay in sync with the address bar.

**Search.** Full-text search over placemark names and descriptions, plus exact tag matching and proximity search, all through a single PostGIS RPC. See [Search API](#search-api) below.

**Review queue.** Every placemark imported from QGIS is flagged `needs_review`. `/review` pairs a map scoped to just those placemarks with a paginated list and an always-editing detail panel, with Save and next / Skip controls for working through the backlog.

**Category management.** A dedicated `/categories` route for the self-referencing category tree, including icon selection from the bundled Hugeicons set.

**Visited styling.** Visited placemarks render differently from unvisited ones, so progress through an area is visible at a glance.

## Stack

| Layer            | Choice                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Framework        | Next.js 16.3.0 (App Router), React 19.2.8, TypeScript                                                            |
| Styling          | Tailwind CSS v4 via `@tailwindcss/postcss`, no `tailwind.config.*` (CSS-based config lives in `app/globals.css`) |
| Backend          | Supabase: Postgres 15+ with PostGIS 3.3+, plus Supabase Auth                                                     |
| Supabase clients | `@supabase/supabase-js`, `@supabase/ssr`                                                                         |
| Map              | `mapbox-gl` v3                                                                                                   |
| Icons            | `@hugeicons/react` + `@hugeicons/core-free-icons`                                                                |
| Hosting          | Vercel                                                                                                           |

A note on icons: use `<HugeiconsIcon icon={SomeIcon} />` with the icon data imported by name (for example `Search01Icon`) from `@hugeicons/core-free-icons`. Both packages are `sideEffects: false`, so this tree-shakes per icon. The deprecated `hugeicons-react` package is not used.

## Getting started

### Prerequisites

- Node.js 20 or newer
- A Supabase project with PostGIS enabled
- A Mapbox access token

### Install and run

```bash
git clone https://github.com/SlightlyLostDave/sl-maps.git
cd sl-maps
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev
```

The dev server runs at [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable                        | Purpose                         |
| ------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_MAPBOX_TOKEN`      | Mapbox GL access token (`pk.…`) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key   |

### Scripts

| Command         | What it does               |
| --------------- | -------------------------- |
| `npm run dev`   | Start the dev server       |
| `npm run build` | Production build           |
| `npm run start` | Serve the production build |
| `npm run lint`  | Run ESLint                 |

`scripts/generate-hugeicons-names.mjs` regenerates `lib/map/hugeicons/names.json` and the per-icon JSON under `public/hugeicons/`, which back the icon picker in category management.

## Database

PostgreSQL 15+ with PostGIS 3.3+, hosted on Supabase.

### Core tables

- `profiles` is the ownership root.
- `placemarks` is the central entity. It uses a single mixed `geometry(Geometry,4326)` column with a generated `anchor` point derived via `ST_PointOnSurface`, plus denormalized `visited`, `visit_count`, and a tag string to keep tile queries cheap.
- `categories` is self-referencing (parent/child) with JSONB per-category fields.
- `tags` and `placemark_tags` handle tagging.
- `visits` records individual visits to a placemark.
- `media` stores photos, deduplicated by checksum.
- `collections` and `collection_items` group placemarks.
- `placemark_conflicts` archives sync conflicts.

### Conventions

UUIDs are client-generated. Deletes are always soft. Every table carries `deleted_at`, `revision`, and `server_seq` sync columns. CHECK constraints are used instead of enums.

## Search API

`GET /api/search` proxies the `placemarks_search` RPC and returns a GeoJSON `FeatureCollection` in the same shape as `placemarks_geojson`, so results can be fed straight into a Mapbox source. Each feature adds two nullable properties: `rank` (null without a text query) and `distance_m` (null without a proximity filter).

| Param          | Notes                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `q`            | Free-text query. Matches name and description via `websearch_to_tsquery`, plus exact-ish tag matching   |
| `lat`, `lon`   | Proximity centre. Both must be present and numeric                                                      |
| `radius`       | Accepts `100km`, `50mi`, `5000m`, or a bare number treated as km. Defaults to 50 km, capped at 2,000 km |
| `cat`          | Comma-separated category UUIDs                                                                          |
| `visited`      | `1` or `0`                                                                                              |
| `needs_review` | `1` to scope to the review backlog                                                                      |

At least one of `q` or a `lat`/`lon` pair is required. Results are capped at 200.

Ranking puts proximity first whenever a location is supplied, since the radius already bounds the candidate set and nearest-first is the useful order in the field. Text rank only breaks ties. An exact tag hit gets a fixed boost so it floats above typical `ts_rank` values in text-only mode.

## Project structure

```
app/
  actions/          server actions
    auth.ts         Supabase signInWithPassword, signOut
    categories.ts   category CRUD plus createCategoryQuick for inline creation
    placemarks.ts   createPlacemark, savePlacemark, deletePlacemark, logVisit, tag helpers
  api/search/       the search route described above
  categories/       category management route
  review/           review queue route
  sign-in/          auth route
  page.tsx          map explorer (home)
  globals.css       Tailwind v4 config and the Crimson & Patina design tokens
components/
  map/              MapExplorer, MapView, DetailDrawer, PlacemarkForm, filters, toolbars
  categories/       category management UI and icon picker
  review/           ReviewExplorer, ReviewQueueContext, ReviewList, ReviewDetailPanel
  ui/               AppHeader, BottomSheet, DrawerShell, Skeleton, Spinner, SubmitButton
lib/
  supabase/         client.ts, server.ts, middleware.ts (updateSession)
  map/              basemaps.ts, categoryStyle.ts, markerIcons.ts
  slug.ts           shared slugify, kept out of app/actions/ because "use server" files may only export async functions
sql/                incremental migrations, run by hand
proxy.ts            Next.js 16's replacement for middleware.ts
```

Some notes on the less obvious pieces:

`savePlacemark` is shared by the home map and the review queue, and clears `needs_review` on every save. `MapView.tsx` handles the mapbox-gl wrapper, clustering, click-to-add mode, and geolocation. When rendered on `/review` it scopes to `needs_review=true` placemarks and hides the add-placemark toolbar.

`MapControlsContext.tsx` exposes `refresh` and `flyTo` to sibling components without leaking the mapbox instance itself. `ReviewQueueContext.tsx` mirrors that provider pattern for queue list, progress, and next-id state.

`placemarkDetails.ts` holds the shared `PlacemarkDetails` type and `detailsToFormValues`, used by both `DetailDrawer` and the review queue's detail panel.

`proxy.ts` at the repo root is not a stray file. Next.js 16 renamed `middleware.ts` to `proxy.ts`, and this one invokes `updateSession` from `lib/supabase/middleware.ts` for auth session handling.

Path aliases are configured in `tsconfig.json`: `@/*`, `@app/*`, `@components/*`, and `@lib/*`.

## Theming

The visual language is a dark "Crimson & Patina field manual" theme. All colours, radii, and shadows are CSS custom properties defined at the top of `app/globals.css`, with a `[data-theme="light"]` override block. A handful of map-surface tokens (`--map-a`, `--map-b`, `--map-water`, `--pin-stroke`) are read at runtime via `getComputedStyle` by `MapView`, which quietens the stock Mapbox style rather than shipping a hosted custom one.

## Auth

Email and password through Supabase Auth. Session handling runs through `proxy.ts` into `updateSession`. There is no public sign-up route: this is a single-user tool, and accounts are provisioned directly in Supabase.

## Deployment

Deployed on Vercel. Set the three environment variables above in the project settings and push to `main`. Database migrations are applied separately, by hand, in the Supabase SQL editor.
