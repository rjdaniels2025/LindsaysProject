-- Surfaces live trial state next to each application on the coach dashboard, so
-- Lindsay can see who is mid-trial, who lapsed, and who converted.
--
-- Applications are matched to accounts by email (case-insensitive) because a
-- trial_applications row is written before any auth user id is known to it.

drop function if exists public.get_trial_applications();

create function public.get_trial_applications()
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  fitness_goal text,
  biggest_challenge text,
  tracked_macros boolean,
  status text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  membership_status text,
  trial_ends_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ta.id,
    ta.name,
    ta.email,
    ta.phone,
    ta.fitness_goal,
    ta.biggest_challenge,
    ta.tracked_macros,
    ta.status,
    ta.notes,
    ta.created_at,
    ta.updated_at,
    m.status as membership_status,
    m.current_period_end as trial_ends_at
  from public.trial_applications ta
  left join auth.users u on lower(u.email) = lower(ta.email)
  left join public.user_memberships m on m.user_id = u.id
  order by ta.created_at desc;
$$;

grant execute on function public.get_trial_applications() to anon, authenticated;
