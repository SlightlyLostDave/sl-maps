-- Marks every placemark imported from QGIS as needing manual review,
-- without affecting anything created through the app going forward.
-- Run by hand in the Supabase SQL editor. Run the statements in order.

-- 1. Add the column with DEFAULT false first. Every placemark created
--    after this statement — via the app, going forward — gets false
--    automatically. Nothing in application code has to special-case it.
alter table placemarks
  add column needs_review boolean not null default false;

-- 2. Backfill only. This UPDATE affects exactly the rows that existed
--    at the moment it runs — the QGIS import backlog — and nothing else.
update placemarks
  set needs_review = true
  where deleted_at is null;

-- 3. Partial index so the review queue's list/count queries stay fast
--    at 22k+ rows, matching the existing idx_placemarks_wtg convention
--    in sl-maps-schema-design.md §7.
create index idx_placemarks_needs_review
  on placemarks (owner_id, created_at)
  where needs_review and deleted_at is null;
