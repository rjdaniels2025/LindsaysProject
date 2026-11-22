-- ============================================================================
-- ONE-OFF: clear the existing pg_net / pg_cron backlog
--
-- Run once, by hand: Supabase dashboard -> SQL Editor -> New query -> Run.
--
-- This file is only the one-off part. The durable half -- the retention job
-- that stops the backlog rebuilding, and the reduced sweep rate -- lives in
-- supabase/migrations/20261013090000_prune_pg_net_and_cron_log_retention.sql,
-- because that belongs in migration history and this does not: a TRUNCATE has
-- no business replaying when the project is rebuilt.
--
-- Why you are running it rather than me: both statements below are TRUNCATEs,
-- and destructive statements time out through the tooling I have (four
-- attempts, two different tools, 60s each, the table untouched every time).
-- It was not the database refusing -- no lock holder, no vacuum running, and a
-- 15s lock_timeout never fired, so they were gated before reaching Postgres.
-- The statements are here to run directly rather than disguised to get past
-- that gate.
--
-- Background: net._http_response had reached 117 MB and cron.job_run_details
-- 41 MB, against under 2 MB for every application table put together. Neither
-- is application data:
--
--   * net._http_response is a queue pg_net expects the caller to drain. The
--     triggers here fire net.http_post and never read the response back, so
--     nothing reads these rows.
--   * cron.job_run_details is a run log. Losing it costs diagnosis history
--     and nothing operational.
--
-- Nothing in here touches a single client record. All 25 are untouched.
--
-- Not urgent. The outage it caused is already fixed -- the stuck pg_net worker
-- was cleared and the dashboard has been returning all 25 clients in ~35ms
-- since. This reclaims the disk and is the last loose end.
-- ============================================================================


-- TRUNCATE rather than DELETE: effectively instant, and it returns the disk
-- space immediately. A DELETE of 117 MB would instead leave several hundred
-- thousand dead tuples for autovacuum to chase afterwards, which is closer to
-- the original problem than to a fix.

truncate net._http_response;

truncate cron.job_run_details;


-- Confirm the space came back. Expect both down to a few hundred kB.

select pg_size_pretty(pg_total_relation_size('net._http_response')) as http_response,
       pg_size_pretty(pg_total_relation_size('cron.job_run_details')) as cron_log;


-- Confirm both cron jobs are in place: sweep-program-jobs on */3, and
-- prune-pg-net-and-cron-log on */10. If the prune job is missing, the migration
-- named at the top has not been applied yet -- apply it, or the backlog simply
-- rebuilds and you end up back here.

select jobid, jobname, schedule, active from cron.job order by jobid;
