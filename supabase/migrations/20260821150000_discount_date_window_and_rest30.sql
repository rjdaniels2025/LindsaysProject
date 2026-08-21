-- Discount codes had no dates, so "September only" was unenforceable: a code
-- was either on forever or off. REST30 is a one-month promotion, so the window
-- has to live with the code rather than in a reminder to switch it off.
--
-- Null dates mean "no limit", so CEE and ELEV8FAM keep working exactly as they
-- do now.

alter table public.discount_codes
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz;

comment on column public.discount_codes.valid_from is
  'Inclusive start. Null means no start limit.';
comment on column public.discount_codes.valid_until is
  'Exclusive end. Null means no end limit.';

-- Single source of truth for "is this code usable right now", so the pricing
-- page and the checkout function cannot disagree about it.
drop function if exists public.active_discount_code(text);

create function public.active_discount_code(lookup_code text)
returns table (
  code text,
  plan_id text,
  billing text,
  discount_percent integer,
  valid_from timestamptz,
  valid_until timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select d.code, d.plan_id, d.billing, d.discount_percent,
         d.valid_from, d.valid_until
  from public.discount_codes d
  where upper(d.code) = upper(trim(lookup_code))
    and d.is_active
    and (d.valid_from is null or now() >= d.valid_from)
    and (d.valid_until is null or now() < d.valid_until)
    and (d.max_uses is null or d.uses_count < d.max_uses);
$$;

grant execute on function public.active_discount_code(text) to anon, authenticated;

-- Lets the pricing page explain "valid September 1 to 30" instead of a bare
-- "invalid code" when someone tries it in August.
create or replace function public.discount_code_window(lookup_code text)
returns table (code text, valid_from timestamptz, valid_until timestamptz, is_active boolean)
language sql
security definer
set search_path = public
stable
as $$
  select d.code, d.valid_from, d.valid_until, d.is_active
  from public.discount_codes d
  where upper(d.code) = upper(trim(lookup_code));
$$;

grant execute on function public.discount_code_window(text) to anon, authenticated;

-- September 2026 promotion. Times are Eastern: Sept 1 00:00 EDT through
-- Oct 1 00:00 EDT, so the last usable moment is 11:59pm on September 30.
insert into public.discount_codes (code, plan_id, billing, discount_percent, is_active, valid_from, valid_until)
values ('REST30', 'transformation', 'any', 30, true,
        timestamptz '2026-09-01 00:00:00-04', timestamptz '2026-10-01 00:00:00-04')
on conflict (code) do update
set discount_percent = excluded.discount_percent,
    is_active = excluded.is_active,
    valid_from = excluded.valid_from,
    valid_until = excluded.valid_until;

-- uses_count was only ever incremented by redeem-coupon, which handles the 100%
-- codes. A percentage code is applied by Stripe instead, so the webhook counts
-- it — otherwise a promotion reports zero redemptions however many people used it.
create or replace function public.increment_discount_use(used_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.discount_codes
  set uses_count = uses_count + 1
  where upper(code) = upper(trim(used_code));
$$;

revoke all on function public.increment_discount_use(text) from public, anon, authenticated;
grant execute on function public.increment_discount_use(text) to service_role;
