# SL Maps — codebase audit

- **Date:** 2026-10-07
- **Commit:** `12e90b1` on `phase-0-baseline`
- **Scope:** every tracked file except `public/hugeicons/*` (one row); the sibling `sl-maps-supabase` migrations; `docs/sl-maps-schema-design.md`.
- **No code was changed.** Tools run: `npm run build` (Next 16.3.0, Turbopack, 19 s wall), `npm run lint` (green), `npx knip`.

**Labels**

| Label     | Meaning                                                    |
| --------- | ---------------------------------------------------------- |
| KEEP      | Fine as it is                                              |
| REFACTOR  | Right idea, needs restructuring (what is said in the note) |
| DEAD      | Unused or superseded                                       |
| DUPLICATE | Near-identical logic that should be one thing              |
| PARKED    | Deliberately unused — do not remove                        |

---

## 0. Inventory

S = Server Component / server-only module, C = `'use client'` (or only ever imported from client modules), — = not code.

### Routes, layouts, route handlers

| Path                               | What it does                                                                     | Lines | S/C | Label     | Note                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------- | ----: | :-: | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/layout.tsx`                   | Root html/body, fonts, metadata, viewport                                        |    49 |  S  | KEEP      | `metadata.description` (L23) is create-next-app boilerplate. Checks out CRLF.                                                                |
| `app/(app)/layout.tsx`             | Shell: getUser, Suspense, 4 providers, AppRail, `{children}`, persistent MapView |    50 |  S  | REFACTOR  | `getUser()` (L18-21) duplicates proxy.ts; only used for `email` in a tooltip. Static `MapView` import pulls mapbox-gl into every route (§7). |
| `app/(app)/page.tsx`               | `/`: MapPanels + DetailDrawer                                                    |    11 |  S  | KEEP      |                                                                                                                                              |
| `app/(app)/loading.tsx`            | Panel skeleton                                                                   |     5 |  S  | KEEP      |                                                                                                                                              |
| `app/(app)/review/page.tsx`        | `/review`: redirects to the first unsorted id, renders the queue                 |    45 |  S  | REFACTOR  | The redirect costs a second round trip on every visit without `?id`.                                                                         |
| `app/(app)/review/loading.tsx`     | Panel skeleton                                                                   |     5 |  S  | DUPLICATE | Identical to the other two `loading.tsx` files; fine as Next convention.                                                                     |
| `app/(app)/categories/page.tsx`    | `/categories`: list + detail; all state from searchParams                        |    46 |  S  | KEEP      | Every selection is a full server round trip, including the counting loop (§3).                                                               |
| `app/(app)/categories/loading.tsx` | Panel skeleton                                                                   |     5 |  S  | DUPLICATE | As above.                                                                                                                                    |
| `app/sign-in/page.tsx`             | Email/password form via `useActionState`                                         |    66 |  C  | KEEP      | Could be a server page with a small client form; 17 KB route, not worth it.                                                                  |
| `app/api/search/route.ts`          | GET proxy for the `placemarks_search` RPC                                        |    89 |  S  | REFACTOR  | `cat` unvalidated (L64-65); `needs_review` (L69) never sent by the app.                                                                      |
| `proxy.ts`                         | Next 16 middleware → `updateSession`                                             |    13 |  S  | KEEP      | Matcher notes in §9.                                                                                                                         |

### Server actions

| Path                        | What it does                                                  | Lines | S/C | Label    | Note                                                                                                                    |
| --------------------------- | ------------------------------------------------------------- | ----: | :-: | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `app/actions/auth.ts`       | `signIn`, `signOut`                                           |    32 |  S  | KEEP     |                                                                                                                         |
| `app/actions/categories.ts` | create / createQuick / update / delete category               |   240 |  S  | REFACTOR | Missing auth checks, not atomic, three error styles, sequential `uniqueSlug` (§5).                                      |
| `app/actions/placemarks.ts` | create / save / soft-delete placemark, log visit, tag helpers |   240 |  S  | REFACTOR | Not atomic, sequential `findOrCreateTags`, `revalidatePath('/review')` re-renders the current route on every save (§3). |

### Components — shell

| Path                                    | What it does                                                                  | Lines | S/C | Label     | Note                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------- | ----: | :-: | --------- | --------------------------------------------------------------------------------------------- |
| `components/shell/ShellContext.tsx`     | Active context, desktop/mobile panel flags, rail navigation, saves `/` params |   137 |  C  | REFACTOR  | Repeats the param list (L18-27) and the 768px breakpoint (L29).                               |
| `components/shell/AppRail.tsx`          | Icon rail / bottom tab bar, filter badge, sign out                            |   109 |  C  | KEEP      | Sign-out form duplicated for mobile/desktop (L85-94, L97-106).                                |
| `components/shell/ContextPanel.tsx`     | Docked list panel / mobile sheet                                              |    44 |  C  | KEEP      | `md:w-80` (L27) is mirrored by `md:left-80` in DetailPanel.                                   |
| `components/shell/DetailPanel.tsx`      | Bottom ⅔ detail panel, Escape to close                                        |    55 |  C  | REFACTOR  | Stale `onClose` captured at mount (L21-30) — confirmed bug, §1.4.                             |
| `components/shell/AppShellSkeleton.tsx` | Suspense fallback for the shell                                               |    39 |  S  | DUPLICATE | `PanelSkeletonBody` (L27-39) duplicates PanelSkeleton.                                        |
| `components/shell/PanelSkeleton.tsx`    | `loading.tsx` panel                                                           |    20 |  C  | REFACTOR  | `'use client'` unnecessary — no hooks; it can render the client ContextPanel from the server. |

### Components — map

| Path                                         | What it does                                                                                                   | Lines | S/C | Label     | Note                                                                                                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----: | :-: | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/map/MapView.tsx`                 | The one mapbox-gl map: init, clustering, data fetch, search rendering, placing, draft marker, padding, basemap |   984 |  C  | REFACTOR  | Too many responsibilities; 16 refs, 10 effects (§6). Duplicated `parseFilters`, the 768px breakpoint and ⅔ height. `toPointGeometry` (L134-139) is **DEAD** — both live RPCs return `anchor` (§6.6). |
| `components/map/MapPanels.tsx`               | Server half of `/` panels: categories + counts                                                                 |   105 |  S  | DUPLICATE | `getAggregates` (L17-48) pages through every placemark to count in JS; same as CategoryList's `getCategoryCounts`.                                                                                   |
| `components/map/MapPanelSwitcher.tsx`        | Picks the Search or Filters ContextPanel                                                                       |    22 |  C  | KEEP      |                                                                                                                                                                                                      |
| `components/map/FilterPanel.tsx`             | Filters panel + live "N of M" count                                                                            |    93 |  C  | REFACTOR  | `useMatchCount` re-runs on every render (new `Set` dep, L43) → exact count on every pan.                                                                                                             |
| `components/map/CategoryFilter.tsx`          | Category toggle tree                                                                                           |   114 |  C  | DUPLICATE | Tree building (L53-60) duplicates CategoryList (L103-109).                                                                                                                                           |
| `components/map/StatusFilter.tsx`            | Visited segmented control                                                                                      |    59 |  C  | KEEP      |                                                                                                                                                                                                      |
| `components/map/useFilterParams.ts`          | URL-backed filter/search state + mutators                                                                      |   169 |  C  | REFACTOR  | Should become the single URL schema (§2). `'use client'` redundant on a hook module. CRLF.                                                                                                           |
| `components/map/FilterTransitionContext.tsx` | Shared `useTransition` for filter pushes                                                                       |    23 |  C  | DUPLICATE | Byte-for-byte the same shape as CategoryTransitionContext.                                                                                                                                           |
| `components/map/MapControlsContext.tsx`      | `refresh`/`flyTo` indirection to MapView                                                                       |    41 |  C  | KEEP      | New object every render (L26-32); harmless today.                                                                                                                                                    |
| `components/map/SearchBox.tsx`               | Search input, coordinate parsing, Mapbox geocode suggestions, proximity toggle                                 |   248 |  C  | REFACTOR  | eslint-disable (L144); hand-rolled debounce + request id; geocode fetch has no AbortController.                                                                                                      |
| `components/map/SearchResultsContext.tsx`    | Single debounced `/api/search` fetch shared by map + list                                                      |   114 |  C  | REFACTOR  | Duplicates param parsing (L41-46); runs on every route (it's in the layout). `SearchFeatureProps` export unused (knip).                                                                              |
| `components/map/SearchResultsList.tsx`       | Sidebar results, radius select                                                                                 |   115 |  C  | KEEP      | Own pushState builder (L24-30).                                                                                                                                                                      |
| `components/map/DetailDrawer.tsx`            | URL-driven view/edit/create panel on `/`                                                                       |   262 |  C  | DUPLICATE | Details fetch + keyed state (L21-49) duplicates ReviewDetailPanel; four pushState builders (L51-84).                                                                                                 |
| `components/map/PlacemarkForm.tsx`           | Shared create/edit form                                                                                        |   413 |  C  | REFACTOR  | Fetches categories on every mount (L99-114); exports `inputClass` used by LogVisitModal. CRLF.                                                                                                       |
| `components/map/TagInput.tsx`                | Debounced tag autocomplete, portal dropdown                                                                    |   186 |  C  | KEEP      | Own debounce/request-id pattern.                                                                                                                                                                     |
| `components/map/LogVisitModal.tsx`           | `<dialog>` to log a visit                                                                                      |   121 |  C  | KEEP      | Escape interaction with DetailPanel, §1.4.                                                                                                                                                           |
| `components/map/CopyPermalinkButton.tsx`     | Copies `/?id=&mlat=&mlng=&z=`                                                                                  |    61 |  C  | KEEP      |                                                                                                                                                                                                      |
| `components/map/AddPlacemarkToolbar.tsx`     | Add / use-location / confirm controls                                                                          |   100 |  C  | DUPLICATE | `buttonClass` duplicated with BasemapSwitcher and ZoomControl; `'use client'` redundant. `md:top-23` depends on ZoomControl's height.                                                                |
| `components/map/BasemapSwitcher.tsx`         | Streets/satellite toggle                                                                                       |    38 |  C  | DUPLICATE | Same `buttonClass`; `'use client'` redundant.                                                                                                                                                        |
| `components/map/PlacingCrosshair.tsx`        | Fixed crosshair while placing                                                                                  |    20 | C\* | KEEP      | \*No directive; client because MapView imports it.                                                                                                                                                   |
| `components/map/MapLoadingOverlay.tsx`       | Spinner overlay                                                                                                |    20 | S/C | KEEP      | Used by both server (AppShellSkeleton) and client (MapView).                                                                                                                                         |
| `components/map/placemarkDetails.ts`         | `PlacemarkDetails` type + `detailsToFormValues`                                                                |    39 |  —  | KEEP      | CRLF.                                                                                                                                                                                                |

### Components — review, categories, ui

| Path                                                  | What it does                                              | Lines | S/C | Label     | Note                                                                                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------- | ----: | :-: | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/review/ReviewQueueContext.tsx`            | Paged backlog list + progress + `advanceFrom`             |   185 |  C  | REFACTOR  | 3 queries (2 exact counts) per load and per save (L67-86); eslint-disable (L121); page not in URL.                                                                   |
| `components/review/ReviewList.tsx`                    | Queue list panel                                          |   115 |  C  | KEEP      |                                                                                                                                                                      |
| `components/review/ReviewDetailPanel.tsx`             | Always-editing form, Save & next / Skip                   |   133 |  C  | DUPLICATE | Fetch duplicates DetailDrawer (L24-48); eslint-disable (L53); same stale-Escape issue (L64-69).                                                                      |
| `components/categories/CategoryList.tsx`              | Server category tree with counts                          |   143 |  S  | DUPLICATE | `getCategoryCounts` (L30-49) paging loop.                                                                                                                            |
| `components/categories/CategoryDetail.tsx`            | Server create/edit/delete forms                           |   325 |  S  | KEEP      | 5 queries in 2 sequential waves (L142-158); local `inputClass` (L103).                                                                                               |
| `components/categories/CategoryDetailPanel.tsx`       | DetailPanel wrapper, close → `router.push('/categories')` |    28 |  C  | KEEP      |                                                                                                                                                                      |
| `components/categories/CategoryNavLink.tsx`           | `<Link>` that routes inside a transition                  |    34 |  C  | REFACTOR  | Unconditional `preventDefault` (L25) breaks cmd/ctrl/middle-click.                                                                                                   |
| `components/categories/CategoryTransitionContext.tsx` | Shared `useTransition`                                    |    23 |  C  | DUPLICATE | See FilterTransitionContext.                                                                                                                                         |
| `components/categories/CategoryLoadingOverlay.tsx`    | Overlay while category nav is pending                     |    16 |  C  | KEEP      |                                                                                                                                                                      |
| `components/categories/IconPicker.tsx`                | Icon name autocomplete + preview                          |    96 |  C  | REFACTOR  | Imports the 98.7 KB names JSON into the client (L6); helper text "not yet used by map rendering" (L92) is wrong — pins use it. Fetch has no error handling (L32-37). |
| `components/ui/Skeleton.tsx`                          | Pulse block                                               |     3 |  S  | KEEP      |                                                                                                                                                                      |
| `components/ui/Spinner.tsx`                           | Spinner                                                   |    22 |  S  | KEEP      |                                                                                                                                                                      |
| `components/ui/SubmitButton.tsx`                      | `useFormStatus` submit button                             |    52 |  C  | REFACTOR  | `formAction` prop (L27) never passed; comment mentions a non-existent `ReviewDetail` (L37).                                                                          |

### lib, scripts

| Path                                   | What it does                                       |        Lines | S/C | Label    | Note                                                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------- | -----------: | :-: | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/supabase/server.ts`               | Cookie-bound server client                         |           28 |  S  | KEEP     |                                                                                                                                                                                         |
| `lib/supabase/client.ts`               | Browser client                                     |            8 |  C  | KEEP     | New client per call site is fine (`@supabase/ssr` memoises the browser singleton).                                                                                                      |
| `lib/supabase/middleware.ts`           | `updateSession`: refresh session + redirect        |           52 |  S  | KEEP     |                                                                                                                                                                                         |
| `lib/supabase.ts`                      | Bare `createClient` singleton                      |            6 |  —  | DEAD     | No importers (grep + knip).                                                                                                                                                             |
| `lib/slug.ts`                          | `slugify`                                          |            8 |  —  | KEEP     |                                                                                                                                                                                         |
| `lib/map/basemaps.ts`                  | Basemap ids, style URLs, localStorage persistence  |           56 |  C  | KEEP     | `DEFAULT_BASEMAP_ID` exported but used only internally (knip).                                                                                                                          |
| `lib/map/categoryStyle.ts`             | `buildCategoryStyles`, fallback colour             |           16 |  —  | KEEP     | Fallback colour hardcodes `--cat-none`.                                                                                                                                                 |
| `lib/map/markerIcons.ts`               | Canvas pin rendering + image registration          |          254 |  C  | REFACTOR | `'use client'` on a non-component (use `client-only`); cache comment L154-161 describes MapView remounting, which no longer happens; `hasImage` early return blocks style updates (§6). |
| `lib/map/hugeiconsNames.json`          | 5,437 icon names                                   | 1 (98,676 B) | S+C | REFACTOR | Imported by IconPicker (client) and categories action (server).                                                                                                                         |
| `scripts/generate-hugeicons-names.mjs` | Regenerates names JSON + `public/hugeicons/*.json` |           53 |  —  | KEEP     | knip reports it as unused; it's a manual script with no npm script entry.                                                                                                               |

### SQL

| Path                                           | What it does                                      | Lines | Label    | Note                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------- | ----: | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sql/0001_placemarks_needs_review.sql`         | Adds `needs_review` + partial index               |    22 | KEEP     | History. Comment cites `idx_placemarks_wtg` (see 0003).                                                                                                                                                                                                                              |
| `sql/0002_recategorize_non_places_sorted.sql`  | One-off data fix                                  |    25 | KEEP     | History; hardcoded category UUID.                                                                                                                                                                                                                                                    |
| `sql/0003_drop_want_to_go_index.sql`           | `drop index if exists idx_placemarks_wtg`         |     8 | REFACTOR | The sibling repo named it `idx_placemarks_want_to_go` (indexes.sql:48), and the live DB still has `idx_placemarks_want_to_go`, so this was a **no-op (confirmed)**.                                                                                                                  |
| `sql/0004_placemarks_geojson_review_scope.sql` | New `placemarks_geojson` with `in_needs_review`   |    55 | REFACTOR | Different arg list → creates a **second overload** rather than replacing; no `LIMIT`; no `set search_path`; no `security invoker` stated (default is invoker). **Filters on `anchor`, which has no plain GIST index → sequential scan (confirmed, §15).** Both overloads exist live. |
| `sql/0005_visits_visited_on_nullable.sql`      | `visited_on` nullable                             |    10 | KEEP     |                                                                                                                                                                                                                                                                                      |
| `sql/0006_placemarks_search.sql`               | search_vector, 2 indexes, new `placemarks_search` |   166 | REFACTOR | Block 1–3 already exist in the sibling schema (block 1 would error); new 8-arg overload alongside the original 7-arg one; no `set search_path`. Both overloads exist live.                                                                                                           |

### Config, docs, assets

| Path                                                                                  | What it does                        |             Lines | Label    | Note                                                                                                      |
| ------------------------------------------------------------------------------------- | ----------------------------------- | ----------------: | -------- | --------------------------------------------------------------------------------------------------------- |
| `package.json`                                                                        | Deps + scripts                      |                33 | REFACTOR | `@next/env` and `@types/mapbox-gl` unused (§11); no `engines`, no `typecheck`/`test` scripts. CRLF.       |
| `package-lock.json`                                                                   | Lockfile                            |              7072 | KEEP     | CRLF.                                                                                                     |
| `next.config.ts`                                                                      | Empty config                        |                 7 | REFACTOR | No security headers (§9). CRLF.                                                                           |
| `tsconfig.json`                                                                       | strict, path aliases                |                37 | KEEP     |                                                                                                           |
| `eslint.config.mjs`                                                                   | next core-web-vitals + ts           |                18 | KEEP     |                                                                                                           |
| `postcss.config.mjs`                                                                  | Tailwind v4                         |                 7 | KEEP     |                                                                                                           |
| `app/globals.css`                                                                     | Tokens, Tailwind theme, base styles |               191 | KEEP     | Light theme L53-94 + `--map-a`/`--map-b` (L40-41, L87-88, unused) are **PARKED**.                         |
| `app/favicon.ico`                                                                     | Favicon                             |                 — | KEEP     |                                                                                                           |
| `.gitignore`                                                                          | Ignores                             |                46 | REFACTOR | `docs/*` (to un-ignore in 1.1); ignores `.agents/ .claude/ .windsurf/` but `skills-lock.json` is tracked. |
| `.env.local.example`                                                                  | Env template                        |                 3 | KEEP     | CRLF.                                                                                                     |
| `AGENTS.md` / `CLAUDE.md`                                                             | Agent instructions                  |            47 / 1 | REFACTOR | Drift, §10.                                                                                               |
| `README.md`                                                                           | Project readme                      |               181 | REFACTOR | Drift, §10.                                                                                               |
| `LICENSE`                                                                             | GPL-3.0                             |               674 | KEEP     | Noted §11. CRLF.                                                                                          |
| `skills-lock.json`                                                                    | Prisma agent-skills lock            |                59 | DEAD     | Project doesn't use Prisma.                                                                               |
| `.agents/`, `.claude/`, `.windsurf/` (untracked)                                      | 9 Prisma skills each                |                 — | DEAD     | Ignored but present locally.                                                                              |
| `public/logo.svg`                                                                     | App logo                            |               295 | KEEP     | Only referenced by README via the deployed URL. CRLF.                                                     |
| `public/{file,globe,next,vercel,window}.svg`                                          | create-next-app SVGs                |            1 each | DEAD     | No references anywhere.                                                                                   |
| `public/hugeicons/*.json`                                                             | 5,437 per-icon JSON files           |                 — | REFACTOR | §8.                                                                                                       |
| `docs/sl-maps-schema-design.md`, `docs/sl-maps.html`, `docs/sl-maps-style-guide.html` | Design docs (ignored)               | 686 / 1604 / 1770 | KEEP     | Schema doc §8 RPC signatures have drifted (§4).                                                           |

### PARKED (do not remove)

- `placemarks.want_to_go` column; its index `idx_placemarks_want_to_go` still exists (0003 was a no-op).
- Light theme tokens `[data-theme="light"]` (`app/globals.css:53-94`) and `--map-a`/`--map-b`.
- Schema features the app doesn't use yet: `collections`, `collection_items`, `media`, `placemark_conflicts`, the `revision`/`server_seq` sync columns and `sync_seq`, and the original RPCs `placemarks_near`, `placemarks_mvt`, `placemark_upsert`, `placemark_as_json`, `sync_pull`.
- `categories.attributes_schema` editing (CategoryDetail L308-322) and `placemarks.attributes` (unused by the form).

---

## 1. Shell

### 1.1 Who owns what

| Piece                                     | Runs on                 | Owns                                                                                                                                                                                                                                          |
| ----------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/layout.tsx`                    | Server                  | `getUser()` (L18-21) for `email`; a `Suspense` boundary (L29) around everything; provider order FilterTransition → MapControls → SearchResults → Shell; layout DOM (rail, `{children}`, map container).                                       |
| `ShellProvider` (ShellContext.tsx:57-131) | Client                  | `activeContext` derived from pathname + `?panel` (L43-50, L61-64); `panelOpen` (desktop, default true) and `sheetOpen` (mobile, default false) state; `selectContext` navigation (L85-116); remembers `/`'s params in `mapQueryRef` (L68-78). |
| `AppRail`                                 | Client                  | Buttons, active styling from `panelOpen`/`sheetOpen`, filter badge (`useFilterParams().activeFilterCount`), sign-out forms.                                                                                                                   |
| `ContextPanel`                            | Client                  | Panel chrome; reads `panelOpen`/`sheetOpen`, calls `setSheetOpen(false)`. Rendered by each page (MapPanelSwitcher, ReviewList, categories page, PanelSkeleton).                                                                               |
| `DetailPanel`                             | Client                  | Panel chrome, Escape listener, left edge from `panelOpen`. Rendered by DetailDrawer, ReviewDetailPanel, CategoryDetailPanel.                                                                                                                  |
| Pages                                     | Server (+client leaves) | `/`: MapPanels (server data) + DetailDrawer (client data). `/review`: redirect + all-client queue. `/categories`: all-server list + detail.                                                                                                   |

Because the whole shell sits under one `Suspense` and every provider calls `useSearchParams`, nothing in the shell is server-rendered HTML beyond `AppShellSkeleton`. All signed-in UI below the layout is client-rendered after hydration.

### 1.2 What reruns on each navigation

| Navigation                                                   | Mechanism                                                    | Server                                                                                                                                                                            | Client                                                                                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rail click to another route (`/` → `/review`, `/categories`) | `router.push` (ShellContext.tsx:95, :115)                    | proxy `getUser` (Auth round trip) + the new page segment only. The `(app)` layout is shared so it is **not** re-rendered on client navigation. `loading.tsx` shows PanelSkeleton. | Layout and providers keep state. MapView's pathname effect (MapView.tsx:839-841) calls `refresh()`; placing is cleared (L847-851).                                                                    |
| Search ↔ Filters on `/`                                      | `history.pushState` (ShellContext.tsx:107)                   | Nothing                                                                                                                                                                           | `activeContext` changes; MapPanelSwitcher swaps panels; FilterPanel mounts and fires an exact count (FilterPanel.tsx:21-43).                                                                          |
| Pin click                                                    | `history.pushState` (MapView.tsx:776)                        | Nothing                                                                                                                                                                           | DetailDrawer fetches `placemark_details`; padding effect (L857-873) eases → `moveend` → `replaceState` (L99-106) + 300 ms debounced `placemarks_geojson`.                                             |
| `/review` → `/` via rail                                     | `router.push('/?<saved params>')` (ShellContext.tsx:111-115) | proxy `getUser` + page: MapPanels (categories + ⌈N/1000⌉ paging requests)                                                                                                         | Pathname effect → RPC; if the saved params differ from `/review`'s, `filtersKey` changes and the filters effect (L913-921) fires a second RPC (the first is superseded by request id but still sent). |

### 1.3 The map never remounts — confirmed

- The init effect has an empty dependency list (MapView.tsx:421-829); the only `new mapboxgl.Map` is at L447, guarded by `if (mapRef.current ...) return` (L422).
- MapView is rendered once in the `(app)` layout (layout.tsx:39), which persists across `/`, `/review`, `/categories`. Nothing keys it.
- Leaving the `(app)` group (sign-out → `/sign-in`) does unmount it, which is correct.

### 1.4 Layout values in both Tailwind and JS

| Value                             | Tailwind                                                      | JavaScript                                                                                                           |
| --------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 768px desktop breakpoint          | every `md:` class                                             | `DESKTOP_QUERY` ShellContext.tsx:29; `matchMedia('(min-width: 768px)')` MapView.tsx:191                              |
| Context panel width 20rem         | `md:w-80` ContextPanel.tsx:27; `w-80` AppShellSkeleton.tsx:16 | `md:left-80` DetailPanel.tsx:35 (class, but a hand-mirrored value)                                                   |
| Detail panel height ⅔ (desktop)   | `md:h-2/3` DetailPanel.tsx:34                                 | `2 / 3` in `detailBottomPadding` MapView.tsx:192                                                                     |
| Detail panel height (mobile)      | `max-h-[85%]` DetailPanel.tsx:34 (content height)             | `0.5` MapView.tsx:192 (approximation; does not match)                                                                |
| Toolbar offset under zoom control | `md:top-23` AddPlacemarkToolbar.tsx:32                        | ZoomControl's height (button sizes in MapView.tsx:268)                                                               |
| `--crimson` etc. fallbacks        | `globals.css`                                                 | hex fallbacks in `cssVar` calls (MapView.tsx:581, 592, 603, 618, 654, 655, 896); pin colours in markerIcons.ts:33-35 |

### 1.5 DetailPanel Escape handler — **confirmed bug**

- DetailPanel binds `onClose` once at mount with deps `[]` and an eslint-disable (DetailPanel.tsx:21-30).
- DetailPanel stays mounted while `?id` changes (same element in the same position in DetailDrawer.tsx:88-89), so the listener keeps the **first** `close` closure.
- That `close` (DetailDrawer.tsx:51-62) rebuilds the URL from `searchParams` of the render where the panel opened.
- Reproductions (by reading the code):
  1. Open pin A → toggle a category filter (Filters panel stays usable beside the detail panel) → Escape: the pushed URL drops the new `cat`, so the filter silently reverts and the map refetches.
  2. Open pin A → type a new search → Escape: `q` reverts to the old value and the search re-fires.
  3. Open pin A → pan (moveend `replaceState`s `mlat/mlng/z`) → Escape: the URL gets the old camera params while the camera stays put; the next pan corrects it.
  4. Open pin A → click pin B → Escape: `id` is deleted (correct) but any other param changes since A opened are reverted.
- Mouse close (`onClick={onClose}`, L40, L46) uses the fresh prop, so only Escape is affected.
- **Same bug** in ReviewDetailPanel.tsx:64-69 (only `id`/camera params at stake there). CategoryDetailPanel's close (`router.push('/categories')`) has no captured state, so it is unaffected.
- **Likely, not verified:** Escape inside LogVisitModal's `<dialog>` closes the dialog natively _and_ bubbles to the window listener, closing the detail panel too (LogVisitModal.tsx:64-71 + DetailPanel.tsx:22-25). Check in the browser.

---

## 2. URL state

### 2.1 Every search param

| Param                        | Meaning                                                                | Read by                                                                                                                                               | Written by                                                                                                                                                                                                    | Routes                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`                         | Placemark id on `/` and `/review`; **category id** on `/categories`    | DetailDrawer L15; ReviewDetailPanel L20; ReviewList L10; SearchResultsList L11; MapView L337 (padding + create); review page L27; categories page L13 | MapView L766/776, L240; DetailDrawer L53/79; SearchResultsList L26; ReviewList L24; ReviewDetailPanel L59/66; review page redirect L32; CategoryNavLink hrefs; category action redirects; CopyPermalinkButton | all                                                                                                               |
| `edit`                       | `1` = edit mode                                                        | DetailDrawer L16                                                                                                                                      | DetailDrawer L67/73; MapView L243 (delete)                                                                                                                                                                    | `/`                                                                                                               |
| `lat`, `lon`                 | Draft placemark location                                               | DetailDrawer L18-19; MapView L339-340                                                                                                                 | MapView `openCreatePanel` L241-242; DetailDrawer deletes                                                                                                                                                      | `/`                                                                                                               |
| `mlat`, `mlng`, `z`          | Camera                                                                 | MapView `parseInitialView` L72-93 (mount only)                                                                                                        | MapView `updateViewParams` L99-106 (every moveend, **on every route**); CopyPermalinkButton                                                                                                                   | all                                                                                                               |
| `panel`                      | `filters` or absent                                                    | ShellContext L63                                                                                                                                      | ShellContext L104-105, L112-113                                                                                                                                                                               | `/`                                                                                                               |
| `cat`                        | Comma-separated category ids                                           | useFilterParams L24; MapView `parseFilters` L109; SearchResultsProvider L45; api/search L64                                                           | useFilterParams L59-74, L84-89                                                                                                                                                                                | `/`                                                                                                               |
| `visited`                    | `1`/`0`                                                                | useFilterParams L26; MapView L111; SearchResultsProvider L46; api/search L66                                                                          | useFilterParams L76-89                                                                                                                                                                                        | `/`                                                                                                               |
| `q`                          | Text search                                                            | useFilterParams L34; MapView L115; SearchResultsProvider L42                                                                                          | useFilterParams `setQuery` L91-96, clearSearch                                                                                                                                                                | `/`                                                                                                               |
| `near`                       | `lat,lon`                                                              | useFilterParams L35; MapView L116; SearchResultsProvider L43                                                                                          | useFilterParams `setNear` L101-112, clearNear, clearSearch                                                                                                                                                    | `/`                                                                                                               |
| `radius`                     | metres                                                                 | useFilterParams L37; SearchResultsProvider L44                                                                                                        | useFilterParams L108, L114-118                                                                                                                                                                                | `/`                                                                                                               |
| `place`                      | Label for `near`                                                       | useFilterParams L38                                                                                                                                   | useFilterParams L109-110                                                                                                                                                                                      | `/`                                                                                                               |
| `proximity`                  | `1` = proximity toggle on                                              | useFilterParams L39                                                                                                                                   | useFilterParams L142-147                                                                                                                                                                                      | `/`                                                                                                               |
| `page`                       | —                                                                      | —                                                                                                                                                     | —                                                                                                                                                                                                             | Not a URL param. The review page index is React state (ReviewQueueContext L54-55), so a reload returns to page 1. |
| `error`                      | Category form error code                                               | categories page L15                                                                                                                                   | category actions' redirects (categories.ts L77-91, L152-176, L207, L218)                                                                                                                                      | `/categories`                                                                                                     |
| `needs_review`               | Scope search to backlog                                                | api/search L69                                                                                                                                        | Nothing in the app                                                                                                                                                                                            | API only                                                                                                          |
| `lat`, `lon`, `radius` (API) | Search API's own names (different meaning from the page's `lat`/`lon`) | api/search L33-55                                                                                                                                     | SearchResultsProvider L66-69                                                                                                                                                                                  | API only                                                                                                          |

### 2.2 Raw history calls

| File:line                       | Call                          | Purpose                                 |
| ------------------------------- | ----------------------------- | --------------------------------------- |
| MapView.tsx:105                 | `replaceState`                | Camera params on every moveend          |
| MapView.tsx:244                 | `pushState`                   | Open create panel                       |
| MapView.tsx:776                 | `pushState`                   | Pin click                               |
| ShellContext.tsx:107            | `pushState`                   | Search ↔ Filters                        |
| DetailDrawer.tsx:61, 68, 74, 83 | `pushState` ×4                | close / openEdit / closeEdit / openView |
| useFilterParams.ts:55           | `pushState` (in a transition) | Every filter/search mutation            |
| SearchResultsList.tsx:29        | `pushState`                   | Select result                           |
| ReviewList.tsx:28               | `pushState`                   | Select queue item                       |
| ReviewDetailPanel.tsx:61, 68    | `pushState` ×2                | advance / close                         |

That's 14 call sites in 7 files, each building `new URLSearchParams(...)` by hand. Two read `window.location.search` (MapView); the rest read the render's `searchParams`, which is how the stale-closure bug in §1.5 is possible.

### 2.3 Where the param list is repeated

1. `MAP_ROUTE_PARAMS` — ShellContext.tsx:18-27 (omits `mlat/mlng/z`, so returning to `/` drops them from the URL until the next moveend).
2. `parseFilters` — MapView.tsx:108-126 (`cat`, `visited`, `q`, `near`).
3. `useFilterParams` — useFilterParams.ts:23-39 (`cat`, `visited`, `q`, `near`, `radius`, `place`, `proximity`); `parseNear` (L12-17) duplicates MapView's inline near parsing (L117-123).
4. `SearchResultsProvider` — SearchResultsContext.tsx:42-46 (`q`, `near`, `radius`, `cat`, `visited`) and the default radius `50000` (L69) duplicating `DEFAULT_RADIUS_M` (useFilterParams.ts:10, route.ts:5).
5. `api/search` — route.ts:32-69 (server side; legitimately separate but parses `cat`/`visited` the same way).

### 2.4 `?id` on `/categories`

- MapView ignores `id=new` off `/` via `isMapRoute` (MapView.tsx:326-338).
- Pin click on `/categories` routes to `/?id=` with `router.push` instead of pushState (MapView.tsx:759-765).
- The padding effect (MapView.tsx:857-873) treats any `id` as "detail open", which is correct on `/categories` because CategoryDetailPanel is also a DetailPanel, but it's by coincidence rather than design.
- `updateViewParams` writes camera params onto `/review` and `/categories` URLs, including `/categories?id=<category>&mlat=…`.

---

## 3. Data access

N = live placemarks = **22,849** (of 22,876), so ⌈N/1000⌉ = **23** sequential requests per counting loop.

### 3.1 Every query

| File:line                                        | Query                                                               | Where          | Trigger                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| lib/supabase/middleware.ts:32                    | `auth.getUser()`                                                    | Server (proxy) | **Every** matched request: pages, RSC fetches, server actions, `/api/search`                             |
| app/(app)/layout.tsx:19                          | `auth.getUser()`                                                    | Server         | Full page load, refresh, and action re-renders that include the layout                                   |
| review/page.tsx:10-17                            | `placemarks` id, first `needs_review`                               | Server         | `/review` without `?id`                                                                                  |
| MapPanels.tsx:25-30                              | `placemarks` (category_id, visited) paged ×⌈N/1000⌉, **sequential** | Server         | Every render of `/`                                                                                      |
| MapPanels.tsx:58-62                              | `categories`                                                        | Server         | Every render of `/`                                                                                      |
| CategoryList.tsx:19-24                           | `categories`                                                        | Server         | Every render of `/categories`                                                                            |
| CategoryList.tsx:34-39                           | `placemarks` (category_id) paged ×⌈N/1000⌉, sequential              | Server         | Every render of `/categories` (every selection)                                                          |
| CategoryDetail.tsx:35-42, 50-59, 66-72, 80-89    | `categories` ×3, `placemarks` count, `categories` count             | Server         | Selected category (2 sequential waves)                                                                   |
| categories.ts:24-30                              | `categories` slug probe, **one query per suffix**                   | Server action  | create / createQuick                                                                                     |
| categories.ts:84-89, 158-173, 201-234            | parent check, child count, placemark count, reassign, delete        | Server action  | create / update / delete                                                                                 |
| placemarks.ts:42-58                              | `tags` select then insert **per tag**, sequential                   | Server action  | create / save with new tags                                                                              |
| placemarks.ts:73-87                              | `placemark_tags` delete-all then insert                             | Server action  | create / save                                                                                            |
| placemarks.ts:120-136, 176-187, 206-209, 231-236 | placemarks insert/update/soft delete, visits insert                 | Server action  | Form actions                                                                                             |
| api/search/route.ts:72                           | `rpc('placemarks_search')`                                          | Server         | `SearchResultsProvider` (300 ms debounce)                                                                |
| MapView.tsx:401-404                              | `categories` (id, color, icon)                                      | Browser        | Once per MapView lifetime                                                                                |
| MapView.tsx:523-530                              | `rpc('placemarks_geojson')`                                         | Browser        | style.load, moveend (300 ms), pathname change, filter change, categories loaded, `MapControls.refresh()` |
| markerIcons.ts:145                               | `fetch('/hugeicons/<icon>.json')`                                   | Browser        | Once per distinct category icon (module cache)                                                           |
| FilterPanel.tsx:25-35                            | `placemarks` **exact count**                                        | Browser        | **Every FilterPanel render** (see below), 200 ms debounce                                                |
| DetailDrawer.tsx:37-41                           | `placemark_details` `select('*')`                                   | Browser        | `?id` change, after edit save                                                                            |
| ReviewDetailPanel.tsx:35-41                      | `placemark_details` `select('*')`                                   | Browser        | `?id` change, cancel                                                                                     |
| ReviewQueueContext.tsx:67-86                     | `placemarks` page + 2 **exact counts**                              | Browser        | Mount, page change, **every advance** (save, skip, delete)                                               |
| PlacemarkForm.tsx:101-107                        | `categories`                                                        | Browser        | Every form mount (each edit, each review item)                                                           |
| TagInput.tsx:35-41                               | `tags` ilike                                                        | Browser        | Typing (200 ms)                                                                                          |
| IconPicker.tsx:32                                | `fetch('/hugeicons/<name>.json')`                                   | Browser        | Typing a valid icon name                                                                                 |
| SearchBox.tsx:118-119                            | Mapbox geocode v6                                                   | Browser        | Typing (300 ms)                                                                                          |

### 3.2 Requests per interaction (by reading the code)

| Interaction                    | Server                                                                        | Browser                                                                                                                                                           | Notes                                                                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First load of `/`              | 2 × getUser, 1 categories, ⌈N/1000⌉ sequential count pages (≈23)              | 1 categories, k icon JSONs (k = distinct icons), 2–3 `placemarks_geojson`                                                                                         | Extra RPCs: `refresh()` after categories load (L413) races `style.load`'s refresh (L664); the padding effect's mount-time `easeTo` (L857-873) triggers a moveend → another RPC. +1 exact count if `?panel=filters`. |
| Back to `/` from another route | 1 getUser (proxy), 1 categories, ≈23 count pages                              | 1–2 RPCs, +1 count if Filters, +1 `/api/search` if `q`/`near` was saved                                                                                           |                                                                                                                                                                                                                     |
| Opening `/review` (no `id`)    | getUser, firstUnsortedId, **redirect round trip** (getUser again)             | 1 page query + 2 exact counts, 1 `placemark_details`, 1 RPC (pathname), 1 more RPC after `flyTo` (ReviewDetailPanel L50-54) settles, + PlacemarkForm's categories |                                                                                                                                                                                                                     |
| Opening `/categories`          | getUser, categories, ≈23 count pages                                          | 1 RPC (pathname)                                                                                                                                                  |                                                                                                                                                                                                                     |
| Selecting a category           | getUser, categories, ≈23 count pages **again**, + 5 detail queries in 2 waves | 0–1 RPC (padding easeTo → moveend)                                                                                                                                | The list re-renders because the whole page is searchParams-driven.                                                                                                                                                  |
| Clicking a pin                 | —                                                                             | 1 `placemark_details`, 1 RPC (padding moveend), +1 exact count if Filters is open                                                                                 |                                                                                                                                                                                                                     |

### 3.3 Flags

1. **Counting in JS by paging the table.** `getAggregates` (MapPanels.tsx:17-48) and `getCategoryCounts` (CategoryList.tsx:30-49) fetch every live placemark 1,000 rows at a time, **sequentially**, to count by category and visited. ≈23 round trips and ~22k rows per render of `/` and `/categories`. One `group by category_id, visited` query or RPC replaces both.
2. **`findOrCreateTags`** (placemarks.ts:31-63): 1–2 sequential queries per new tag. One `insert … on conflict … returning` (or an RPC) does it in one.
3. **`uniqueSlug`** (categories.ts:16-34): one query per collision suffix. One `like 'base%'` query, or let the unique index decide.
4. **Categories fetched repeatedly.** MapView (browser, once), MapPanels (server, every `/` render), PlacemarkForm (browser, every form mount), CategoryList (server), CategoryDetail (3 different category queries), ReviewQueue (embedded `categories(slug)` join). The form's list could come from the server render.
5. **Exact counts on every load.** ReviewQueueContext runs two `count: 'exact'` queries on every page load **and every Save & next / Skip** (L67-86, L147). `total` (all live placemarks) barely changes.
6. **`useMatchCount` fires on every render.** Its dependency `activeCatIds` is a new `Set` each render (useFilterParams.ts:23 → FilterPanel.tsx:43). FilterPanel re-renders on every searchParams change, including every moveend `replaceState`. With Filters open, **every pan and every pin click issues an exact count**.
7. **Two `getUser` calls per full page load.** proxy (middleware.ts:32) plus the layout (layout.tsx:19). Both are network calls to Supabase Auth. The layout only needs `email`; the installed supabase-js 2.112 has `auth.getClaims()` (local JWT verification).
8. **Server actions re-render the current route.** Per the Next 16 docs (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md:43-48`), an action that calls `revalidatePath` returns a fresh render of the **current route** in the same response. `createPlacemark`, `savePlacemark` and `deletePlacemark` all call `revalidatePath('/review')` (placemarks.ts:146, 195, 212), so:
   - every save and every description **autosave on blur** (PlacemarkForm.tsx:176-189) on `/` re-runs MapPanels, including the ≈23-request counting loop;
   - every Save & next on `/review` re-runs the review page.
     Verify with server logs before acting on it.
9. **Visited filter in JS.** `placemarks_geojson` has no visited argument; MapView fetches everything in the bbox and drops non-matching rows in `toRenderableFeatures` (MapView.tsx:151-154).
10. **`placemark_details` overfetch.** `select('*')` returns full `geom` GeoJSON, `media`, `visits` and `attributes`; the UI uses none of those.
11. **No AbortController anywhere.** Stale responses are ignored by request id (MapView, SearchBox, SearchResultsContext, TagInput, IconPicker), but the requests still run to completion.

---

## 4. Database

### 4.1 What the app depends on that this repo doesn't define

All defined in `C:\Users\dave\Repos\sl-maps-supabase\sl-maps\supabase\migrations\` (and possibly changed by hand since):

- **Tables:** `profiles`, `categories`, `tags`, `placemarks`, `placemark_tags`, `visits` (+ parked `media`, `collections`, `collection_items`, `placemark_conflicts`).
- **Column behaviour the app relies on:** `placemarks.anchor` and `geom_kind` (generated), `visited` (generated from `visit_count`), `visit_count/first_visited_on/last_visited_on` (trigger), `tag_filter_string` (trigger), `search_vector` (generated), `tags.usage_count` (trigger, used for autocomplete ordering), `owner_id` defaults via `default_owner_id()` (the app omits `owner_id` on `placemark_tags`).
- **View:** `placemark_details` (views.sql:20-76, `security_invoker = true`).
- **Triggers:** `touch_sync` on six tables (sets `updated_at`, `revision`, `server_seq`); `visits_refresh_stats`; `placemark_tags_refresh_string`; `placemark_tags_refresh_usage`; `categories_depth_guard`; `on_auth_user_created` on `auth.users`.
- **Functions:** `default_owner_id()` (security definer), `uuid_generate_v7()`, `touch_sync()`, `enforce_category_depth()`, the refresh functions, `handle_new_auth_user()` (security definer).
- **RLS:** owner policies on every table plus three public-read policies for collections (rls.sql).
- **RPCs:** original `placemarks_geojson` (7 args) and `placemarks_search` (7 args) from rpc.sql; replaced (or overloaded) by this repo's 0004 and 0006.

### 4.2 Drift

| #   | Drift                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                             | Status                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Two `placemarks_geojson` overloads. The original `(double×4, uuid[], uuid[], int)` returns full `geom`, top-level `id`, `want_to_go`, and `LIMIT 5000`; 0004's `(double×4, uuid[], boolean)` returns `anchor`, `id` in properties, **no limit**. Different arg types mean `create or replace` added a function instead of replacing one. PostgREST resolves the app's call by named args to the new one. | rpc.sql:58-115 vs sql/0004:21-54                     | **Confirmed** (both live)                                                                          |
| 2   | Two `placemarks_search` overloads: original 7-arg `returns table`, 0006's 8-arg `returns jsonb`.                                                                                                                                                                                                                                                                                                         | rpc.sql:181-246 vs sql/0006:57-166                   | **Confirmed** (both live)                                                                          |
| 3   | 0006 blocks 1–3 duplicate objects the sibling repo already created (`search_vector`, `idx_placemarks_search`, `idx_placemarks_anchor_geog`); block 1 would fail with "column already exists".                                                                                                                                                                                                            | placemarks.sql:62-65, indexes.sql:23-29              | **Confirmed** — one copy of each index live; 0006 was applied partially (only block 4 took effect) |
| 4   | 0003 drops `idx_placemarks_wtg`; the real index is `idx_placemarks_want_to_go`.                                                                                                                                                                                                                                                                                                                          | indexes.sql:48-50                                    | **Confirmed** — `idx_placemarks_want_to_go` is live (query 7)                                      |
| 5   | 0004/0006 functions have no `set search_path` (all sibling functions do).                                                                                                                                                                                                                                                                                                                                | sql/0004:29-32, sql/0006:67-70                       | **Confirmed** (live definitions have no `SET search_path`; the old overloads do)                   |
| 6   | Schema doc §8 lists `placemarks_geojson(in_bbox geometry, …)`; neither the original nor 0004 matches.                                                                                                                                                                                                                                                                                                    | docs/sl-maps-schema-design.md:514                    | Confirmed                                                                                          |
| 7   | "IDs are client-generated" (schema doc rule 2, README L111). In the app only tags get a client id (`crypto.randomUUID()`, a **v4**, placemarks.ts:56); placemarks, categories and visits use the server's `uuid_generate_v7()` default.                                                                                                                                                                  | placemarks.ts:120-136, categories.ts:96-109, 231-236 | Confirmed                                                                                          |
| 8   | The app writes `updated_at` (placemarks.ts:185, categories.ts:188, 224); `touch_sync` overwrites it. Redundant.                                                                                                                                                                                                                                                                                          | sync_core.sql:15-32                                  | Confirmed                                                                                          |
| 9   | Soft-deleting a placemark doesn't update `tags.usage_count` (the trigger only fires on `placemark_tags` insert/delete). Tag autocomplete order drifts.                                                                                                                                                                                                                                                   | triggers.sql:102-125                                 | Confirmed                                                                                          |
| 10  | `refresh_placemark_tag_string` fires per row; `replacePlacemarkTags` (delete-all + insert-all) runs it 2× per tag, each an UPDATE that bumps `server_seq`.                                                                                                                                                                                                                                               | triggers.sql:73-100                                  | Confirmed (cost is small at single-digit tags)                                                     |
| 11  | `visits_not_future` check vs `visited_on` now nullable: NULL passes, which is intended.                                                                                                                                                                                                                                                                                                                  | visits.sql:33, sql/0005                              | OK                                                                                                 |
| 12  | `anon` can execute **every** function in `public` (18 app functions, both overloads of each RPC). `revoke … from anon` on `default_owner_id` (profiles.sql:65) didn't take effect, because Postgres grants EXECUTE to `PUBLIC` by default and `anon` inherits it.                                                                                                                                        | Query 3b                                             | **Confirmed** — see §9                                                                             |

---

## 5. Write paths

| Action                                    | Checks user                           | Validates input                                                                            | Atomic                                                                                                                         | Reports errors by                                                            |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `signIn` (auth.ts:8)                      | n/a                                   | `as string` casts only                                                                     | n/a                                                                                                                            | `{ error }` (Supabase message)                                               |
| `signOut` (auth.ts:28)                    | n/a                                   | —                                                                                          | n/a                                                                                                                            | Ignores errors; redirect                                                     |
| `createCategory` (categories.ts:67)       | ✅ → redirect                         | name, JSON object, icon in list, parent is top-level                                       | ❌ slug probe then insert (race → unique-index error)                                                                          | redirect `?error=` for validation; **throw** for DB errors (L110)            |
| `createCategoryQuick` (categories.ts:120) | ✅ → `{ error: 'not_authenticated' }` | name only — **no colour/icon/parent checks**                                               | ❌ (slug probe)                                                                                                                | `{ error }` with raw codes (`name_required`) shown verbatim by PlacemarkForm |
| `updateCategory` (categories.ts:146)      | **❌ never calls getUser**            | name, JSON, icon, parent depth (duplicates the DB trigger)                                 | ❌                                                                                                                             | redirect for validation; **throw** (L191)                                    |
| `deleteCategory` (categories.ts:198)      | **❌**                                | Replacement not validated (could be the same id, a deleted category or someone else's)     | ❌ reassign placemarks (L220-228) **then** soft-delete (L231-234); failure in between leaves them moved but the category alive | redirect; **throw** (L228, L235)                                             |
| `createPlacemark` (placemarks.ts:92)      | ✅                                    | name, category, finite lat/lon; **no** range check on lat/lon, priority NaN, or URL scheme | ❌ insert, then tag find-or-create, then tag replace. A tag failure **throws** after the placemark exists.                     | `{ error }`; tag helpers **throw**                                           |
| `savePlacemark` (placemarks.ts:154)       | ✅                                    | name, category                                                                             | ❌ update, then delete-all tags, then insert tags. Failure between them loses the tags.                                        | `{ error }`; tag helpers throw                                               |
| `deletePlacemark` (placemarks.ts:202)     | **❌**                                | —                                                                                          | single statement                                                                                                               | `{ error }`                                                                  |
| `logVisit` (placemarks.ts:220)            | ✅                                    | **none** (date format/future date left to the DB check)                                    | single insert                                                                                                                  | `{ error }`                                                                  |

Cross-cutting:

- **Silent no-ops.** Under RLS, an expired session or a wrong id turns `update … where id = x` into a 0-row update with no error. No action checks the affected row count (`.select()` or `count`), so `updateCategory`, `deleteCategory`, `deletePlacemark` and `savePlacemark` can report success having done nothing.
- **Three error styles:** throw, return `{ error }`, redirect with `?error=`. Raw codes reach the UI in PlacemarkForm (`not_authenticated`, `name_required`).
- **`external_url`** is stored unvalidated and rendered as `<a href>` (DetailDrawer.tsx:246-255). React 19 blocks `javascript:` URLs, but an `http(s)` check belongs in the action.
- **`priority`**: `Number('abc')` → NaN → DB check error, surfaced as a raw Postgres message.
- **Client-generated UUIDs** are used for tags only (placemarks.ts:56), contrary to the schema convention (§4.2 #7).

---

## 6. Map (`components/map/MapView.tsx`)

### 6.1 Structure

**Module scope:** constants (L35-67), `parseInitialView` (L72-93), `updateViewParams` (L99-106), `parseFilters` (L108-126), `toPointGeometry` (L134-139), `toRenderableFeatures` (L145-181), `detailBottomPadding` (L189-193), `cssVar` (L195-201), `quietenBasemap` (L207-232), `openCreatePanel` (L238-245), `ZoomControl` class (L247-283).

**Effects and render-time logic:**

| #   | Lines   | Deps                                               | Owns                                                                                                                                                                                                                                                                                                                    |
| --- | ------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 398-419 | `[]`                                               | Fetch categories once → `registerCategoryIcons` → `categoryStylesRef` → `refresh()`                                                                                                                                                                                                                                     |
| 2   | 421-829 | `[]` (eslint-disable L828)                         | Geolocation wait → `initMap`: Map, ZoomControl, AttributionControl, `mapControls.register`, ResizeObserver, `refresh()` closure, `style.load` (source, 4 layers, icons, refresh), `load` (`setMapLoaded`, 4 hover + 2 click handlers), `moveend` (replaceState + 300 ms debounced refresh). Cleanup removes everything. |
| 3   | 834-837 | `[pathname, router]`                               | Mirror into `pathnameRef`/`routerRef`                                                                                                                                                                                                                                                                                   |
| 4   | 839-841 | `[pathname]`                                       | `refresh()` on route change unless searching                                                                                                                                                                                                                                                                            |
| 5   | 847-851 | render                                             | Adjust state during render: drop `placing` when leaving `/`                                                                                                                                                                                                                                                             |
| 6   | 857-873 | `[detailId, mapLoaded]`                            | `easeTo` padding (+ queued center) when the detail panel opens/closes/changes                                                                                                                                                                                                                                           |
| 7   | 878-883 | `[placing]`                                        | Mirror `placingRef`; canvas cursor                                                                                                                                                                                                                                                                                      |
| 8   | 888-907 | `[isCreating, draftLat, draftLon, mapLoaded]`      | Draft marker                                                                                                                                                                                                                                                                                                            |
| 9   | 913-921 | `[filtersKey, searchActive]` (eslint-disable L920) | Mirror `filtersRef`/`searchActiveRef`; `refresh()` unless searching                                                                                                                                                                                                                                                     |
| 10  | 928-955 | `[searchActive, searchCollection, mapLoaded]`      | Render search results and fit bounds                                                                                                                                                                                                                                                                                    |

**Refs (16):** `containerRef`, `mapRef`, `resizeObserverRef`, `categoryStylesRef`, `filtersRef`, `searchActiveRef`, `refreshRef`, `moveTimeoutRef`, `requestIdRef`, `inFlightRef`, `pendingCenterRef`, `placingRef`, `draftMarkerRef`, `detailOpenRef`, `pathnameRef`, `routerRef`.

**Refs that exist only to give once-bound handlers fresh values:**

| Ref                               | Read by                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `pathnameRef`                     | `refresh` (L529), point click (L762)                                                     |
| `routerRef`                       | point click (L763). `useRouter()` returns a stable instance, so this one is unnecessary. |
| `filtersRef`                      | `refresh` (L517, L545), search effect (L933)                                             |
| `placingRef`                      | hover/click handlers (L686-739)                                                          |
| `searchActiveRef`                 | `refresh` (L514), pathname effect (L840)                                                 |
| `detailOpenRef`                   | ResizeObserver (L489)                                                                    |
| `categoryStylesRef`, `refreshRef` | `style.load` (L660), moveend (L783), `mapControls` (L469)                                |

### 6.2 Every pathname branch

| Line    | Branch                                               |
| ------- | ---------------------------------------------------- |
| 330     | `isMapRoute = pathname === '/'`                      |
| 331-332 | `searchActive` only on `/`                           |
| 338     | `isCreating` only on `/`                             |
| 529     | `in_needs_review: pathnameRef.current === '/review'` |
| 762     | `/categories` pin click → `router.push('/?id=')`     |
| 850     | Leaving `/` clears `placing`                         |
| 961     | AddPlacemarkToolbar only on `/`                      |

Elsewhere: ShellContext.tsx:47-48 (`startsWith('/review')`, `'/categories'`), L71 and L99 (`=== '/'`).

### 6.3 Every moveend

1. `updateViewParams` → `replaceState` (L99-106). Next syncs this into `useSearchParams`, so **every consumer re-renders**: ShellProvider, AppRail, MapView, SearchResultsProvider (deps unchanged, no fetch), DetailDrawer, MapPanelSwitcher, FilterPanel (→ exact count, §3.3 #6), CategoryFilter, StatusFilter, SearchBox, SearchResultsList, ReviewList, ReviewDetailPanel. ShellProvider's save effect (L70-78) also re-runs.
2. A 300 ms debounced `refresh()` → `placemarks_geojson` for the new bbox (skipped while a search is active).

### 6.4 Every route change

Pathname effect → `refresh()` (scope switches to/from `needs_review`); `placing` reset; the padding effect fires if `id` differs between routes; `updateViewParams` keeps writing camera params onto the new route's URL.

### 6.5 Payload size of `placemarks_geojson`

The 0004 function has **no LIMIT**. Measured live (query 12; ~290 bytes per feature, before gzip):

| View                      | Features | JSON bytes |
| ------------------------- | -------: | ---------: |
| City, z12 Toronto         |      273 |     78,717 |
| Regional, z9 Toronto      |      523 |    151,631 |
| Default, z6 at −80.5,44.5 |    3,228 |    949,994 |

The default view takes **119 ms** of execution and 6,381 shared buffers (query 13). Zooming out further grows the response without bound; the whole dataset (22,849 rows) would be ≈6.6 MB. The function filters `p.anchor && envelope`, but the only spatial indexes are GIST on `geom` and on `anchor::geography` (query 7), so **no index serves this predicate** and every refresh scans the table. Indexing `anchor`, or filtering on `geom &&` as the original did, fixes that.

- city (z12 Toronto, bbox −79.47,43.64 → −79.29,43.76)
- regional (z9 Toronto, −80.11,43.25 → −78.65,44.15)
- default (z6 at −80.5,44.5, −86.30,41.00 → −74.70,48.00)

Bboxes approximate a 1056×900 px map (1440 px window minus rail and panel). The geolocated start is z13.

### 6.6 Is `toPointGeometry` still reachable?

**Dead — confirmed.** Both live RPCs the app calls return `ST_AsGeoJSON(p.anchor)` (query 2: the 6-arg `placemarks_geojson` and the 8-arg `placemarks_search`), and `anchor` is generated by `ST_PointOnSurface`, which always returns a Point. The MultiPoint workaround (MapView.tsx:128-139) dates from the **original** 7-arg `placemarks_geojson`, which returned full `geom` and is still installed but no longer called.

### 6.7 How long map construction can wait on geolocation

Without `mlat/mlng/z` in the URL, `initMap` waits for `getCurrentPosition` with `enableHighAccuracy: true, timeout: 10000` and no `maximumAge` (L795-806).

- The `timeout` only starts **after permission is granted**. While the permission prompt is up (first visit, or a browser that re-asks), the map is not constructed at all — indefinitely.
- After permission: up to 10 s. High accuracy on a phone means waiting for a GPS fix.
- `maximumAge` defaults to 0, so a recent fix is never reused.
- During the wait the full-screen "Loading map…" overlay shows and **nothing else map-related can start**: no style download, no tiles, no RPC.

### 6.8 Pin image cost

Per category: 2 variants (visited/unvisited) × a 96×135 px canvas (`32×45` logical × `PIXEL_RATIO` 3, markerIcons.ts:12-14) → `getImageData` = 51,840 bytes each. Live there are **50 categories with 48 distinct icons** (query 11), so first load does **100 canvas draws, 48 icon JSON fetches, and holds ≈5.2 MB of ImageData** in `pinDataCache` (L162), plus mapbox's copy in the GPU sprite atlas. Every basemap switch re-adds all 100 images from the cache.

### 6.9 Stale category styles on the persistent map — **confirmed bug**

- Effect 1 (L398-419) fetches categories **once per MapView lifetime**.
- `ensureCategoryPin` returns early when `map.hasImage(name)` (markerIcons.ts:218), and the image name is keyed by category id only (`pin-<id>-<visited>`).
- Since the map now persists across `/categories`, editing a category's colour or icon, or creating a category (including inline from PlacemarkForm), never updates the pins until a full page reload. New categories show the grey fallback pin.
- The `pinDataCache` comment (L154-161) still describes the old remount-on-navigation behaviour.

---

## 7. Client bundle

`next build` (Next 16.3.0, Turbopack) no longer prints per-route sizes. The numbers below come from each route's `*_client-reference-manifest.js` and `.next/static/chunks`. Total client JS is 2.92 MB raw.

| Route         | Route chunks (raw / gzip) | Biggest contributor                |
| ------------- | ------------------------: | ---------------------------------- |
| `/`           |         2,157 KB / 591 KB | mapbox-gl chunk                    |
| `/review`     |         2,148 KB / 589 KB | mapbox-gl chunk                    |
| `/categories` |         2,239 KB / 611 KB | mapbox-gl chunk + icon names chunk |
| `/sign-in`    |              17 KB / 5 KB | —                                  |

Plus the shared framework chunks loaded everywhere (react-dom 229 KB, two runtime chunks 128 KB and 113 KB raw).

| Chunk              |           Raw |   Gzip | Contents                                                         |
| ------------------ | ------------: | -----: | ---------------------------------------------------------------- |
| `1lbrglnqw0sfj.js` |      1,842 KB | 506 KB | **mapbox-gl**                                                    |
| `241y41e3xr5o6.js` |        250 KB |  66 KB | supabase-js (GoTrue, PostgREST) + `@supabase/ssr` browser client |
| `08ttfj81-47mu.js` |        229 KB |  72 KB | react-dom                                                        |
| `3r184_2tpd3ph.js` |        128 KB |  34 KB | Next runtime                                                     |
| `0cz1d0mv5g_q7.js` |        113 KB |  39 KB | Next runtime                                                     |
| `089k17r9o6jfd.js` |        111 KB |  28 KB | `hugeiconsNames.json` (IconPicker) — `/categories` only          |
| `32mx3pr68tj6_.js` |         32 KB |   9 KB | App map code + `HugeiconsIcon`                                   |
| CSS                | 41 KB + 33 KB |      — | Tailwind output + `mapbox-gl.css`                                |

**mapbox-gl loads on every signed-in route — confirmed.**

- `MapView.tsx:5` imports `mapbox-gl` statically, and the `(app)` layout renders MapView (layout.tsx:4, 39).
- The mapbox chunk is in the client manifest of `/`, `/review` and `/categories`.
- What it blocks: the rail, panels and providers are in the same client tree under the layout's Suspense boundary, so React can't hydrate any of them until the 1.84 MB chunk is downloaded, parsed and evaluated. Until then the shell is the static `AppShellSkeleton`, so rail and panel clicks do nothing.
- Lazy-loading MapView (`next/dynamic` with `ssr: false`, from a client wrapper) would let the rail and panels hydrate on the ~300 KB that remains.

**`'use client'` files: 34, not 32.** 32 `.tsx` plus `components/map/useFilterParams.ts` and `lib/map/markerIcons.ts`.

| Needs to be client (state, effects, handlers, browser APIs or context)                                                                                                                                                                                                                                                                                                                                                                                                                           | Doesn't need the directive                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MapView, ShellContext, AppRail, ContextPanel, DetailPanel, DetailDrawer, PlacemarkForm, TagInput, LogVisitModal, CopyPermalinkButton, SearchBox, SearchResultsContext, SearchResultsList, FilterPanel, CategoryFilter, StatusFilter, MapPanelSwitcher, FilterTransitionContext, MapControlsContext, ReviewQueueContext, ReviewList, ReviewDetailPanel, CategoryDetailPanel, CategoryNavLink, CategoryLoadingOverlay, CategoryTransitionContext, IconPicker, SubmitButton, `app/sign-in/page.tsx` | **PanelSkeleton** (no hooks; it can be a server component rendering client ContextPanel). **`lib/map/markerIcons.ts`** (a browser-only utility, not a component — `import 'client-only'` states that correctly). **`useFilterParams.ts`** (hook module, only imported by client files). **AddPlacemarkToolbar**, **BasemapSwitcher** (only imported by MapView; redundant but harmless). `app/sign-in/page.tsx` could be a server page wrapping a small client form. |

**Who imports `lib/map/hugeiconsNames.json`:**

- **Client:** `components/categories/IconPicker.tsx:6` only, which ships as a 111 KB chunk on `/categories`. Used for `includes` (L26) and substring suggestions (L40-44).
- **Server:** `app/actions/categories.ts:7` (icon validation).

---

## 8. Icons

- **The pipeline:** `scripts/generate-hugeicons-names.mjs` regex-extracts each icon's SVG data from `node_modules/@hugeicons/core-free-icons/dist/esm/*Icon.js` into `public/hugeicons/<Name>.json` and writes the name list to `lib/map/hugeiconsNames.json`. The script comment (L5-12) explains why: Turbopack can't resolve a dynamic `import()` into that package's subpath exports.
- **Size:**
  - 5,437 files, 5.62 MB apparent size.
  - 22 MB on disk on NTFS, from per-file cluster overhead (the "19 MB" figure is disk usage).
  - Committed once (`f7ddc45`). Git compresses the JSON well: the whole repo pack is 2.59 MiB.
- **Readers:**
  - `components/categories/IconPicker.tsx:32`, the preview of a typed icon name.
  - `lib/map/markerIcons.ts:145`, the glyphs baked into map pins. Only icons actually assigned to categories are ever fetched: 48 of the 5,437.
- **Effect on clone size:** small in bytes (packed), but the checkout writes 5,437 files, which is slow on Windows and inflates editor indexing and grep.
- **Effect on deploy size:** Vercel uploads `public/` as static assets, so every deploy carries 5,437 files (deduped by hash across deploys, but each still counts as a file).
- **Effect on build time:** essentially none. `next build` doesn't process `public/`; the build took 19 s wall with the icons present. Not measured without them.
- **Options (not decided here):**
  - A server route handler that reads one icon from the installed package on demand (cacheable).
  - Generating the JSON at build or postinstall time instead of committing it.
  - Committing only the icons categories use plus lazy-loading the picker's preview.

---

## 9. Security

- **What proxy.ts protects:** every path except the matcher's exclusions (proxy.ts:9-12): `_next/*` and any path ending in `.html .css .js .json .jpg .jpeg .webp .png .gif .svg .ttf .woff .woff2 .ico .csv .doc .docx .xls .xlsx .zip .webmanifest`.
  - `/hugeicons/*.json`, `/logo.svg` and `/favicon.ico` are public, which is fine (static).
  - Any future route ending in `.json` or `.csv` would also skip auth.
  - `/api/*` is matched twice (both patterns); the `trpc` part is boilerplate.
- **Unauthenticated `GET /api/search`:** the proxy returns a **307 redirect to `/sign-in`** (HTML), not a 401.
  - The handler never runs.
  - Even if it did, RLS (anon) would only expose `placemarks_public_read` rows.
- **Unvalidated params reaching an RPC:**
  - `cat` → `in_category_ids uuid[]` in `/api/search` (route.ts:64-65, 77) and in MapView (MapView.tsx:109-110, 528). A non-UUID makes Postgres raise `22P02`, which surfaces as a 500 "Search failed." or a `console.error`, and the map shows nothing.
  - Not injectable (PostgREST parameterises).
  - `q` reaches `ilike '%' || q || '%'` (sql/0006:93, 124), so `%`/`_` act as wildcards; harmless.
  - `TagInput`'s `.ilike('name', `%${q}%`)` (TagInput.tsx:39) has the same effect.
  - `radius` and `lat`/`lon` are validated.
- **RLS coverage (confirmed, queries 4–5):** RLS is enabled on all 10 app tables; `placemark_details` and `placemarks_active` are `security_invoker=true`; every policy is owner-scoped plus the three dormant public-read policies. The only RLS-less relations in `public` are PostGIS's `spatial_ref_sys` table and `geometry_columns`/`geography_columns` views — they exist because **PostGIS is installed in `public`**, not `extensions` as the sibling migrations intend. Supabase's linter flags `spatial_ref_sys` (read-only reference data; low risk) and "extension in public".
- **Function `search_path` (confirmed, query 2):** every sibling function sets it, including the security-definer `default_owner_id` and `handle_new_auth_user`; the two functions from this repo (0004's `placemarks_geojson`, 0006's `placemarks_search`) do not. See the grants bullet below.
- **Function grants (confirmed, query 3b):** `anon` and `authenticated` can execute all 18 app functions in `public`. What that exposes to an unauthenticated caller with the public anon key:
  - **`default_owner_id()`** is `SECURITY DEFINER`. Called as anon, `auth.uid()` is null, so it returns the **owner's profile UUID**. That's a small information leak, and it's the one function that bypasses RLS.
  - **Read RPCs are bounded by RLS**, since they are all `security invoker`: `placemarks_geojson` ×2, `placemarks_search` ×2, `placemarks_near`, `placemarks_mvt`, `sync_pull`. Anon sees only `placemarks_public_read` rows, and there are none today because collections are empty.
  - **Write functions are also bounded by RLS**: `placemark_upsert` and `rebuild_derived` (invoker) have no anon write policy, so their updates touch 0 rows. `rebuild_derived` is still callable by any signed-in user, which means a full-table rewrite on demand.
  - **Trigger functions** (`touch_sync`, the `refresh_*` functions, `enforce_category_depth`, `handle_new_auth_user`) return `trigger`, so they can't be invoked as RPCs.
  - **Fix (migration):** `revoke execute on all functions in schema public from public, anon;`. Then grant `authenticated` back only the RPCs the app calls (and `anon` only on whatever a future public layer needs), and set `alter default privileges … revoke execute on functions from public`. Supabase's own default privileges also grant to anon, so revoke those too.
- **Missing security headers** (next.config.ts is empty):
  - no `Content-Security-Policy` (or at least `frame-ancestors`)
  - no `X-Content-Type-Options`
  - no `Referrer-Policy`
  - no `Permissions-Policy` (the app uses geolocation)
    Vercel adds HSTS on its domains.
- **Mapbox token:** `NEXT_PUBLIC_MAPBOX_TOKEN` is in the client bundle by necessity (mapbox-gl), and is also sent as a query param to the geocoding API (SearchBox.tsx:118). Restrict it to the deployed origin(s) and needed scopes in the Mapbox account.
- **Secrets reaching the client:** none found.
  - Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_MAPBOX_TOKEN` are referenced.
  - No service-role key is used anywhere.
  - `.env.local` is gitignored (`.gitignore:34`).
  - Server actions return only ids/rows the user can already read.
- **Server actions as public endpoints:** `updateCategory`, `deleteCategory` and `deletePlacemark` rely solely on RLS (§5). That's safe against other users, but gives silent no-ops when the session has expired.

---

## 10. Docs drift

| Where                  | Claim                                                                                                                   | Reality                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AGENTS.md:13           | "See `sl-maps-schema-design.md` … `sl-maps.html` / `sl-maps-style-guide.html`" (repo root)                              | They live in `docs/`                                                                                                                                                                                |
| AGENTS.md:31           | FilterPanel "composes … `SearchField.tsx`"                                                                              | No `SearchField.tsx`. Search is `SearchBox.tsx` + `SearchResultsList.tsx` + `SearchResultsContext.tsx` + `app/api/search/route.ts`, none of them listed. FilterPanel doesn't compose search at all. |
| AGENTS.md:31           | Lists the map components                                                                                                | Omits `BasemapSwitcher`, `CopyPermalinkButton`, `LogVisitModal`, `PlacingCrosshair`, `MapPanelSwitcher` (it's mentioned), `SearchResultsContext`                                                    |
| AGENTS.md:36           | `lib/map/` — `categoryStyle.ts`, `markerIcons.ts`                                                                       | Also `basemaps.ts`, `hugeiconsNames.json`                                                                                                                                                           |
| AGENTS.md              | —                                                                                                                       | No mention of `scripts/`, `public/hugeicons/` or `app/api/search`                                                                                                                                   |
| AGENTS.md:33           | ReviewQueueContext "provided by the review page … (client-side queue …)"                                                | Accurate, but the sentence is garbled (two parentheticals)                                                                                                                                          |
| README.md:5            | `logo-light.svg`                                                                                                        | Doesn't exist (only `public/logo.svg`)                                                                                                                                                              |
| README.md:10           | NPM version badge for `next`                                                                                            | Copy-pasted; unrelated to this project                                                                                                                                                              |
| README.md:25           | "Drop a placemark by clicking the map in placing mode, or use device geolocation to place one at your current position" | Placing is crosshair + confirm (map is panned, not clicked); "Use my location" only recentres the map                                                                                               |
| README.md:92           | Script regenerates `lib/map/hugeicons/names.json`                                                                       | It's `lib/map/hugeiconsNames.json`                                                                                                                                                                  |
| README.md:111          | "UUIDs are client-generated"                                                                                            | Only tags (v4); everything else is a server v7 default (§4.2 #7)                                                                                                                                    |
| README.md:124          | `needs_review` search param                                                                                             | Supported by the API, unused by the app (fine, but say so)                                                                                                                                          |
| README.md:15           | "photo media"                                                                                                           | Image upload is out of scope; the schema supports it (PARKED)                                                                                                                                       |
| IconPicker.tsx:92      | "not yet used by map rendering"                                                                                         | Pins render category icons (markerIcons.ts)                                                                                                                                                         |
| app/layout.tsx:23      | "Interactive maps built with Mapbox and Next.js"                                                                        | Boilerplate                                                                                                                                                                                         |
| markerIcons.ts:154-161 | Cache survives "navigating to /categories and back" remounts                                                            | MapView no longer remounts                                                                                                                                                                          |
| SubmitButton.tsx:35-38 | "e.g. Save + Skip in ReviewDetail"                                                                                      | No such component/form                                                                                                                                                                              |

---

## 11. Repo hygiene

- **`lib/supabase.ts`:** DEAD (no importers; knip agrees).
- **`public/{file,globe,next,vercel,window}.svg`:** DEAD, no references in code, CSS or README.
- **Unused dependencies:**
  - `npx knip` reports `@next/env` (dependency) and `@types/mapbox-gl` (devDependency).
  - Verified by hand: nothing imports `@next/env` (Next loads env itself), and `mapbox-gl` 3.28 ships its own types (`"types": "dist/mapbox-gl.d.ts"`), so `@types/mapbox-gl` is redundant and may conflict.
  - knip also flags `scripts/generate-hugeicons-names.mjs` (a manual script; keep it, maybe add an npm script), the export `DEFAULT_BASEMAP_ID` (basemaps.ts:28, used only internally) and the type export `SearchFeatureProps` (SearchResultsContext.tsx:13).
- **Prisma leftovers:**
  - `.agents/skills/`, `.claude/skills/` and `.windsurf/skills/` each hold 9 Prisma skills (ignored by `.gitignore:39-41`).
  - `skills-lock.json` is **tracked** and locks those 9 skills.
  - The project doesn't use Prisma. These also surface as available skills in agent sessions.
- **Line endings:**
  - Exactly 10 tracked files check out with CRLF (`i/lf w/crlf`): `.env.local.example`, `LICENSE`, `app/layout.tsx`, `components/map/PlacemarkForm.tsx`, `components/map/placemarkDetails.ts`, `components/map/useFilterParams.ts`, `next.config.ts`, `package-lock.json`, `package.json`, `public/logo.svg`.
  - `core.autocrlf=true` locally; no `.gitattributes`.
  - Add `* text=auto eol=lf`.
- **Node version:** no `.nvmrc` and no `engines` field. README says Node 20+; `@types/node` is `^20`.
- **No error boundaries:** no `error.tsx`, `global-error.tsx` or `not-found.tsx` anywhere. Server components throw on query errors (MapPanels.tsx:32, 76; CategoryList.tsx:26, 41; CategoryDetail.tsx:44, 60, 73; review page L19), and so do category actions. Users get Next's default error page, and in the `(app)` group that loses the shell.
- **No scripts:** no `typecheck` or `test` script; `npm run build` is the only type check.
- **Licence:** GPL-3.0 (`LICENSE`, README badge). Fine for a personal project; noted because GPL obligations apply to anyone distributing a fork.
- **`tsconfig.tsbuildinfo`:** sits at the repo root and is ignored (`*.tsbuildinfo`). OK.

---

## 12. React hygiene

**eslint-disable comments: 6, all `react-hooks/exhaustive-deps`**

| File:line                  | Effect               | Why disabled                                 | Better option                                                                       |
| -------------------------- | -------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| MapView.tsx:828            | Map init             | Mount-once; reads `mapControls`, `basemapId` | Keep the mount-once intent; read via refs, or `useEffectEvent` for the registration |
| MapView.tsx:920            | Filters sync         | Keyed by `filtersKey` string, not `filters`  | Memoise `filters` from the param string, or derive a stable key                     |
| SearchBox.tsx:144          | Debounced geocode    | Omits `setQuery`                             | `useEffectEvent` for `setQuery`                                                     |
| ReviewDetailPanel.tsx:53   | flyTo on new details | Keyed by `details?.id`                       | Fly in the fetch callback instead of an effect                                      |
| ReviewQueueContext.tsx:121 | Load page            | `refreshToken` as trigger                    | Restructure around an explicit load function                                        |
| DetailPanel.tsx:29         | Escape listener      | Avoid re-subscribing                         | `useEffectEvent(onClose)` — fixes §1.5                                              |

**Duplicated request-id pattern (5×):** MapView (`requestIdRef` L299, L519, L537), SearchBox (L58, L111, L120), SearchResultsContext (L53, L60, L76-88), TagInput (L26, L32, L42), IconPicker (L23, L31, L35). None abort the underlying request.

**Duplicated debounce (5×, mixed delays):**

- MapView moveend: 300 ms (L783)
- SearchBox: 300 ms (L142)
- SearchResultsContext: 300 ms (L90; the comment claims it matches FilterPanel, which is 200 ms)
- TagInput: 200 ms (L44)
- FilterPanel `useMatchCount`: 200 ms (L37)

**State adjusted during render (2), both the documented React pattern; keep:**

- SearchBox.tsx:65-73: `lastQuery` → resets input/suggestions when `q` changes elsewhere.
- MapView.tsx:847-851: `lastPathname` → clears `placing` when leaving `/`.

**Other:**

- `MapControlsProvider` and `ShellProvider` create new context values every render (MapControlsContext.tsx:26-32, ShellContext.tsx:119-127). Every `useSearchParams` change re-renders their consumers anyway, so it's low impact today.
- `useFilterParams` returns a fresh `Set` each call. That's the root of §3.3 #6.
- `ReviewQueueContext.advanceFrom` fires `loadPage(page)` without awaiting it (L147), so its result can race the next selection.

---

## 13. Live database queries

Read-only. Run them in the Supabase SQL editor and send back the results. Query 12 runs as the editor role, which bypasses RLS; with one owner, the counts are the same.

```sql
-- 1. Public functions: signature, security definer, config (search_path), volatility
select p.oid::regprocedure as signature, p.prosecdef as security_definer,
       p.proconfig as config, p.provolatile as volatility
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
order by 1;

-- 2. Full definitions of what the app calls or depends on
select p.oid::regprocedure as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('placemarks_geojson','placemarks_search','touch_sync',
                    'refresh_placemark_visit_stats','refresh_placemark_tag_string',
                    'refresh_tag_usage_count','default_owner_id','enforce_category_depth',
                    'handle_new_auth_user')
order by 1;

-- 3. Execute grants for anon/authenticated on public functions
select p.oid::regprocedure as signature, r.role,
       has_function_privilege(r.role, p.oid, 'execute') as can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
cross join (values ('anon'), ('authenticated')) r(role)
where n.nspname = 'public' and p.prokind = 'f'
order by 1, 2;

-- 4. RLS status of every table/view in public
select c.relname, c.relkind, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced, c.reloptions
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p','v','m')
order by 1;

-- 5. Policies
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by 1, 2;

-- 6. View definitions
select c.relname, c.reloptions, pg_get_viewdef(c.oid, true) as definition
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v' order by 1;

-- 7. Indexes
select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' order by 1, 2;

-- 8. Triggers (public tables and auth.users)
select tgrelid::regclass as table_name, tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger
where not tgisinternal
  and (tgrelid::regclass::text not like 'auth.%' or tgrelid = 'auth.users'::regclass)
  and tgrelid::regclass::text not like 'storage.%' and tgrelid::regclass::text not like 'realtime.%'
order by 1, 2;

-- 9. Columns (incl. generated) and constraints of the tables the app touches
select table_name, column_name, data_type, is_nullable, column_default,
       is_generated, generation_expression
from information_schema.columns
where table_schema = 'public'
  and table_name in ('placemarks','categories','tags','placemark_tags','visits','profiles')
order by table_name, ordinal_position;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2;

-- 10. Row counts (total / live) per table
select 'profiles' as t, count(*) as total, count(*) as live from profiles
union all select 'categories', count(*), count(*) filter (where deleted_at is null) from categories
union all select 'tags', count(*), count(*) filter (where deleted_at is null) from tags
union all select 'placemarks', count(*), count(*) filter (where deleted_at is null) from placemarks
union all select 'placemark_tags', count(*), count(*) from placemark_tags
union all select 'visits', count(*), count(*) filter (where deleted_at is null) from visits
union all select 'media', count(*), count(*) filter (where deleted_at is null) from media
union all select 'collections', count(*), count(*) filter (where deleted_at is null) from collections
union all select 'collection_items', count(*), count(*) from collection_items
union all select 'placemark_conflicts', count(*), count(*) from placemark_conflicts;

-- 11. Placemark shape: review backlog, geometry kinds, anchor type, icons in use
select count(*) filter (where needs_review) as needs_review,
       count(*) filter (where visited) as visited,
       count(*) as live
from placemarks where deleted_at is null;
select geom_kind, geometrytype(anchor) as anchor_type, count(*)
from placemarks where deleted_at is null group by 1, 2 order by 3 desc;
select count(*) as categories, count(distinct icon) as distinct_icons,
       count(*) filter (where icon is null) as no_icon
from categories where deleted_at is null;

-- 12. placemarks_geojson payload at three views (bboxes approximate a 1056x900 px map)
select v.label,
       jsonb_array_length(x.j -> 'features') as features,
       octet_length(x.j::text) as bytes
from (values
  ('city z12 Toronto',      -79.47, 43.64, -79.29, 43.76),
  ('regional z9 Toronto',   -80.11, 43.25, -78.65, 44.15),
  ('default z6 (-80.5,44.5)', -86.30, 41.00, -74.70, 48.00)
) v(label, w, s, e, n)
cross join lateral (
  select placemarks_geojson(in_west => v.w, in_south => v.s, in_east => v.e, in_north => v.n,
                            in_category_ids => null::uuid[], in_needs_review => false) as j
) x;

-- 13. Plan for the default view (read-only; EXPLAIN ANALYZE runs the SELECT only)
explain (analyze, buffers)
select placemarks_geojson(in_west => -86.30, in_south => 41.00, in_east => -74.70, in_north => 48.00,
                          in_category_ids => null::uuid[], in_needs_review => false);
```

### Still pending

Nothing blocking. Optional confirmations: query 9's column listing (`anchor` type, `needs_review` default) and the first two parts of query 11 (backlog size, geometry kinds).

---

## 14. Prioritized top 10

| #   | Change                                                                                                                                                                                                                                                                                                                                                                                   | Impact                                                                                                                | Effort                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --- |
| 1   | **Count in Postgres.** One grouped-count RPC (or view) for per-category and visited counts replaces `getAggregates` (MapPanels.tsx:17-48) and `getCategoryCounts` (CategoryList.tsx:30-49): 23 sequential requests (22,849 rows) down to 1 on every render of `/` and `/categories`. Reuse it for the review progress (ReviewQueueContext.tsx:77-85).                                    | Performance                                                                                                           | M (migration + 2 call sites) |
| 2   | **Fix and bound `placemarks_geojson`.** Its `anchor &&` filter has no index, so every refresh scans all 22,849 rows (119 ms at the default view, 950 KB response). Add a GIST index on `anchor` (or filter on `geom`), a row limit or zoom-aware thinning, `in_visited` in SQL, and `set search_path`; then drop the unused 7-arg overloads of `placemarks_geojson`/`placemarks_search`. | Performance, security                                                                                                 | M (migration)                |
| 3   | **Stop server actions re-rendering `/`.** `revalidatePath('/review')` in placemarks.ts:146/195/212 makes every save and description autosave on `/` re-render the route, counting loop included. Scope revalidation to where it's needed, and use `MapControls.refresh()` / `router.refresh()` deliberately. Verify with server logs first.                                              | Performance                                                                                                           | S                            |
| 4   | **Lazy-load MapView/mapbox-gl.** `next/dynamic` with `ssr: false` behind a small client wrapper so the 1.84 MB (506 KB gz) chunk stops blocking hydration of the rail and panels on every signed-in route.                                                                                                                                                                               | Performance                                                                                                           | S                            |
| 5   | **Fix DetailPanel's stale Escape.** Use `useEffectEvent` (or a latest-ref) for `onClose`; remove the eslint-disable; check the LogVisitModal Escape interaction (§1.5).                                                                                                                                                                                                                  | Correctness                                                                                                           | S                            |
| 6   | **Fix `useMatchCount` firing on every render.** Key the effect on the `cat`/`visited` strings rather than a fresh `Set` (FilterPanel.tsx:43); today every pan or pin click with Filters open issues an exact count.                                                                                                                                                                      | Performance                                                                                                           | S                            |
| 7   | **Refresh pins when categories change.** The persistent map never re-reads categories (MapView.tsx:398-419), and `ensureCategoryPin`'s `hasImage` early return (markerIcons.ts:218) blocks updates. Edited colours/icons and new categories stay wrong until reload.                                                                                                                     | Correctness                                                                                                           | S                            |
| 8   | **Harden server actions.** `getUser` in `updateCategory`/`deleteCategory`/`deletePlacemark`; check affected rows; make tag replace and category reassign+delete atomic (RPCs); one `{ ok }                                                                                                                                                                                               | { error }`contract with human messages; validate`external_url`, lat/lon range, priority and the replacement category. | Correctness                  | M   |
| 9   | **One URL-state module.** A single param schema (parse + serialise, UUID validation for `cat`) and a `pushSearchParams(mutate)` helper that reads `window.location`. This replaces `MAP_ROUTE_PARAMS`, `parseFilters`, the SearchResultsProvider parsing and 14 hand-built pushState sites, and also removes the stale-closure class of bugs.                                            | Maintainability, correctness                                                                                          | M                            |
| 10  | **Don't gate map construction on geolocation.** Construct at the default (or last) view immediately and `easeTo` the fix when it arrives, so the style and tiles load in parallel. Today the map can wait indefinitely on the permission prompt, then up to 10 s (MapView.tsx:795-806).                                                                                                  | Performance (UX)                                                                                                      | S                            |

**Next tier, not in the top 10:**

- Error boundaries (`error.tsx`/`not-found.tsx` in `(app)`).
- Drop the layout's `getUser` or switch to `getClaims`.
- Batch `findOrCreateTags`/`uniqueSlug`.
- Narrow the `placemark_details` select.
- Share the details fetch between DetailDrawer and ReviewDetailPanel.
- Merge the two transition contexts.
- Security headers.
- Revoke `EXECUTE` from `public`/`anon` on app functions (§9); low effort, low risk.
- Mapbox token URL restrictions.
- Docs drift (§10).
- Delete dead files and dependencies (§11).
- Remove the Prisma skills and `skills-lock.json`.
- Add `.gitattributes`, `.nvmrc`/`engines`, and `typecheck`/`test` scripts.
- Decide on the icon pipeline (§8).
- Split MapView into hooks once items 4, 7, 9 and 10 have landed.

---

## 15. Live database results

Source: `docs/results.md` (queries 1–13 from §13, run against the live project on 2026-10-07).

| Finding                                                                                                                                                                              | Evidence        | Effect on this audit                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 22,849 live placemarks (22,876 total), 50 categories (48 distinct icons, 2 without), 8 tags, 163 tag links, 50 visits, 1 profile; media, collections, items and conflicts all empty  | Queries 10, 11  | ⌈N/1000⌉ = 23 in §3; pin cost in §6.8; PARKED tables really are unused                                                             |
| Both `placemarks_geojson` overloads and both `placemarks_search` overloads are installed. The app's calls resolve to 0004's and 0006's versions.                                     | Query 2         | §4.2 #1–2 confirmed; the 7-arg versions are dead weight to drop in a migration                                                     |
| 0004 and 0006 functions have no `SET search_path`; every other app function sets it                                                                                                  | Query 2         | §4.2 #5, §9 confirmed                                                                                                              |
| **No index serves `anchor && envelope`.** Spatial indexes are `idx_placemarks_geom` (GIST on `geom`) and `idx_placemarks_anchor_geog` (GIST on `anchor::geography`).                 | Query 7, 13     | **New** performance finding (§6.5, top-10 #2)                                                                                      |
| `placemarks_geojson` payload: 273 / 523 / 3,228 features and 79 KB / 152 KB / 950 KB at city / regional / default views; 119 ms execution at the default view                        | Queries 12, 13  | §6.5                                                                                                                               |
| `idx_placemarks_want_to_go` still exists; `idx_placemarks_needs_review` exists                                                                                                       | Query 7         | 0003 was a no-op (§4.2 #4)                                                                                                         |
| One copy each of `search_vector` indexes (`idx_placemarks_search`, `idx_placemarks_anchor_geog`)                                                                                     | Query 7         | 0006 blocks 1–3 were already satisfied by the sibling schema                                                                       |
| RLS enabled on all 10 app tables; both views `security_invoker=true`; policies exactly as in the sibling `rls.sql`                                                                   | Queries 4–6     | §9 confirmed                                                                                                                       |
| **PostGIS lives in `public`** (its functions, `spatial_ref_sys`, `geometry_columns`, `geography_columns`), not `extensions`                                                          | Queries 1, 3, 4 | **New** drift: the live DB wasn't built purely from the sibling migrations. Moving PostGIS is risky; record it rather than fix it. |
| Triggers exactly as in the sibling repo, including `on_auth_user_created` on `auth.users`                                                                                            | Query 8         | §4.1 confirmed                                                                                                                     |
| `placemark_details` matches the sibling definition (full `geom`, `media`, `visits`, `attributes`)                                                                                    | Query 6         | §3.3 #10 overfetch confirmed                                                                                                       |
| `visits_not_future` still in place; nullable `visited_on` passes it                                                                                                                  | Query 9         | OK                                                                                                                                 |
| `anon` (via `PUBLIC`) can execute all 18 app functions, including security-definer `default_owner_id()`, which leaks the owner's UUID; reads and writes are otherwise bounded by RLS | Query 3b        | **New** security finding (§9, §4.2 #12); revoke in a migration                                                                     |
