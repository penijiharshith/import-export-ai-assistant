alter table public.email_messages
add column if not exists classification_confidence numeric;

alter table public.email_messages
add column if not exists classification_reason text;
