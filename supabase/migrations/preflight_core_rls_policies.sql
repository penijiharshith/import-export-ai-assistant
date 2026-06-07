-- Read-only preflight checks for 20260607181326_add_core_rls_policies.sql.
-- Run manually before applying RLS policies to an existing Supabase project.
-- Any returned rows should be reviewed before applying the migration.
-- This file only uses SELECT statements and does not modify data.

-- Expected table and ownership-column presence.
select
  expected.table_name,
  case when tables.table_name is null then 'missing_table' else 'present' end as table_status
from (
  values
    ('users_profile'),
    ('email_messages'),
    ('extracted_trade_details'),
    ('ai_drafts'),
    ('ai_action_suggestions'),
    ('follow_ups'),
    ('supplier_quotes')
) as expected(table_name)
left join information_schema.tables as tables
  on tables.table_schema = 'public'
 and tables.table_name = expected.table_name
where tables.table_name is null;

select
  expected.table_name,
  expected.column_name,
  'missing_expected_column' as issue
from (
  values
    ('users_profile', 'id'),
    ('email_messages', 'user_id'),
    ('email_messages', 'gmail_message_id'),
    ('extracted_trade_details', 'email_id'),
    ('ai_drafts', 'email_id'),
    ('ai_action_suggestions', 'user_id'),
    ('ai_action_suggestions', 'email_id'),
    ('follow_ups', 'user_id'),
    ('follow_ups', 'email_id'),
    ('follow_ups', 'draft_id'),
    ('supplier_quotes', 'user_id'),
    ('supplier_quotes', 'email_id')
) as expected(table_name, column_name)
left join information_schema.columns as columns
  on columns.table_schema = 'public'
 and columns.table_name = expected.table_name
 and columns.column_name = expected.column_name
where columns.column_name is null;

-- Null direct ownership fields.
select 'users_profile_null_id' as check_name, id
from public.users_profile
where id is null;

select 'email_messages_null_user_id' as check_name, id
from public.email_messages
where user_id is null;

select 'ai_action_suggestions_null_user_or_email_id' as check_name, id, user_id, email_id
from public.ai_action_suggestions
where user_id is null or email_id is null;

select 'follow_ups_null_user_or_email_id' as check_name, id, user_id, email_id
from public.follow_ups
where user_id is null or email_id is null;

select 'supplier_quotes_null_user_id' as check_name, id, user_id, email_id
from public.supplier_quotes
where user_id is null;

-- Orphan child rows.
select 'extracted_trade_details_orphan_email_id' as check_name, details.id, details.email_id
from public.extracted_trade_details as details
left join public.email_messages as email on email.id = details.email_id
where details.email_id is not null
  and email.id is null;

select 'ai_drafts_orphan_email_id' as check_name, draft.id, draft.email_id
from public.ai_drafts as draft
left join public.email_messages as email on email.id = draft.email_id
where draft.email_id is not null
  and email.id is null;

select 'ai_action_suggestions_orphan_email_id' as check_name, suggestion.id, suggestion.email_id
from public.ai_action_suggestions as suggestion
left join public.email_messages as email on email.id = suggestion.email_id
where suggestion.email_id is not null
  and email.id is null;

select 'follow_ups_orphan_email_id' as check_name, follow_up.id, follow_up.email_id
from public.follow_ups as follow_up
left join public.email_messages as email on email.id = follow_up.email_id
where follow_up.email_id is not null
  and email.id is null;

select 'supplier_quotes_orphan_email_id' as check_name, quote.id, quote.email_id
from public.supplier_quotes as quote
left join public.email_messages as email on email.id = quote.email_id
where quote.email_id is not null
  and email.id is null;

select 'follow_ups_orphan_draft_id' as check_name, follow_up.id, follow_up.draft_id
from public.follow_ups as follow_up
left join public.ai_drafts as draft on draft.id = follow_up.draft_id
where follow_up.draft_id is not null
  and draft.id is null;

-- Direct user_id mismatches with parent email owner.
select 'ai_action_suggestions_email_owner_mismatch' as check_name, suggestion.id, suggestion.user_id, email.user_id as email_user_id
from public.ai_action_suggestions as suggestion
join public.email_messages as email on email.id = suggestion.email_id
where suggestion.user_id is distinct from email.user_id;

select 'follow_ups_email_owner_mismatch' as check_name, follow_up.id, follow_up.user_id, email.user_id as email_user_id
from public.follow_ups as follow_up
join public.email_messages as email on email.id = follow_up.email_id
where follow_up.user_id is distinct from email.user_id;

select 'supplier_quotes_email_owner_mismatch' as check_name, quote.id, quote.user_id, email.user_id as email_user_id
from public.supplier_quotes as quote
join public.email_messages as email on email.id = quote.email_id
where quote.user_id is distinct from email.user_id;

select 'follow_ups_draft_owner_mismatch' as check_name, follow_up.id, follow_up.user_id, email.user_id as draft_email_user_id
from public.follow_ups as follow_up
join public.ai_drafts as draft on draft.id = follow_up.draft_id
join public.email_messages as email on email.id = draft.email_id
where follow_up.draft_id is not null
  and follow_up.user_id is distinct from email.user_id;

-- Duplicate checks for uniqueness assumptions and unique indexes in schema.sql.
select 'email_messages_duplicate_gmail_message_per_user' as check_name, user_id, gmail_message_id, count(*) as row_count
from public.email_messages
where user_id is not null
  and gmail_message_id is not null
group by user_id, gmail_message_id
having count(*) > 1;

select 'extracted_trade_details_duplicate_email_id' as check_name, email_id, count(*) as row_count
from public.extracted_trade_details
where email_id is not null
group by email_id
having count(*) > 1;

select 'ai_drafts_duplicate_email_id' as check_name, email_id, count(*) as row_count
from public.ai_drafts
where email_id is not null
group by email_id
having count(*) > 1;

select 'follow_ups_duplicate_email_id' as check_name, email_id, count(*) as row_count
from public.follow_ups
where email_id is not null
group by email_id
having count(*) > 1;

select 'supplier_quotes_duplicate_email_id' as check_name, email_id, count(*) as row_count
from public.supplier_quotes
where email_id is not null
group by email_id
having count(*) > 1;

-- Current RLS status before migration.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users_profile',
    'email_messages',
    'extracted_trade_details',
    'ai_drafts',
    'ai_action_suggestions',
    'follow_ups',
    'supplier_quotes'
  )
  and rowsecurity is not true;
