-- Admin-controlled default price for engagement clicks.
-- Run this migration once in Supabase SQL Editor if migrations are not auto-applied.
alter table public.platform_settings
  add column if not exists engagement_click_price numeric(12,2) not null default 45;

-- Keep campaign click prices within the admin-controlled default when campaigns are created.
create or replace function public.get_engagement_click_price()
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce((select engagement_click_price from public.platform_settings order by updated_at desc nulls last limit 1), 45)::numeric;
$$;

-- If the campaigns table already exists, make the default follow the setting for new rows.
do $$
begin
  if to_regclass('public.engagement_campaigns') is not null then
    alter table public.engagement_campaigns alter column cost_per_click set default public.get_engagement_click_price();
  end if;
end $$;
