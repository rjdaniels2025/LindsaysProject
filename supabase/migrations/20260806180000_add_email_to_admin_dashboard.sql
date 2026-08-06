-- The coach dashboard had no way to contact anyone: get_admin_dashboard never
-- returned an email address. Adding it lets the follow-up view mail a member
-- who is stuck (paid but no program) or who never subscribed.

drop function if exists public.get_admin_dashboard();

create function public.get_admin_dashboard()
returns table (
  user_id uuid,
  display_name text,
  email text,
  app_state jsonb,
  program_created_at timestamptz,
  program_updated_at timestamptz,
  plan_id text,
  billing text,
  membership_status text,
  current_period_end timestamptz,
  membership_created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    up.user_id,
    up.display_name,
    u.email::text,
    up.app_state,
    up.created_at  as program_created_at,
    up.updated_at  as program_updated_at,
    um.plan_id,
    um.billing,
    um.status      as membership_status,
    um.current_period_end,
    um.created_at  as membership_created_at
  from user_programs up
  left join auth.users u on u.id = up.user_id
  left join user_memberships um on up.user_id = um.user_id
  order by up.created_at desc;
$$;

grant execute on function public.get_admin_dashboard() to anon, authenticated;
