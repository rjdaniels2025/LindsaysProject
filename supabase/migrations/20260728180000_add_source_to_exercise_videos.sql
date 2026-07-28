-- Lets the coach upload her own demonstration videos alongside the AI-generated
-- ones. Playback is unchanged for members: generate-exercise-video already
-- serves any row with status='ready' from cache, whatever produced it.

alter table public.exercise_videos
  add column if not exists source text not null default 'ai'
  check (source in ('ai', 'manual'));

-- Read-only listing for the coach dashboard. Mirrors get_admin_dashboard /
-- get_trial_applications: security definer + granted to anon, because admin
-- access is gated by a client-side passcode today. Writes are NOT exposed this
-- way — uploads and deletes go through passcode-checked edge functions.
create or replace function public.list_exercise_videos()
returns setof public.exercise_videos
language sql
security definer
set search_path = public
as $$
  select * from public.exercise_videos order by updated_at desc;
$$;

grant execute on function public.list_exercise_videos() to anon, authenticated;
