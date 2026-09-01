-- Trial signups have always been asked for a phone number, but it stopped at
-- trial_applications: the client card, which reads app_state.profile, showed an
-- email and nothing else. Signup now writes the number onto the profile for
-- everyone; this brings the people who signed up before that onto the same
-- place, so the coach has one field to look at rather than two screens.
--
-- Only profiles with no usable phone are touched, so a number the member typed
-- themselves always wins over the older application. Re-running changes nothing.
--
-- Emails are matched case-insensitively, and where one address applied more than
-- once the most recent application is used.
with latest_application as (
  select distinct on (lower(ta.email))
         lower(ta.email) as email,
         trim(ta.phone) as phone
  from public.trial_applications ta
  where coalesce(trim(ta.phone), '') <> ''
  order by lower(ta.email), ta.created_at desc
)
update public.user_programs up
set app_state = jsonb_set(up.app_state, '{profile,phone}', to_jsonb(la.phone), true)
from auth.users u
join latest_application la on la.email = lower(u.email)
where up.user_id = u.id
  and jsonb_typeof(up.app_state -> 'profile') = 'object'
  and coalesce(trim(up.app_state -> 'profile' ->> 'phone'), '') = '';
