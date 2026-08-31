-- "Log a visit" is becoming a modal where the date is optional (the user may
-- log a visit without recalling exactly when it happened, or want to record
-- notes-only). visited_on was `date NOT NULL`; drop that constraint so a
-- visit row can be inserted with a NULL date. `visited`/`visit_count`/
-- `last_visited_on` on placemarks are trigger-maintained from this table via
-- COUNT(*)/MIN(visited_on)/MAX(visited_on), which already ignore NULLs per
-- standard SQL aggregate semantics, so no trigger change is required here.
-- Run by hand in the Supabase SQL editor.

alter table visits alter column visited_on drop not null;
