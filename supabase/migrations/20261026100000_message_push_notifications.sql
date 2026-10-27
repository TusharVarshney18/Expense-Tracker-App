-- Track whether a chat message has already produced a push notification.
-- The Edge Function claims this column atomically so retries cannot send the
-- same message notification twice.
alter table public.messages
  add column if not exists push_notified_at timestamptz;

create index if not exists idx_messages_unnotified
  on public.messages (conversation_id)
  where push_notified_at is null;
