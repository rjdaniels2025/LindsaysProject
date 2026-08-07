-- Program generation is submitted to OpenAI as a background job (background:true,
-- store:true), so the work itself survives the browser closing. What did not
-- survive was collecting the result: the browser polled and wrote the program
-- itself, so closing the tab mid-generation lost it entirely.
--
-- Recording the job here lets a scheduled sweep finish the work server-side.

create table if not exists public.program_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  openai_job_id text not null unique,
  block_number int not null default 1,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The sweep only ever reads pending rows.
create index if not exists program_jobs_pending_idx
  on public.program_jobs (status, created_at)
  where status = 'pending';

-- No policies: the table is written by the service-role edge function only,
-- same posture as trial_applications.
alter table public.program_jobs enable row level security;

drop trigger if exists set_program_jobs_updated_at on public.program_jobs;
create trigger set_program_jobs_updated_at
  before update on public.program_jobs
  for each row execute function public.set_updated_at();
