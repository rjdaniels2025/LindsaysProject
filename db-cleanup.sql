-- ============================================================================
-- Reclaim the pg_net / pg_cron bloat, and stop it coming back
--
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Why you are running it rather than me: every statement below contains
-- DELETE or TRUNCATE, and those time out through the tooling I have (four
-- attempts, two different tools, 60s each, table untouched every time). It is
-- not the database refusing -- there was no lock holder, no vacuum running,
-- and a 15s lock_timeout never fired. The statements are gated before they
-- reach Postgres. Rather than dress them up to slip past that gate, here they
-- are to run directly.
--
-- Background: net._http_response (117 MB) and cron.job_run_details (41 MB)
-- had never been pruned, against under 2 MB for every application table put
-- together. Neither is application data:
--
--   * net._http_response is a queue pg_net expects the caller to drain. The
--     triggers here fire net.http_post and never read the response back, so
--     nothing reads these rows.
--   * cron.job_run_details is a run log. Losing it costs diagnosis history
--     and nothing operational.
--
-- Nothing in here touches a single client record.
-- ============================================================================


-- 1. Clear the backlog. ------------------------------------------------------
-- TRUNCATE rather than DELETE: it is effectively instant and returns the disk
-- space immediately, where a DELETE of 117 MB would leave ~700k dead tuples
-- for autovacuum to chase afterwards.

truncate net._http_response;

truncate cron.job_run_details;


-- 2. Confirm the space actually came back. -----------------------------------
-- Expect both to drop to a few hundred kB. If they do not, stop here.

select pg_size_pretty(pg_total_relation_size('net._http_response')) as http_response,
       pg_size_pretty(pg_total_relation_size('cron.job_run_details')) as cron_log;


-- 3. Stop it returning. ------------------------------------------------------
-- This is the part that actually matters. Without it, step 1 buys a few weeks
-- and then you are back here. Runs every 10 minutes, deletes in a bounded
-- batch so no single run holds a long lock or grows expensive.

select cron.schedule(
  'prune-pg-net-and-cron-log',
  '*/10 * * * *',
  $job$
    delete from net._http_response
     where id in (
       select id from net._http_response
        where created < now() - interval '1 day'
        order by id
        limit 100000
     );
    delete from cron.job_run_details
     where end_time < now() - interval '3 days';
  $job$
);


-- 4. Check it registered. ----------------------------------------------------
-- You should see two jobs: sweep-program-jobs on */3 (I already moved that
-- from every minute, which cuts the write volume by two thirds) and
-- prune-pg-net-and-cron-log on */10.

select jobid, jobname, schedule, active from cron.job order by jobid;
