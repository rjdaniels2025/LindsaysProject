create table if not exists public.user_programs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  app_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_programs enable row level security;

create policy "Users can read their own program"
  on public.user_programs
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own program"
  on public.user_programs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own program"
  on public.user_programs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_programs_updated_at on public.user_programs;

create trigger set_user_programs_updated_at
before update on public.user_programs
for each row
execute function public.set_updated_at();
