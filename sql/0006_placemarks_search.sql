-- Adds full-text + tag + proximity search support (docs/sl-maps-schema-design.md
-- §7.2, §8.2; product doc step 2.3): a generated tsvector column over
-- name/description, a GIN index backing it, a GIST index on the
-- geography-cast anchor (required for ST_DWithin to use an index at all —
-- the existing plain GIST on anchor/geom measures degrees, not metres), and
-- a single combined placemarks_search RPC.
--
-- placemarks is not fully version-controlled in this repo (see 0001/0004) —
-- before running this, confirm live state with:
--
--   select column_name from information_schema.columns
--     where table_name = 'placemarks' and column_name = 'search_vector';
--   select indexname from pg_indexes
--     where tablename = 'placemarks' and indexname in
--       ('idx_placemarks_search', 'idx_placemarks_anchor_geog');
--   select pg_get_functiondef('placemarks_search'::regproc); -- only if it already exists
--
-- Run each numbered block by hand in the Supabase SQL editor, in order.
-- CREATE INDEX CONCURRENTLY cannot run inside a multi-statement transaction
-- block — run blocks 2 and 3 as their own separate statements, not pasted
-- together with a BEGIN/COMMIT wrapper.

-- 1. Generated tsvector column. Two-arg to_tsvector('english', ...) is
--    IMMUTABLE (required for a generated column); the one-arg form is only
--    STABLE and Postgres will reject it here. Tags are intentionally NOT
--    folded in — a generated column can't join to placemark_tags, and tag
--    matching is exact-match, not stemmed relevance, so it doesn't belong in
--    a tsvector anyway (docs/sl-maps-schema-design.md §7.2). Tag matching is
--    handled as a join-based OR in placemarks_search() below.
alter table placemarks
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

-- 2. GIN index backing the tsvector. On the existing row count this is a
--    full table scan to build; CONCURRENTLY avoids locking writes during it.
create index concurrently idx_placemarks_search
  on placemarks using gin (search_vector);

-- 3. GIST index on the geography-cast anchor.
create index concurrently idx_placemarks_anchor_geog
  on placemarks using gist ((anchor::geography))
  where deleted_at is null;

-- 4. Combined search RPC. One function handles pure-text, pure-proximity,
--    and combined queries (all filter args are independently optional) —
--    the task's "single combined query" requirement plus a single results
--    consumer (one API route, one client-side fetch feeding both the map
--    and the results list) both want one RPC and one response shape rather
--    than the doc's separate placemarks_near/placemarks_search sketch.
--    Returns the same jsonb FeatureCollection shape as placemarks_geojson
--    (sql/0004) so MapView.tsx can feed it straight into source.setData()
--    with the same feature-shaping helper, plus two added nullable
--    properties: rank (null when in_query is absent) and distance_m (null
--    when no proximity filter is given).
create or replace function placemarks_search(
  in_query text default null,
  in_lat double precision default null,
  in_lon double precision default null,
  in_radius_m double precision default null,
  in_category_ids uuid[] default null,
  in_visited boolean default null,
  in_needs_review boolean default false,
  in_limit int default 200
)
returns jsonb
language sql
stable
as $$
  with candidates as (
    select
      p.id,
      p.name,
      p.category_id,
      p.priority,
      p.visited,
      p.tag_filter_string as tags,
      p.anchor,
      case
        when in_query is not null and btrim(in_query) <> '' then
          greatest(
            coalesce(ts_rank(p.search_vector, websearch_to_tsquery('english', in_query)), 0),
            -- A tag-name hit is a precise signal with no natural ts_rank
            -- scale of its own; a fixed boost above typical ts_rank values
            -- (usually << 1) floats exact tag matches to the top of
            -- text-mode results without a second ranking system.
            case when exists (
              select 1
              from placemark_tags pt
              join tags t on t.id = pt.tag_id and t.deleted_at is null
              where pt.placemark_id = p.id
                and t.name ilike '%' || btrim(in_query) || '%'
            ) then 1.0 else 0 end
          )
        else null
      end as rank,
      case
        when in_lat is not null and in_lon is not null then
          ST_Distance(p.anchor::geography, ST_MakePoint(in_lon, in_lat)::geography)
        else null
      end as distance_m
    from placemarks p
    where p.deleted_at is null
      and (in_category_ids is null or p.category_id = any(in_category_ids))
      and (in_visited is null or p.visited = in_visited)
      and (in_needs_review is false or p.needs_review)
      and (
        in_lat is null or in_lon is null or in_radius_m is null
        or ST_DWithin(
             p.anchor::geography,
             ST_MakePoint(in_lon, in_lat)::geography,
             in_radius_m
           )
      )
      and (
        in_query is null or btrim(in_query) = ''
        or p.search_vector @@ websearch_to_tsquery('english', in_query)
        or exists (
          select 1
          from placemark_tags pt
          join tags t on t.id = pt.tag_id and t.deleted_at is null
          where pt.placemark_id = p.id
            and t.name ilike '%' || btrim(in_query) || '%'
        )
      )
  ),
  ranked as (
    select
      c.*,
      row_number() over (
        order by
          -- Proximity, when present, is always the primary sort — even in
          -- combined mode ("wreck" within 100 km) the radius already bounds
          -- the candidate set, so nearest-first is what "search respects
          -- active filters" means physically. Rank only breaks ties.
          case when c.distance_m is not null then c.distance_m end asc nulls last,
          case when c.rank is not null then c.rank end desc nulls last,
          c.name asc
      ) as rn
    from candidates c
    order by rn
    limit in_limit
  )
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(r.anchor)::jsonb,
        'properties', jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'category_id', r.category_id,
          'priority', r.priority,
          'visited', r.visited,
          'tags', r.tags,
          'rank', r.rank,
          'distance_m', r.distance_m
        )
      )
      order by r.rn
    ), '[]'::jsonb)
  )
  from ranked r;
$$;
