-- Core Row Level Security for Import Export AI Assistant user data.
-- Review and run manually in Supabase. This migration is non-destructive:
-- it enables RLS, refreshes explicit ownership policies, and adjusts table
-- privileges without updating, deleting, or inserting application data.

-- Ownership rules:
-- users_profile: users own rows where id = auth.uid().
-- email_messages: users own rows where user_id = auth.uid().
-- extracted_trade_details: users own rows through email_messages.user_id.
-- ai_drafts: users own rows through email_messages.user_id.
-- ai_action_suggestions: users own rows by user_id and parent email owner.
-- follow_ups: users own rows by user_id, parent email owner, and optional draft owner.
-- supplier_quotes: users own rows by user_id and optional parent email owner.

alter table public.users_profile enable row level security;
alter table public.email_messages enable row level security;
alter table public.extracted_trade_details enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.ai_action_suggestions enable row level security;
alter table public.follow_ups enable row level security;
alter table public.supplier_quotes enable row level security;

revoke all on table public.users_profile from anon;
revoke all on table public.email_messages from anon;
revoke all on table public.extracted_trade_details from anon;
revoke all on table public.ai_drafts from anon;
revoke all on table public.ai_action_suggestions from anon;
revoke all on table public.follow_ups from anon;
revoke all on table public.supplier_quotes from anon;

grant select, insert, update, delete on table public.users_profile to authenticated;
grant select, insert, update, delete on table public.email_messages to authenticated;
grant select, insert, update, delete on table public.extracted_trade_details to authenticated;
grant select, insert, update, delete on table public.ai_drafts to authenticated;
grant select, insert, update, delete on table public.ai_action_suggestions to authenticated;
grant select, insert, update, delete on table public.follow_ups to authenticated;
grant select, insert, update, delete on table public.supplier_quotes to authenticated;

drop policy if exists users_profile_select_own on public.users_profile;
drop policy if exists users_profile_insert_own on public.users_profile;
drop policy if exists users_profile_update_own on public.users_profile;
drop policy if exists users_profile_delete_own on public.users_profile;

create policy users_profile_select_own
  on public.users_profile
  for select
  to authenticated
  using (id = auth.uid());

create policy users_profile_insert_own
  on public.users_profile
  for insert
  to authenticated
  with check (id = auth.uid());

create policy users_profile_update_own
  on public.users_profile
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_profile_delete_own
  on public.users_profile
  for delete
  to authenticated
  using (id = auth.uid());

drop policy if exists email_messages_select_own on public.email_messages;
drop policy if exists email_messages_insert_own on public.email_messages;
drop policy if exists email_messages_update_own on public.email_messages;
drop policy if exists email_messages_delete_own on public.email_messages;

create policy email_messages_select_own
  on public.email_messages
  for select
  to authenticated
  using (user_id = auth.uid());

create policy email_messages_insert_own
  on public.email_messages
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy email_messages_update_own
  on public.email_messages
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy email_messages_delete_own
  on public.email_messages
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists extracted_trade_details_select_own_email on public.extracted_trade_details;
drop policy if exists extracted_trade_details_insert_own_email on public.extracted_trade_details;
drop policy if exists extracted_trade_details_update_own_email on public.extracted_trade_details;
drop policy if exists extracted_trade_details_delete_own_email on public.extracted_trade_details;

create policy extracted_trade_details_select_own_email
  on public.extracted_trade_details
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = extracted_trade_details.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy extracted_trade_details_insert_own_email
  on public.extracted_trade_details
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = extracted_trade_details.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy extracted_trade_details_update_own_email
  on public.extracted_trade_details
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = extracted_trade_details.email_id
        and email_messages.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = extracted_trade_details.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy extracted_trade_details_delete_own_email
  on public.extracted_trade_details
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = extracted_trade_details.email_id
        and email_messages.user_id = auth.uid()
    )
  );

drop policy if exists ai_drafts_select_own_email on public.ai_drafts;
drop policy if exists ai_drafts_insert_own_email on public.ai_drafts;
drop policy if exists ai_drafts_update_own_email on public.ai_drafts;
drop policy if exists ai_drafts_delete_own_email on public.ai_drafts;

create policy ai_drafts_select_own_email
  on public.ai_drafts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_drafts.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy ai_drafts_insert_own_email
  on public.ai_drafts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_drafts.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy ai_drafts_update_own_email
  on public.ai_drafts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_drafts.email_id
        and email_messages.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_drafts.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy ai_drafts_delete_own_email
  on public.ai_drafts
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_drafts.email_id
        and email_messages.user_id = auth.uid()
    )
  );

