-- Import Export AI Assistant MVP schema
-- Run this in Supabase SQL editor when you are ready to create the database.

create extension if not exists "pgcrypto";

create table if not exists public.users_profile (
  id uuid primary key default gen_random_uuid(),
  email text,
  full_name text,
  created_at timestamp with time zone default now()
);

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

-- Row Level Security placeholders
-- alter table public.users_profile enable row level security;
-- alter table public.email_messages enable row level security;
-- alter table public.extracted_trade_details enable row level security;
-- alter table public.ai_drafts enable row level security;
-- alter table public.follow_ups enable row level security;

-- TODO: Add policy so users can read and update only their own users_profile row.
-- TODO: Add policy so users can manage only email_messages where user_id = auth.uid().
-- TODO: Add policy so users can manage extracted_trade_details through owned email_messages.
-- TODO: Add policy so users can manage ai_drafts through owned email_messages.
-- TODO: Add policy so users can manage follow_ups through owned email_messages.
