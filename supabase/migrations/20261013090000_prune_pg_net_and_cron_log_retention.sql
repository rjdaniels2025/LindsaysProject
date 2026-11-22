-- Retention for the two tables that were quietly eating the instance, and the
-- reduced sweep rate that goes with it.
--
-- net._http_response had reached 117 MB and cron.job_run_details 41 MB, against
-- under 2 MB for every application table put together. Neither is application
-- data: the first is a queue pg_net expects the caller to drain, and nothing
-- here ever reads a response back; the second is a run log. Nothing had ever
-- pruned either one.
--
-- The cost was not disk. A pg_net worker sat in an open transaction holding
-- net._http_response, connections stalled behind it, and that surfaced as 504s
-- on /auth/v1/token for members and an admin dashboard that could not count its
-- clients. Clearing the worker fixed the stall; this migration is what stops the
-- backlog rebuilding and causing it again.
--
-- The one-off clearing of the existing backlog is deliberately NOT here. It is
-- a TRUNCATE, it has no business replaying on a rebuild, and it lives in
-- db-cleanup.sql to be run once by hand.

create extension if not exists pg_cron;

-- The sweep was changed to every third minute on the live database with
-- cron.alter_job, which left this repository disagreeing with production: the
-- original migration still said '* * * * *', so replaying it would have put the
-- every-minute schedule back. Re-stating it here is what closes that gap.
--
-- Every minute was ~1,440 net.http_post calls a day, each leaving a row in
-- net._http_response and another in cron.job_run_details, and it was the entire
-- source of the volume. Every third minute delays nothing a member would
-- notice, because a generation takes minutes anyway.
select cron.unschedule('sweep-program-jobs')
where exists (select 1 from cron.job where jobname = 'sweep-program-jobs');

select cron.schedule(
  'sweep-program-jobs',
  '*/3 * * * *',
  $$
  select net.http_post(
    url := 'https://shntiltbjrakmxutevta.supabase.co/functions/v1/program-jobs',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('action', 'sweep', 'secret', public.get_program_sweep_secret())
  );
  $$
);

-- Bounded batches rather than one big sweep: each run stays cheap and holds no
-- long lock, which matters because a long lock on this table is what caused the
-- outage in the first place. A day of responses is far more than anything reads.
select cron.unschedule('prune-pg-net-and-cron-log')
where exists (select 1 from cron.job where jobname = 'prune-pg-net-and-cron-log');

select cron.schedule(
  'prune-pg-net-and-cron-log',
  '*/10 * * * *',
  $$
    delete from net._http_response
     where id in (
       select id from net._http_response
        where created < now() - interval '1 day'
        order by id
        limit 100000
     );
    delete from cron.job_run_details
     where end_time < now() - interval '3 days';
  $$
);