drop policy if exists ai_action_suggestions_select_own on public.ai_action_suggestions;
drop policy if exists ai_action_suggestions_insert_own on public.ai_action_suggestions;
drop policy if exists ai_action_suggestions_update_own on public.ai_action_suggestions;
drop policy if exists ai_action_suggestions_delete_own on public.ai_action_suggestions;

create policy ai_action_suggestions_select_own
  on public.ai_action_suggestions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_action_suggestions.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy ai_action_suggestions_insert_own
  on public.ai_action_suggestions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_action_suggestions.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy ai_action_suggestions_update_own
  on public.ai_action_suggestions
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_action_suggestions.email_id
        and email_messages.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_action_suggestions.email_id
        and email_messages.user_id = auth.uid()
    )
  );

create policy ai_action_suggestions_delete_own
  on public.ai_action_suggestions
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = ai_action_suggestions.email_id
        and email_messages.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own follow_ups" on public.follow_ups;
drop policy if exists follow_ups_select_own on public.follow_ups;
drop policy if exists follow_ups_insert_own on public.follow_ups;
drop policy if exists follow_ups_update_own on public.follow_ups;
drop policy if exists follow_ups_delete_own on public.follow_ups;

create policy follow_ups_select_own
  on public.follow_ups
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = follow_ups.email_id
        and email_messages.user_id = auth.uid()
    )
    and (
      draft_id is null
      or exists (
        select 1
        from public.ai_drafts
        join public.email_messages on email_messages.id = ai_drafts.email_id
        where ai_drafts.id = follow_ups.draft_id
          and email_messages.user_id = auth.uid()
      )
    )
  );

create policy follow_ups_insert_own
  on public.follow_ups
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = follow_ups.email_id
        and email_messages.user_id = auth.uid()
    )
    and (
      draft_id is null
      or exists (
        select 1
        from public.ai_drafts
        join public.email_messages on email_messages.id = ai_drafts.email_id
        where ai_drafts.id = follow_ups.draft_id
          and email_messages.user_id = auth.uid()
      )
    )
  );

create policy follow_ups_update_own
  on public.follow_ups
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = follow_ups.email_id
        and email_messages.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = follow_ups.email_id
        and email_messages.user_id = auth.uid()
    )
    and (
      draft_id is null
      or exists (
        select 1
        from public.ai_drafts
        join public.email_messages on email_messages.id = ai_drafts.email_id
        where ai_drafts.id = follow_ups.draft_id
          and email_messages.user_id = auth.uid()
      )
    )
  );

create policy follow_ups_delete_own
  on public.follow_ups
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.email_messages
      where email_messages.id = follow_ups.email_id
        and email_messages.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view own supplier quotes" on public.supplier_quotes;
drop policy if exists "Users can insert own supplier quotes" on public.supplier_quotes;
drop policy if exists "Users can update own supplier quotes" on public.supplier_quotes;
drop policy if exists "Users can delete own supplier quotes" on public.supplier_quotes;
drop policy if exists supplier_quotes_select_own on public.supplier_quotes;
drop policy if exists supplier_quotes_insert_own on public.supplier_quotes;
drop policy if exists supplier_quotes_update_own on public.supplier_quotes;
drop policy if exists supplier_quotes_delete_own on public.supplier_quotes;

create policy supplier_quotes_select_own
  on public.supplier_quotes
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and (
      email_id is null
      or exists (
        select 1
        from public.email_messages
        where email_messages.id = supplier_quotes.email_id
          and email_messages.user_id = auth.uid()
      )
    )
  );

create policy supplier_quotes_insert_own
  on public.supplier_quotes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      email_id is null
      or exists (
        select 1
        from public.email_messages
        where email_messages.id = supplier_quotes.email_id
          and email_messages.user_id = auth.uid()
      )
    )
  );

create policy supplier_quotes_update_own
  on public.supplier_quotes
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and (
      email_id is null
      or exists (
        select 1
        from public.email_messages
        where email_messages.id = supplier_quotes.email_id
          and email_messages.user_id = auth.uid()
      )
    )
  )
  with check (
    user_id = auth.uid()
    and (
      email_id is null
      or exists (
        select 1
        from public.email_messages
        where email_messages.id = supplier_quotes.email_id
          and email_messages.user_id = auth.uid()
      )
    )
  );

create policy supplier_quotes_delete_own
  on public.supplier_quotes
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and (
      email_id is null
      or exists (
        select 1
        from public.email_messages
        where email_messages.id = supplier_quotes.email_id
          and email_messages.user_id = auth.uid()
      )
    )
  );
