-- Lead-capture applications for the free 7-day Kickstart funnel. Rows are
-- written only by the submit-trial-application edge function (service role),
-- and read/updated by the admin dashboard through the security-definer RPCs
-- below (the same access pattern as get_admin_dashboard). RLS is enabled with
-- no anon/authenticated policies, so the table is never directly readable or
-- writable from the client.
create table if not exists public.trial_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  fitness_goal text,
  biggest_challenge text,
  tracked_macros boolean,
  status text not null default 'new' check (status in ('new', 'contacted', 'enrolled', 'declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trial_applications enable row level security;

drop trigger if exists set_trial_applications_updated_at on public.trial_applications;

create trigger set_trial_applications_updated_at
before update on public.trial_applications
for each row
execute function public.set_updated_at();

-- Admin dashboard read. security definer so it bypasses RLS, mirroring the
-- existing get_admin_dashboard function. NOTE: admin access is currently a
-- client-side passcode gate (not a DB auth role), so this is the same
-- exposure posture as the existing admin data functions.
create or replace function public.get_trial_applications()
returns setof public.trial_applications
language sql
security definer
set search_path = public
as $$
  select * from public.trial_applications order by created_at desc;
$$;

-- Admin dashboard follow-up status update.
create or replace function public.set_trial_application_status(p_id uuid, p_status text)
returns public.trial_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.trial_applications;
begin
  if p_status not in ('new', 'contacted', 'enrolled', 'declined') then
    raise exception 'Invalid status: %', p_status;
  end if;
  update public.trial_applications
    set status = p_status
    where id = p_id
    returning * into updated;
  return updated;
end;
$$;

revoke all on function public.get_trial_applications() from public;
revoke all on function public.set_trial_application_status(uuid, text) from public;
grant execute on function public.get_trial_applications() to anon, authenticated;
grant execute on function public.set_trial_application_status(uuid, text) to anon, authenticated;
