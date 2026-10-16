-- =============================================================================
-- Expense Counter — Row Level Security policies
-- Apply AFTER schema.sql.
-- =============================================================================

-- Enable RLS on every application table.
alter table public.profiles           enable row level security;
alter table public.personal_expenses  enable row level security;
alter table public.messages           enable row level security;
alter table public.reports            enable row level security;
alter table public.blocks             enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- Any authenticated user may read basic profile fields (needed to start a chat).
-- Users may only modify and delete their own row.
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_delete_self" on public.profiles;
create policy "profiles_delete_self"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

-- -----------------------------------------------------------------------------
-- personal_expenses — strictly private to the owner.
-- -----------------------------------------------------------------------------
drop policy if exists "expenses_select_own" on public.personal_expenses;
create policy "expenses_select_own"
  on public.personal_expenses for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "expenses_insert_own" on public.personal_expenses;
create policy "expenses_insert_own"
  on public.personal_expenses for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "expenses_update_own" on public.personal_expenses;
create policy "expenses_update_own"
  on public.personal_expenses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "expenses_delete_own" on public.personal_expenses;
create policy "expenses_delete_own"
  on public.personal_expenses for delete
  to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- messages
-- Participants may read a message, EXCEPT when either party has blocked the
-- other. This is what hides blocked users' messages in both directions.
-- -----------------------------------------------------------------------------
drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages for select
  to authenticated
  using (
    (sender_id = auth.uid() or receiver_id = auth.uid())
    and not exists (
      select 1
      from public.blocks b
      where
        (b.blocker_id = auth.uid()
          and b.blocked_id = case when sender_id = auth.uid() then receiver_id else sender_id end)
        or
        (b.blocked_id = auth.uid()
          and b.blocker_id = case when sender_id = auth.uid() then receiver_id else sender_id end)
    )
  );

-- You may only send as yourself, never to yourself, and never across a block.
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_id <> receiver_id
    and not exists (
      select 1
      from public.blocks b
      where
        (b.blocker_id = auth.uid() and b.blocked_id = receiver_id)
        or (b.blocker_id = receiver_id and b.blocked_id = auth.uid())
    )
  );

-- Only the receiver may mark a message as read.
drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read"
  on public.messages for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

-- Only the sender may delete their own message.
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

-- -----------------------------------------------------------------------------
-- reports — users create reports and can read only their own submissions.
-- -----------------------------------------------------------------------------
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid() and reporter_id <> reported_user_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- -----------------------------------------------------------------------------
-- blocks — fully owned by the blocker.
-- -----------------------------------------------------------------------------
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Realtime: publish messages so the chat screen receives live inserts.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Storage: private "receipts" bucket. Each user can only touch files under a
-- folder named after their own user id (path = "<user_id>/<timestamp>.jpg").
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_select_own" on storage.objects;
create policy "receipts_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_insert_own" on storage.objects;
create policy "receipts_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_update_own" on storage.objects;
create policy "receipts_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
