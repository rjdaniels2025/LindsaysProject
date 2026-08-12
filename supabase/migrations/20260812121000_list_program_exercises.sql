-- The coach was asked to type an exercise name that matched a client's program
-- exactly, into a blank box, with no way to see what those names were. This is
-- that list: every exercise actually appearing in a stored program, with the
-- key it resolves to and how many clients have it.
--
-- Names are read the same way the member's dashboard reads them
-- (ProgramDashboard.exerciseName): the text before the first colon on a line
-- carrying training detail, with list numbering and "Superset A1" prefixes
-- stripped, and section headings excluded — the same exclusion list already
-- used by src/utils/programSafety.js.
--
-- security definer + granted to anon, matching get_admin_dashboard and
-- list_exercise_videos: the coach dashboard is gated by a client-side passcode
-- today, and this is read-only. It returns exercise names only — no client
-- names, no emails, nothing identifying.

create or replace function public.list_program_exercises()
returns table (exercise_name text, exercise_key text, client_count bigint)
language sql
security definer
set search_path = public
as $$
  with lines as (
    select up.user_id,
           trim(l) as line
    from public.user_programs up,
         lateral jsonb_array_elements(up.app_state->'messages') m,
         lateral regexp_split_to_table(coalesce(m->>'content', ''), E'\n') l
  ),
  named as (
    select user_id,
           trim(
             regexp_replace(
               regexp_replace(split_part(line, ':', 1), '^[0-9]+[.)]\s*', ''),
               '^Superset\s+[A-Z]?[0-9]?\s*', '', 'i'
             )
           ) as raw_name
    from lines
    where position(':' in line) > 0
      and line ~* '\m(sets?|reps?|rest|tempo|cue|rpe|rir)\M'
  ),
  usable as (
    select user_id, raw_name, public.exercise_key(raw_name) as key
    from named
    where length(raw_name) between 3 and 60
      and raw_name ~ '[A-Za-z]'
      and raw_name !~* '^(workout|session|day|week|warm ?up|cool ?down|note|focus|rest|progression|goal|tip|meal|nutrition|strength|deload|joint care)\M'
  )
  select (array_agg(raw_name order by raw_name))[1] as exercise_name,
         key as exercise_key,
         count(distinct user_id) as client_count
  from usable
  where key <> ''
  group by key
  order by count(distinct user_id) desc, 1;
$$;

grant execute on function public.list_program_exercises() to anon, authenticated;
