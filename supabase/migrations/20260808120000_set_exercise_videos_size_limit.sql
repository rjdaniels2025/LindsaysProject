-- The bucket had no file_size_limit, so it silently inherited the project
-- default. On the free plan that is 50MB, and an oversized upload was rejected
-- before it reached storage — with no CORS headers on the rejection, so the
-- browser could only report "Failed to fetch".
--
-- Declaring the limit here makes the ceiling visible in the repo, and gives
-- anything that slips past the client a proper 413 with a readable body
-- instead of an opaque network failure.

update storage.buckets
set file_size_limit = 52428800  -- 50MB, the free plan's per-file cap
where id = 'exercise-videos';
