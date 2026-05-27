create table if not exists public.user_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  plan_id text not null,
  billing text not null,
  status text not null default 'pending',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_memberships enable row level security;

create policy "Users can read their own membership"
  on public.user_memberships
  for select
  using (auth.uid() = user_id);

drop trigger if exists set_user_memberships_updated_at on public.user_memberships;

create trigger set_user_memberships_updated_at
before update on public.user_memberships
for each row
execute function public.set_updated_at();
