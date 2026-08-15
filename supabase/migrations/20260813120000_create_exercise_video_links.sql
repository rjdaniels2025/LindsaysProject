-- A video could only ever serve one exercise name, and programs write the same
-- movement many ways: "Seated leg curl" for four clients and "Seated hamstring
-- curl" for five more are the same machine, but the coach's one clip could only
-- reach the first group. Two of her hip thrust videos were also fighting over a
-- single name, so one of them could not be connected at all.
--
-- This maps additional exercise names onto an existing video. The primary key
-- on exercise_key is the rule that matters: an exercise resolves to at most one
-- video, while a video can cover as many exercises as genuinely show the same
-- movement.
--
-- Which names are the same movement stays the coach's judgment. The near-miss
-- list that motivated this also contains "Cable Glute Kickback" next to "Cable
-- Triceps Kickback" and "Hip Thrust Machine" next to "Hip Abduction Machine" —
-- nothing here decides that automatically.

create table if not exists public.exercise_video_links (
  exercise_key text primary key,
  video_id uuid not null references public.exercise_videos(id) on delete cascade,
  exercise_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists exercise_video_links_video_id_idx
  on public.exercise_video_links (video_id);

alter table public.exercise_video_links enable row level security;

create policy "exercise_video_links are publicly readable"
  on public.exercise_video_links
  for select
  using (true);

-- Read-only listing for the coach dashboard, mirroring list_exercise_videos:
-- security definer + granted to anon, because admin access is gated by a
-- client-side passcode today. Writes go through the passcode-checked edge
-- function, never this.
create or replace function public.list_exercise_video_links()
returns setof public.exercise_video_links
language sql
security definer
set search_path = public
as $$
  select * from public.exercise_video_links order by created_at;
$$;

grant execute on function public.list_exercise_video_links() to anon, authenticated;
