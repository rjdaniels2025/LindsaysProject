-- Heights were collected in a free-text box and several were stored in forms
-- the parser read wrong. "5.4" meaning five foot four was taken as 5.4 inches,
-- giving a height of 14cm, a BMR of 189, and a daily target of 250 calories on
-- a real 70 year old client's plan.
--
-- The parser now handles these and the form uses pickers, but the stored values
-- are still ambiguous and every future block is rebuilt from them. This puts
-- them in the canonical form the picker produces.
--
-- Deliberately conservative: only shapes whose meaning is unambiguous, only
-- when the inches are a real 0 to 11, and only feet 4 to 7. Anything else is
-- left exactly as it is rather than guessed at.

with candidates as (
  select up.user_id,
         up.app_state->'profile'->>'height' as raw
  from public.user_programs up
  where up.app_state ? 'profile'
    and up.app_state->'profile'->>'height' is not null
),
fixed as (
  select user_id, raw,
         substring(raw from '^([4-7])') as feet,
         coalesce(
           -- 5.4 / 5,4 / 5-3 / 5 3
           substring(raw from '^[4-7][.,\s-]\s*([0-9]{1,2})$'),
           -- 5"2 / 5” 2, where the quote landed on the feet
           substring(raw from '^[4-7]\s*["”]\s*([0-9]{1,2})$')
         ) as inches
  from candidates
)
update public.user_programs up
set app_state = jsonb_set(up.app_state, '{profile,height}',
                          to_jsonb(f.feet || '''' || f.inches || '"'))
from fixed f
where up.user_id = f.user_id
  and f.feet is not null
  and f.inches is not null
  and f.inches::int between 0 and 11;
