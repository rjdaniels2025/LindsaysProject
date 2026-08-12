-- Videos are matched to exercises by exact equality on a normalized key. The
-- coach typed her own names into a blank box, the program generator wrote its
-- own, and any difference at all orphaned the upload silently: ten of her first
-- twelve videos were connected to nothing and no member could ever see them.
--
-- supabase/functions/_shared/exerciseKey.ts now folds away the differences that
-- cannot change which movement is meant — plurals, and a short list of real
-- misspellings. This is the same normalization in SQL, so already-stored rows
-- can be brought onto the new keys and so the dashboard's exercise list is
-- built the same way the player looks names up.
--
-- Two implementations of one rule is exactly the trap being fixed here, so this
-- is used for migration and reporting only; the edge functions import the
-- TypeScript one and never call this. Their outputs are compared against the
-- real data as part of verifying this change.

create or replace function public.exercise_key(s text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (
      select string_agg(word, ' ' order by ord)
      from (
        select ord,
               case
                 when aliased in ('press','cross','triceps','biceps','abs','lats','glutes',
                                  'calves','hamstrings','quads','plus')
                   then aliased
                 when length(aliased) > 3 and aliased like '%ies' then left(aliased, -3) || 'y'
                 when length(aliased) > 3 and aliased like '%ses' then left(aliased, -2)
                 when length(aliased) > 3 and aliased like '%s'   then left(aliased, -1)
                 else aliased
               end as word
        from (
          select ord,
                 case tok
                   when 'dumbell'   then 'dumbbell'
                   when 'dumbells'  then 'dumbbell'
                   when 'dumbbells' then 'dumbbell'
                   when 'barbells'  then 'barbell'
                   when 'bicep'     then 'biceps'
                   when 'tricep'    then 'triceps'
                   else tok
                 end as aliased
          from unnest(
            string_to_array(
              trim(regexp_replace(regexp_replace(lower(coalesce(s, '')), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g')),
              ' '
            )
          ) with ordinality as t(tok, ord)
          where tok <> ''
        ) aliased_tokens
      ) singular_tokens
    ),
    ''
  );
$$;

grant execute on function public.exercise_key(text) to anon, authenticated, service_role;

-- Re-key stored rows onto the new normalization. video_url holds an absolute
-- public URL, so the file keeps resolving from its original path and nothing in
-- storage has to move; only the row's key changes.
--
-- Where two rows collapse onto the same key, the coach's own video wins over a
-- generated one, and the most recently updated wins over an older one — losers
-- are dropped rather than left to break the unique index.
with renamed as (
  select exercise_key as old_key,
         public.exercise_key(exercise_name) as new_key,
         row_number() over (
           partition by public.exercise_key(exercise_name)
           order by (source = 'manual') desc, (status = 'ready') desc, updated_at desc
         ) as rank
  from public.exercise_videos
)
delete from public.exercise_videos v
using renamed r
where v.exercise_key = r.old_key
  and r.rank > 1;

update public.exercise_videos
set exercise_key = public.exercise_key(exercise_name)
where exercise_key is distinct from public.exercise_key(exercise_name);
