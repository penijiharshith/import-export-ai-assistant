-- Import Export AI Assistant MVP schema
-- Run this in Supabase SQL editor when you are ready to create the database.

create extension if not exists "pgcrypto";

create table if not exists public.users_profile (
  id uuid primary key default gen_random_uuid(),
  email text,
  full_name text,
  business_role text default 'both',
  created_at timestamp with time zone default now()
);

alter table public.users_profile
add column if not exists business_role text default 'both';

alter table public.users_profile
drop constraint if exists users_profile_business_role_check;

alter table public.users_profile
add constraint users_profile_business_role_check
check (business_role in ('buyer', 'seller', 'both'));

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users_profile(id) on delete cascade,
  gmail_message_id text,
  sender text,
  subject text,
  body text,
  category text,
  status text,
  received_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create unique index if not exists email_messages_user_gmail_message_id_key
  on public.email_messages(user_id, gmail_message_id);

create table if not exists public.extracted_trade_details (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references public.email_messages(id) on delete cascade,
  product text,
  quantity text,
  price text,
  incoterm text,
  origin_country text,
  destination_country text,
  delivery_date text,
  payment_terms text,
  missing_fields jsonb default '[]'::jsonb,
  risk_notes jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references public.email_messages(id) on delete cascade,
  draft_type text,
  subject text,
  body text,
  status text,
  approved_by_user boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references public.email_messages(id) on delete cascade,
  draft_id uuid references public.ai_drafts(id) on delete set null,
  follow_up_date timestamp with time zone,
  status text,
  note text,
  created_at timestamp with time zone default now()
);

create table if not exists public.ai_action_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users_profile(id) on delete cascade,
  email_id uuid references public.email_messages(id) on delete cascade,
  role_context text,
  summary text,
  business_goal text,
  recommended_action text,
  urgency text,
  missing_info jsonb default '[]'::jsonb,
  risks jsonb default '[]'::jsonb,
  suggested_reply_type text,
  created_at timestamp with time zone default now()
);

create index if not exists email_messages_user_id_idx
  on public.email_messages(user_id);

create index if not exists email_messages_status_idx
  on public.email_messages(status);

create index if not exists extracted_trade_details_email_id_idx
  on public.extracted_trade_details(email_id);

create index if not exists ai_drafts_email_id_idx
  on public.ai_drafts(email_id);

create index if not exists follow_ups_email_id_idx
  on public.follow_ups(email_id);

create index if not exists follow_ups_follow_up_date_idx
  on public.follow_ups(follow_up_date);

create index if not exists ai_action_suggestions_user_id_idx
  on public.ai_action_suggestions(user_id);

create index if not exists ai_action_suggestions_email_id_idx
  on public.ai_action_suggestions(email_id);

-- Row Level Security placeholders
-- alter table public.users_profile enable row level security;
-- alter table public.email_messages enable row level security;
-- alter table public.extracted_trade_details enable row level security;
-- alter table public.ai_drafts enable row level security;
-- alter table public.follow_ups enable row level security;
-- alter table public.ai_action_suggestions enable row level security;

-- TODO: Add policy so users can read and update only their own users_profile row.
-- TODO: Add policy so users can manage only email_messages where user_id = auth.uid().
-- TODO: Add policy so users can manage extracted_trade_details through owned email_messages.
-- TODO: Add policy so users can manage ai_drafts through owned email_messages.
-- TODO: Add policy so users can manage follow_ups through owned email_messages.
-- TODO: Add policy so users can manage ai_action_suggestions through owned email_messages.

create table if not exists public.supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email_id uuid references public.email_messages(id) on delete set null,
  supplier_name text,
  product text,
  unit_price numeric,
  currency text default 'USD',
  quantity integer,
  moq integer,
  incoterm text,
  lead_time text,
  payment_terms text,
  destination_country text,
  source_type text default 'email',
  risk_notes text,
  created_at timestamp with time zone default now()
);

create unique index if not exists supplier_quotes_email_id_key
  on public.supplier_quotes(email_id);

create index if not exists supplier_quotes_user_id_idx
  on public.supplier_quotes(user_id);

alter table public.supplier_quotes enable row level security;

drop policy if exists "Users can view own supplier quotes" on public.supplier_quotes;
create policy "Users can view own supplier quotes"
  on public.supplier_quotes for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own supplier quotes" on public.supplier_quotes;
create policy "Users can insert own supplier quotes"
  on public.supplier_quotes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own supplier quotes" on public.supplier_quotes;
create policy "Users can update own supplier quotes"
  on public.supplier_quotes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own supplier quotes" on public.supplier_quotes;
create policy "Users can delete own supplier quotes"
  on public.supplier_quotes for delete using (auth.uid() = user_id);

-- Follow-up reminders upgrade
alter table public.follow_ups
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists reminder_type text default 'manual',
  add column if not exists due_date timestamp with time zone;

alter table public.follow_ups
  alter column status set default 'pending';

update public.follow_ups as follow_up
set
  user_id = email.user_id,
  due_date = coalesce(follow_up.due_date, follow_up.follow_up_date)
from public.email_messages as email
where follow_up.email_id = email.id
  and (follow_up.user_id is null or follow_up.due_date is null);

create unique index if not exists follow_ups_email_id_key
  on public.follow_ups(email_id);

create index if not exists follow_ups_user_id_idx
  on public.follow_ups(user_id);

create index if not exists follow_ups_due_date_idx
  on public.follow_ups(due_date);

alter table public.follow_ups enable row level security;

drop policy if exists "Users can manage own follow_ups" on public.follow_ups;
create policy "Users can manage own follow_ups"
  on public.follow_ups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
