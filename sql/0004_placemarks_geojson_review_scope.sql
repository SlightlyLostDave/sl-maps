-- Adds review-queue scoping to placemarks_geojson so the /review page's map
-- can show only needs_review=true placemarks instead of the whole dataset.
-- The home map (components/map/MapView.tsx) never passes in_needs_review,
-- so it keeps its current default behaviour (no needs_review filtering).
--
-- placemarks_geojson is not otherwise version-controlled in this repo (it
-- was hand-authored directly in the Supabase SQL editor, like 0001/0003) —
-- before running this, pull the live definition and reconcile this
-- create-or-replace against it rather than trusting the body below verbatim:
--
--   select pg_get_functiondef('placemarks_geojson'::regproc);
--
-- The signature below is pinned to the actual call site
-- (components/map/MapView.tsx, the `supabase.rpc('placemarks_geojson', ...)`
-- call), which passes in_west/in_south/in_east/in_north (bbox edges) and
-- in_category_ids — not the bbox-geometry signature sketched in
-- docs/sl-maps-schema-design.md §8, which has drifted from the real one.
--
-- Run by hand in the Supabase SQL editor.

create or replace function placemarks_geojson(
  in_west double precision,
  in_south double precision,
  in_east double precision,
  in_north double precision,
  in_category_ids uuid[] default null,
  in_needs_review boolean default false
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(p.anchor)::jsonb,
        'properties', jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'category_id', p.category_id,
          'priority', p.priority,
          'visited', p.visited,
          'tags', p.tag_filter_string
        )
      )
    ), '[]'::jsonb)
  )
  from placemarks p
  where p.deleted_at is null
    and p.anchor && ST_MakeEnvelope(in_west, in_south, in_east, in_north, 4326)
    and (in_category_ids is null or p.category_id = any(in_category_ids))
    and (in_needs_review is false or p.needs_review);
$$;
