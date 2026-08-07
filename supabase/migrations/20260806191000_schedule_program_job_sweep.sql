-- Runs the program-jobs sweep once a minute so a generation finishes and gets
-- saved whether or not the member's browser is still open.
--
-- When the tab IS open the client's own 4-second poll still wins the race and
-- the experience is unchanged; this is the safety net for when it is not.

create extension if not exists pg_cron;

select cron.unschedule('sweep-program-jobs')
where exists (select 1 from cron.job where jobname = 'sweep-program-jobs');

select cron.schedule(
  'sweep-program-jobs',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://shntiltbjrakmxutevta.supabase.co/functions/v1/program-jobs',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('action', 'sweep', 'secret', public.get_program_sweep_secret())
  );
  $$
);
