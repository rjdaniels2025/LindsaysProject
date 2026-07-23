-- Permanent cache of AI-generated exercise demonstration videos, keyed by the
-- normalized exercise name so every user who hits the same exercise shares one
-- generated clip. The exercise-videos storage bucket itself is created at
-- runtime by the generate-exercise-video edge function (service role), since
-- storage DDL is not permitted from SQL migrations on hosted projects.
create table if not exists public.exercise_videos (
  id uuid primary key default gen_random_uuid(),
  exercise_key text unique not null,
  exercise_name text not null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  video_url text,
  fal_model_id text,
  fal_request_id text,
  fal_status_url text,
  fal_response_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercise_videos enable row level security;

create policy "exercise_videos are publicly readable"
  on public.exercise_videos
  for select
  using (true);

drop trigger if exists set_exercise_videos_updated_at on public.exercise_videos;

create trigger set_exercise_videos_updated_at
before update on public.exercise_videos
for each row
execute function public.set_updated_at();

-- Singleton config row holding the one fixed coach reference photo every
-- exercise's image-to-video generation starts from, so all clips show the same
-- coach. Written only by the edge function (service role); RLS with no
-- policies keeps it invisible to anon and authenticated clients.
create table if not exists public.video_generation_config (
  id boolean primary key default true,
  coach_reference_image_url text,
  constraint video_generation_config_singleton check (id)
);

alter table public.video_generation_config enable row level security;

-- The Fal.ai API key lives encrypted in Supabase Vault (never in the repo).
-- This accessor is callable only by the service role, so edge functions can
-- read the key while anon and authenticated clients cannot.
create or replace function public.get_fal_key()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return (select decrypted_secret from vault.decrypted_secrets where name = 'FAL_KEY' limit 1);
exception when others then
  return null;
end;
$$;

revoke all on function public.get_fal_key() from public;
revoke all on function public.get_fal_key() from anon;
revoke all on function public.get_fal_key() from authenticated;
grant execute on function public.get_fal_key() to service_role;
