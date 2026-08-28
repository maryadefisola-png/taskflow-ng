-- Growvia activation plans + engagement campaigns
-- The same migration has been applied to the connected Supabase project.

create table if not exists public.activation_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12,2) not null default 0 check (price >= 0),
  daily_task_limit integer not null default 1 check (daily_task_limit >= 0),
  daily_blog_limit integer not null default 1 check (daily_blog_limit >= 0),
  referral_bonus numeric(12,2) not null default 0 check (referral_bonus >= 0),
  minimum_task_withdrawal numeric(12,2) not null default 1000 check (minimum_task_withdrawal >= 0),
  minimum_blog_withdrawal numeric(12,2) not null default 1000 check (minimum_blog_withdrawal >= 0),
  description text,
  benefits text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.activation_plans(id),
  amount_paid numeric(12,2) not null check (amount_paid >= 0),
  status text not null default 'active' check (status in ('pending','active','cancelled','expired')),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists user_one_active_activation on public.user_activations(user_id) where status='active';

create table if not exists public.engagement_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_url text not null,
  cost_per_click numeric(12,2) not null check (cost_per_click > 0),
  budget numeric(12,2) not null check (budget > 0),
  spent numeric(12,2) not null default 0 check (spent >= 0),
  total_clicks integer not null default 0 check (total_clicks >= 0),
  status text not null default 'pending' check (status in ('pending','approved','paused','rejected','completed','cancelled')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.engagement_clicks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.engagement_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_earned numeric(12,2) not null check (amount_earned >= 0),
  created_at timestamptz not null default now(),
  unique(campaign_id,user_id)
);

create index if not exists engagement_campaigns_user_idx on public.engagement_campaigns(user_id,created_at desc);
create index if not exists engagement_campaigns_status_idx on public.engagement_campaigns(status,created_at desc);
create index if not exists engagement_clicks_user_idx on public.engagement_clicks(user_id,created_at desc);

insert into public.activation_plans (name,price,daily_task_limit,daily_blog_limit,referral_bonus,minimum_task_withdrawal,minimum_blog_withdrawal,description,benefits,sort_order)
values
('Beginner',1000,1,1,650,1000,1000,'Starter access','Up to 1 task & blog daily',1),
('Novice',2000,3,3,1200,1000,1000,'Expanded access','Up to 3 tasks & blogs daily',2),
('Pro',3000,5,5,2000,1000,1000,'Pro access','Up to 5 tasks & blogs daily',3),
('Mid',5000,5,5,0,1000,1000,'Mid plan','Editable by admin',4)
on conflict (name) do nothing;

alter table public.activation_plans enable row level security;
alter table public.user_activations enable row level security;
alter table public.engagement_campaigns enable row level security;
alter table public.engagement_clicks enable row level security;

create policy activation_plans_public_read on public.activation_plans for select to authenticated using (is_active = true or public.is_admin());
create policy activation_plans_admin_insert on public.activation_plans for insert to authenticated with check (public.is_admin());
create policy activation_plans_admin_update on public.activation_plans for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy activation_plans_admin_delete on public.activation_plans for delete to authenticated using (public.is_admin());

create policy user_activations_self_read on public.user_activations for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy user_activations_admin_update on public.user_activations for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy engagement_campaigns_self_read on public.engagement_campaigns for select to authenticated using (user_id = auth.uid() or status = 'approved' or public.is_admin());
create policy engagement_campaigns_self_insert on public.engagement_campaigns for insert to authenticated with check (user_id = auth.uid());
create policy engagement_campaigns_self_update on public.engagement_campaigns for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy engagement_campaigns_admin_delete on public.engagement_campaigns for delete to authenticated using (public.is_admin());

create policy engagement_clicks_self_read on public.engagement_clicks for select to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.activate_plan(p_plan_id uuid)
returns public.user_activations
language plpgsql
security definer
set search_path = public
as $$
declare v_plan public.activation_plans; v_activation public.user_activations; v_existing public.user_activations; v_balance numeric;
begin
 select * into v_plan from public.activation_plans where id=p_plan_id and is_active=true for update;
 if not found then raise exception 'Activation plan is not available.'; end if;
 select * into v_existing from public.user_activations where user_id=auth.uid() and status='active' limit 1;
 if found then raise exception 'You already have an active plan.'; end if;
 select task_balance into v_balance from public.profiles where id=auth.uid() for update;
 if coalesce(v_balance,0) < v_plan.price then raise exception 'Insufficient wallet balance. Please add money first.'; end if;
 update public.profiles set task_balance=coalesce(task_balance,0)-v_plan.price where id=auth.uid();
 insert into public.user_activations(user_id,plan_id,amount_paid,status,activated_at)
 values(auth.uid(),v_plan.id,v_plan.price,'active',now()) returning * into v_activation;
 return v_activation;
