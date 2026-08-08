-- Reassigns every live placemark that wasn't categorized via the
-- places_sorted import to a single fallback category, so it's easy to
-- find and re-triage later — same spirit as needs_review in 0001.
-- Run by hand in the Supabase SQL editor. Run the statements in order.

-- 1. Preflight: category_id is NOT NULL with an FK to categories(id),
--    so the UPDATE below fails outright if this id doesn't exist.
--    Confirm it returns exactly one row before continuing.
select id, name from categories where id = '019fe316-d00a-7ad4-ae23-dc9f2ef55962';

-- 2. Preview: same predicate as the UPDATE, so the affected count can be
--    sanity-checked before anything is written. NULL source_ref rows are
--    included explicitly — a plain "not like" would silently drop them,
--    since NULL LIKE anything evaluates to NULL, not true.
select count(*)
  from placemarks
  where deleted_at is null
    and (source_ref is null or source_ref not like 'places_sorted:%');

-- 3. Update. Scoped to deleted_at is null (live rows only), matching the
--    soft-delete convention used by every other placemark query/index.
update placemarks
  set category_id = '019fe316-d00a-7ad4-ae23-dc9f2ef55962'
  where deleted_at is null
    and (source_ref is null or source_ref not like 'places_sorted:%');
