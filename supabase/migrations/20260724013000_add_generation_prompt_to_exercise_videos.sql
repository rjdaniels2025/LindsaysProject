-- Stores the final AI-engineered video prompt used for each exercise clip, so
-- a bad-looking clip can be traced back to the exact prompt that produced it.
alter table public.exercise_videos add column if not exists generation_prompt text;
