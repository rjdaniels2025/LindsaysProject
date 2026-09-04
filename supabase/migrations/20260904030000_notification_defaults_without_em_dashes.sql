-- No em dash should reach a member or the coach by email. sendEmail now strips
-- them at the point of sending, but these two trigger functions are where they
-- were being introduced in the first place: an em dash stood in for a missing
-- Plan, Billing or Goal, and went straight into the notification table.
--
-- Only the placeholder changes. The conditions that decide whether a
-- notification fires at all are reproduced exactly as they were, because
-- create or replace rewrites the whole function and getting one of them wrong
-- would either double-notify the coach or silence her.

create or replace function public.on_membership_activated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_email text;
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active')
     and coalesce(new.billing, '') <> 'trial' then
    select u.email into member_email from auth.users u where u.id = new.user_id;
    perform public.notify_coach(
      'payment',
      coalesce((select up.display_name from public.user_programs up where up.user_id = new.user_id), split_part(coalesce(member_email, ''), '@', 1)),
      coalesce(member_email, ''),
      jsonb_build_object('Plan', coalesce(new.plan_id, '-'), 'Billing', coalesce(new.billing, '-'))
    );
  end if;
  return new;
end;
$$;

create or replace function public.on_assessment_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_email text;
begin
  if new.app_state ? 'profile'
     and coalesce(new.app_state->>'profile', '') <> ''
     and (tg_op = 'INSERT' or not coalesce(old.app_state ? 'profile', false)
          or coalesce(old.app_state->>'profile', '') = '') then
    select u.email into member_email from auth.users u where u.id = new.user_id;
    perform public.notify_coach(
      'assessment',
      coalesce(new.display_name, split_part(coalesce(member_email, ''), '@', 1)),
      coalesce(member_email, ''),
      -- Goals only. Injuries and limitations stay out of email on purpose;
      -- they live in the dashboard where they belong.
      jsonb_build_object('Goal', coalesce(new.app_state->'profile'->>'primaryGoal', '-'))
    );
  end if;
  return new;
end;
$$;
