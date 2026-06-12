alter table public.email_messages
add column if not exists classification_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'email_messages_classification_status_check'
  ) then
    alter table public.email_messages
    add constraint email_messages_classification_status_check
    check (
      classification_status is null
      or classification_status in ('classified', 'retry', 'unclassified')
    );
  end if;
end $$;

comment on column public.email_messages.classification_status is
'AI classification lifecycle status: classified, retry, or unclassified.';

update public.email_messages
set classification_status = 'retry'
where category = 'other'
  and classification_confidence = 0
  and classification_reason = 'Unable to classify confidently.';
