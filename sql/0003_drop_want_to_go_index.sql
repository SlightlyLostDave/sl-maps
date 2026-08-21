-- The app no longer filters or counts by want_to_go (see the application
-- code changes removing that feature). The column itself stays — the data
-- is kept, just no longer surfaced — but the partial index that only
-- existed to serve that filter query is now dead weight, so drop it.
-- `visited` (generated, trigger-maintained from `visits`) is untouched.
-- Run by hand in the Supabase SQL editor.

drop index if exists idx_placemarks_wtg;