end;
$$;
grant execute on function public.activate_plan(uuid) to authenticated;

create or replace function public.create_engagement_campaign(p_title text,p_description text,p_target_url text,p_cost_per_click numeric,p_budget numeric)
returns public.engagement_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare v_campaign public.engagement_campaigns; v_activation public.user_activations; v_balance numeric;
begin
 select * into v_activation from public.user_activations where user_id=auth.uid() and status='active' limit 1;
 if not found then raise exception 'You must activate a plan before creating an engagement campaign.'; end if;
 if trim(coalesce(p_title,''))='' then raise exception 'Campaign title is required.'; end if;
 if trim(coalesce(p_target_url,''))='' then raise exception 'Campaign link is required.'; end if;
 if p_cost_per_click <= 0 or p_budget <= 0 then raise exception 'Cost per click and budget must be greater than zero.'; end if;
 if p_budget < p_cost_per_click then raise exception 'Budget must be at least one click.'; end if;
 select task_balance into v_balance from public.profiles where id=auth.uid() for update;
 if coalesce(v_balance,0) < p_budget then raise exception 'Insufficient wallet balance for this campaign budget.'; end if;
 update public.profiles set task_balance=coalesce(task_balance,0)-p_budget where id=auth.uid();
 insert into public.engagement_campaigns(user_id,title,description,target_url,cost_per_click,budget,status)
 values(auth.uid(),trim(p_title),nullif(trim(coalesce(p_description,'')),''),trim(p_target_url),p_cost_per_click,p_budget,'pending') returning * into v_campaign;
 return v_campaign;
end;
$$;
grant execute on function public.create_engagement_campaign(text,text,text,numeric,numeric) to authenticated;

create or replace function public.register_engagement_click(p_campaign_id uuid)
returns public.engagement_clicks
language plpgsql
security definer
set search_path = public
as $$
declare v_campaign public.engagement_campaigns; v_click public.engagement_clicks; v_remaining numeric;
begin
 select * into v_campaign from public.engagement_campaigns where id=p_campaign_id and status='approved' for update;
 if not found then raise exception 'Campaign is not available.'; end if;
 if v_campaign.user_id=auth.uid() then raise exception 'You cannot click your own campaign.'; end if;
 if exists(select 1 from public.engagement_clicks where campaign_id=p_campaign_id and user_id=auth.uid()) then raise exception 'You have already clicked this campaign.'; end if;
 v_remaining := v_campaign.budget-v_campaign.spent;
 if v_remaining < v_campaign.cost_per_click then
   update public.engagement_campaigns set status='completed',updated_at=now() where id=p_campaign_id;
   raise exception 'Campaign budget is exhausted.';
 end if;
 insert into public.engagement_clicks(campaign_id,user_id,amount_earned) values(p_campaign_id,auth.uid(),v_campaign.cost_per_click) returning * into v_click;
 update public.profiles set task_balance=coalesce(task_balance,0)+v_campaign.cost_per_click where id=auth.uid();
 update public.engagement_campaigns set spent=spent+v_campaign.cost_per_click,total_clicks=total_clicks+1,status=case when spent+v_campaign.cost_per_click >= budget then 'completed' else status end,updated_at=now() where id=p_campaign_id;
 return v_click;
end;
$$;
grant execute on function public.register_engagement_click(uuid) to authenticated;

create or replace function public.refund_engagement_campaign(p_campaign_id uuid,p_reason text default null)
returns public.engagement_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare v_campaign public.engagement_campaigns; v_refund numeric;
begin
 if not public.is_admin() then raise exception 'Admin access required.'; end if;
 select * into v_campaign from public.engagement_campaigns where id=p_campaign_id for update;
 if not found then raise exception 'Campaign not found.'; end if;
 if v_campaign.status in ('cancelled','completed') then raise exception 'This campaign can no longer be refunded.'; end if;
 v_refund:=greatest(v_campaign.budget-v_campaign.spent,0);
 if v_refund>0 then update public.profiles set task_balance=coalesce(task_balance,0)+v_refund where id=v_campaign.user_id; end if;
 update public.engagement_campaigns set status='cancelled',rejection_reason=nullif(trim(coalesce(p_reason,'')),''),updated_at=now() where id=p_campaign_id returning * into v_campaign;
 return v_campaign;
end;
$$;
grant execute on function public.refund_engagement_campaign(uuid,text) to authenticated;
