-- Tell the coach when something happens, without depending on a browser.
--
-- Only start-trial ever sent email, so an account created through auth.signUp
-- notified nobody: someone signed up on August 5 and she found out about a
-- later signup only because a client mentioned it. These events are all
-- database state changes, so triggers catch every one of them whether or not
-- the member's tab is still open — the same reasoning that moved program
-- generation server-side.
--
-- Each trigger is AFTER and every call is wrapped, because a notification must
-- never be able to fail a signup or a payment.

create extension if not exists pg_net;

-- Vault-backed, service-role only, mirroring get_program_sweep_secret().
create or replace function public.get_notify_secret()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return (select decrypted_secret from vault.decrypted_secrets where name = 'NOTIFY_COACH_SECRET' limit 1);
exception when others then
  return null;
end;
$$;

revoke all on function public.get_notify_secret() from public, anon, authenticated;
grant execute on function public.get_notify_secret() to service_role;

create or replace function public.notify_coach(event text, name text, email text, details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  secret := public.get_notify_secret();
  if secret is null then
    raise warning 'notify_coach: NOTIFY_COACH_SECRET is not set, % notification for % was not sent', event, email;
    return;
  end if;

  perform net.http_post(
    url := 'https://shntiltbjrakmxutevta.supabase.co/functions/v1/notify-coach',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'secret', secret, 'event', event, 'name', name, 'email', email, 'details', details
    )
  );
exception when others then
  -- A failed notification must never roll back the signup or payment that
  -- caused it. Losing an email is bad; losing a customer is worse.
  raise warning 'notify_coach failed for % (%): %', email, event, sqlerrm;
end;
$$;

-- ── Signup ──────────────────────────────────────────────────────────────────
-- Fires for trial and paid signups alike, which is why start-trial no longer
-- sends its own coach email; two triggers would have meant two emails.
create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_coach(
    'signup',
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    jsonb_build_object('Signed up', to_char(new.created_at at time zone 'America/Toronto', 'Mon DD, YYYY HH12:MI AM'))
  );
  return new;
end;
$$;

drop trigger if exists notify_coach_on_signup on auth.users;
create trigger notify_coach_on_signup
after insert on auth.users
for each row execute function public.on_auth_user_created();

-- ── Payment ─────────────────────────────────────────────────────────────────
-- Only on the transition into 'active', so the webhook re-sending an event
-- cannot email her twice. Trials are excluded: the signup email already covered
-- them, and a trial is not a sale.
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
      jsonb_build_object('Plan', coalesce(new.plan_id, '—'), 'Billing', coalesce(new.billing, '—'))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_coach_on_payment on public.user_memberships;
create trigger notify_coach_on_payment
after insert or update of status on public.user_memberships
for each row execute function public.on_membership_activated();

-- ── Assessment completed ────────────────────────────────────────────────────
-- Only when a profile first appears, so ordinary dashboard saves stay silent.
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
      jsonb_build_object('Goal', coalesce(new.app_state->'profile'->>'primaryGoal', '—'))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_coach_on_assessment on public.user_programs;
create trigger notify_coach_on_assessment
after insert or update of app_state on public.user_programs
for each row execute function public.on_assessment_completed();
