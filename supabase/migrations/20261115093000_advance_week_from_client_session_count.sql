-- Roll the training week over using the session count the client reports,
-- instead of guessing it from the program text.
--
-- Background. advance_workout_week_when_complete rolls workoutLog.week forward
-- once a member has finished every session in the current week. It had the
-- number of sessions hardcoded:
--
--     if current_week < 4 and completed_count >= 4 then
--
-- A three-session plan can never reach four, so those members stayed on Week 1
-- for ever. firstIncompleteWorkout in the dashboard clamps to the last session,
-- so "your next workout" then named that same last session week after week.
-- Two live members were stuck this way.
--
-- The first attempt at a fix counted the sessions in SQL with
-- regexp_matches(content, '^Workout\s+\w+', 'gm'). That is the mistake this
-- migration undoes. No regex matches what the dashboard's parser does:
--
--   * Programs whose cool-downs are written as headings ("Workout One
--     Cooldown: Walk 3 minutes easy...") counted 8 for 4 real sessions, which
--     would have demanded 8 completions from two members who need 4.
--   * Requiring a parenthesised label ("Workout One (Push)") instead counted 0
--     for the members whose headings are a bare "Workout Two".
--
-- The parser is the only thing that knows the real number, so the client now
-- persists it as workoutLog.sessionsPerWeek and this reads it.
--
-- No fallback. If the field is absent the trigger returns the row untouched
-- rather than assuming 4 -- a wrong guess is what caused the problem. A member
-- on an older saved state starts advancing the moment they next open the app
-- and the client writes the field.
--
-- The client also advances the week itself now, so in practice this trigger is
-- a backstop for state written by anything else. There is no double advance:
-- the client sends week + 1 together with an empty completedWorkouts, so this
-- sees 0 completed against a positive sessionsPerWeek and does nothing.

create or replace function public.advance_workout_week_when_complete()
returns trigger
language plpgsql
as $$
declare
  current_week      integer;
  completed_count   integer;
  sessions_per_week integer;
begin
  if not (new.app_state ? 'workoutLog') then
    return new;
  end if;

  current_week    := coalesce(nullif(new.app_state #>> '{workoutLog,week}', '')::integer, 1);
  completed_count := jsonb_array_length(
                       coalesce(new.app_state #> '{workoutLog,completedWorkouts}', '[]'::jsonb));

  -- Written by the dashboard parser. Absent on state saved before this shipped.
  sessions_per_week := nullif(new.app_state #>> '{workoutLog,sessionsPerWeek}', '')::integer;

  if sessions_per_week is null or sessions_per_week < 1 then
    return new;
  end if;

  if current_week < 4 and completed_count >= sessions_per_week then
    new.app_state := jsonb_set(new.app_state, '{workoutLog,week}',
                               to_jsonb(current_week + 1), true);
    new.app_state := jsonb_set(new.app_state, '{workoutLog,completedWorkouts}',
                               '[]'::jsonb, true);
    -- Exercise ids are positional, so set counts carried into a new week would
    -- open it already finished. The client clears these too; this keeps the
    -- backstop honest for state that did not come from the client.
    new.app_state := jsonb_set(new.app_state, '{workoutLog,completedSets}',
                               '{}'::jsonb, true);
  end if;

  return new;
end;
$$;

-- The trigger itself had no migration in this repository -- it only ever
-- existed on the live database. Stated here so a rebuild reproduces it, with
-- the name and timing the live one actually has: it fires on INSERT as well as
-- UPDATE, and only when app_state is the column being written.
drop trigger if exists advance_workout_week_when_complete_trigger on public.user_programs;

create trigger advance_workout_week_when_complete_trigger
  before insert or update of app_state on public.user_programs
  for each row
  execute function public.advance_workout_week_when_complete();
