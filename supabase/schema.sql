-- =============================================================================
-- Expense Counter — database schema
-- Apply in the Supabase SQL editor BEFORE policies.sql.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles
-- One row per auth user. Holds the push token used for notifications.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  display_name text,
  upi_id      text,
  avatar_url  text,
  push_token  text,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists upi_id text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

update public.profiles
set display_name = full_name
where display_name is null and full_name is not null;

-- -----------------------------------------------------------------------------
-- personal_expenses
-- The signed-in user's own expense records, optionally with a receipt image.
-- -----------------------------------------------------------------------------
create table if not exists public.personal_expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount >= 0),
  category     text not null default 'general',
  note         text,
  receipt_url  text,
  spent_at     date not null default current_date,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Conversations
-- Existing message pairs are linked and marked accepted by the chat requests
-- migration below. New pairs begin pending unless users share a group.
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending','accepted','declined')),
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  push_notified_at timestamptz,
  check (user_low_id < user_high_id),
  unique (user_low_id,user_high_id)
);

-- -----------------------------------------------------------------------------
-- messages
-- 1:1 chat messages between two users.
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  receiver_id  uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  read_at      timestamptz,
  push_notified_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint messages_not_self check (sender_id <> receiver_id)
);

-- -----------------------------------------------------------------------------
-- reports
-- A user's report of another user and, optionally, a specific message.
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references public.profiles (id) on delete cascade,
  reported_user_id  uuid not null references public.profiles (id) on delete cascade,
  conversation_id   uuid references public.conversations (id) on delete set null,
  message_id        uuid references public.messages (id) on delete set null,
  reason            text not null check (reason in ('spam', 'harassment', 'hate', 'scam', 'other')),
  details           text,
  status            text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at        timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_user_id)
);

-- -----------------------------------------------------------------------------
-- blocks
-- Directional block. If A blocks B, messages in BOTH directions are hidden.
-- -----------------------------------------------------------------------------
create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

-- -----------------------------------------------------------------------------
-- Shared groups and integer-paise expense splits.
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique default lower(encode(gen_random_bytes(12), 'hex')),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  paid_by uuid not null references public.profiles (id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  description text,
  category text,
  expense_date date not null default current_date,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz
);

create table if not exists public.expense_splits (
  expense_id uuid not null references public.group_expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  share_paise bigint not null check (share_paise >= 0),
  primary key (expense_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_expenses_user_spent
  on public.personal_expenses (user_id, spent_at desc);

create index if not exists idx_messages_sender
  on public.messages (sender_id, created_at desc);

create index if not exists idx_messages_receiver
  on public.messages (receiver_id, created_at desc);

create index if not exists idx_blocks_blocker
  on public.blocks (blocker_id);

create index if not exists idx_blocks_blocked
  on public.blocks (blocked_id);

create index if not exists idx_reports_reporter
  on public.reports (reporter_id, created_at desc);

create index if not exists idx_groups_created_by
  on public.groups (created_by);

create index if not exists idx_group_members_user_id
  on public.group_members (user_id);

create index if not exists idx_group_expenses_paid_by
  on public.group_expenses (paid_by);

create index if not exists idx_group_expenses_created_by
  on public.group_expenses (created_by);

create index if not exists idx_group_expenses_group_created
  on public.group_expenses (group_id, created_at desc);

create index if not exists idx_expense_splits_user_id
  on public.expense_splits (user_id);

create index if not exists idx_settlements_from_user
  on public.settlements (from_user);

create index if not exists idx_settlements_to_user
  on public.settlements (to_user);

create index if not exists idx_settlements_created_by
  on public.settlements (created_by);

create index if not exists idx_settlements_group_created
  on public.settlements (group_id, created_at desc);

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_member_for_user(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid
  );
$$;

-- Same public RPC signature and validation as policies.sql and the migration.
create or replace function public.add_group_expense(
  p_group_id uuid,
  p_paid_by uuid,
  p_amount_paise bigint,
  p_description text,
  p_category text,
  p_expense_date date,
  p_splits jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  expense_id uuid;
  split_count integer;
  unique_user_count integer;
  split_total bigint;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group';
  end if;
  perform 1 from public.groups where id = p_group_id for update;
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;
  if not public.is_group_member_for_user(p_group_id, p_paid_by) then
    raise exception 'Payer must be a group member';
  end if;
  if p_splits is null or jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'Select at least one member to split this expense with';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_splits) as part(value)
    where jsonb_typeof(part.value) <> 'object'
      or not (part.value ? 'user_id')
      or not (part.value ? 'share_paise')
      or (part.value ->> 'user_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (part.value ->> 'share_paise') !~ '^[0-9]+$'
  ) then
    raise exception 'Invalid expense split data';
  end if;

  select count(*)::integer,
         count(distinct (part.value ->> 'user_id')::uuid)::integer,
         coalesce(sum((part.value ->> 'share_paise')::bigint), 0)::bigint
  into split_count, unique_user_count, split_total
  from jsonb_array_elements(p_splits) as part(value);

  if split_count <> unique_user_count then
    raise exception 'Each member can appear only once in the split';
  end if;
  if split_total <> p_amount_paise then
    raise exception 'Split shares must add up to the expense amount';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_splits) as part(value)
    where not public.is_group_member_for_user(p_group_id, (part.value ->> 'user_id')::uuid)
  ) then
    raise exception 'Every person in the split must be a group member';
  end if;

  insert into public.group_expenses (
    group_id, paid_by, amount_paise, description, category, expense_date, created_by
  ) values (
    p_group_id, p_paid_by, p_amount_paise, nullif(btrim(p_description), ''),
    coalesce(nullif(btrim(p_category), ''), 'general'), coalesce(p_expense_date, current_date), uid
  ) returning id into expense_id;

  insert into public.expense_splits (expense_id, user_id, share_paise)
  select expense_id, (part.value ->> 'user_id')::uuid, (part.value ->> 'share_paise')::bigint
  from jsonb_array_elements(p_splits) as part(value);

  return expense_id;
end;
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.is_group_member_for_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
  to authenticated;

-- Remove entries involving a deleted account as whole ledger entries, then
-- transfer group ownership/admin to a remaining member so splits stay balanced.
create or replace function public.cleanup_group_data_before_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_next_user uuid;
begin
  delete from public.group_expenses ge
  where ge.paid_by = old.id
     or ge.created_by = old.id
     or exists (
       select 1 from public.expense_splits es
       where es.expense_id = ge.id and es.user_id = old.id
     );

  delete from public.settlements s
  where s.from_user = old.id or s.to_user = old.id or s.created_by = old.id;

  for v_group_id in
    select gm.group_id from public.group_members gm where gm.user_id = old.id
  loop
    select gm.user_id into v_next_user
    from public.group_members gm
    where gm.group_id = v_group_id and gm.user_id <> old.id
    order by (gm.role = 'admin') desc, gm.joined_at asc
    limit 1;

    if v_next_user is null then
      delete from public.groups where id = v_group_id;
      continue;
    end if;

    update public.groups
    set created_by = v_next_user
    where id = v_group_id and created_by = old.id;

    if exists (
      select 1 from public.group_members gm
      where gm.group_id = v_group_id and gm.user_id = old.id and gm.role = 'admin'
    ) and not exists (
      select 1 from public.group_members gm
      where gm.group_id = v_group_id and gm.user_id <> old.id and gm.role = 'admin'
    ) then
      update public.group_members
      set role = 'admin'
      where group_id = v_group_id and user_id = v_next_user;
    end if;
  end loop;

  return old;
end;
$$;

drop trigger if exists profiles_cleanup_groups_before_delete on public.profiles;
create trigger profiles_cleanup_groups_before_delete
  before delete on public.profiles
  for each row execute function public.cleanup_group_data_before_profile_delete();

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create a profile row when a user signs up.
-- full_name comes from the metadata sent by signUp({ options: { data } }).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, display_name, terms_accepted_at, terms_version)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    case when new.raw_user_meta_data ->> 'terms_version' = '2026-10-21' then now() else null end,
    case when new.raw_user_meta_data ->> 'terms_version' = '2026-10-21' then '2026-10-21' else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Explicitly record acceptance of the current Terms before UGC messaging.
create or replace function public.accept_current_terms(p_terms_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_terms_version is distinct from '2026-10-21' then
    raise exception 'Unsupported Terms of Service version';
  end if;
  update public.profiles
  set terms_accepted_at = now(), terms_version = p_terms_version
  where id = uid;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

-- Backfill users who existed before this schema/trigger was installed.
insert into public.profiles (id, email, full_name, display_name)
select
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name')
from auth.users
where email is not null
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- delete_account()
-- Called by the in-app Delete Account flow. Runs as the function owner so it can
-- remove the auth.users row (the client cannot do this directly).
--   * clears the push token
--   * deletes the profile row, cascading to personal_expenses, messages,
--     blocks and reports
--   * deletes the auth.users row
-- -----------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'delete_account: not authenticated';
  end if;

  update public.profiles set push_token = null where id = uid;

  delete from public.profiles where id = uid;

  -- Cascade removes the profile; this removes the login credentials too.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Chat message request lifecycle and secure RPCs (kept in sync with the migration).
begin;
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending','accepted','declined')),
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), push_notified_at timestamptz,
  constraint conversations_distinct_users check (user_low_id < user_high_id),
  constraint conversations_pair_unique unique (user_low_id,user_high_id)
);
alter table public.conversations add column if not exists status text not null default 'accepted';
alter table public.conversations add column if not exists requested_by uuid references public.profiles(id) on delete set null;
alter table public.conversations add column if not exists push_notified_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='conversations_status_check') then
    alter table public.conversations add constraint conversations_status_check check(status in ('pending','accepted','declined'));
  end if;
end $$;
alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists push_notified_at timestamptz;
insert into public.conversations(user_low_id,user_high_id,status)
select least(sender_id,receiver_id),greatest(sender_id,receiver_id),'accepted' from public.messages
group by least(sender_id,receiver_id),greatest(sender_id,receiver_id)
on conflict(user_low_id,user_high_id) do nothing;
update public.messages m set conversation_id=c.id from public.conversations c
where c.user_low_id=least(m.sender_id,m.receiver_id) and c.user_high_id=greatest(m.sender_id,m.receiver_id)
and m.conversation_id is null;
alter table public.messages alter column conversation_id set not null;
create index if not exists idx_conversations_user_low on public.conversations(user_low_id);
create index if not exists idx_conversations_user_high on public.conversations(user_high_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id,created_at desc);
alter table public.conversations enable row level security;
grant select on public.conversations to authenticated;
drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants on public.conversations for select to authenticated
using(auth.uid() in (user_low_id,user_high_id));

create or replace function public.enforce_conversation_message_rules() returns trigger
language plpgsql security definer set search_path=public as $$
declare c public.conversations%rowtype;
begin
  if not exists (select 1 from public.profiles p where p.id=new.sender_id and p.terms_version='2026-10-21') then
    raise exception 'Accept the current Terms of Service before sending messages';
  end if;
  select * into c from public.conversations where id=new.conversation_id for update;
  if not found or least(new.sender_id,new.receiver_id)<>c.user_low_id or greatest(new.sender_id,new.receiver_id)<>c.user_high_id then
    raise exception 'Message participants do not match the conversation';
  end if;
  if exists(select 1 from public.blocks b where (b.blocker_id=new.sender_id and b.blocked_id=new.receiver_id) or (b.blocker_id=new.receiver_id and b.blocked_id=new.sender_id)) then
    raise exception 'Messaging is unavailable because one user blocked the other';
  end if;
  if c.status='declined' then raise exception 'This conversation request was declined'; end if;
  if c.status='pending' then
    if new.sender_id<>c.requested_by then raise exception 'Only the requester may send while a request is pending'; end if;
    if exists(select 1 from public.messages m where m.conversation_id=c.id) then raise exception 'Only one message may be sent while a request is pending'; end if;
  end if;
  return new;
end $$;
drop trigger if exists messages_enforce_conversation_rules on public.messages;
create trigger messages_enforce_conversation_rules before insert on public.messages for each row execute function public.enforce_conversation_message_rules();

create or replace function public.start_conversation(p_other_user uuid,p_first_message text)
returns table(conversation_id uuid,created boolean) language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); low_id uuid; high_id uuid; c_id uuid; c_status text; auto_accept boolean; first_text text:=btrim(coalesce(p_first_message,''));
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_other_user is null or p_other_user=uid then raise exception 'Cannot start a conversation with yourself'; end if;
  if char_length(first_text) not between 1 and 2000 then raise exception 'First message must contain 1 to 2000 characters'; end if;
  if exists(select 1 from public.blocks b where (b.blocker_id=uid and b.blocked_id=p_other_user) or (b.blocker_id=p_other_user and b.blocked_id=uid)) then raise exception 'Messaging is unavailable because one user blocked the other'; end if;
  low_id:=least(uid,p_other_user); high_id:=greatest(uid,p_other_user);
  select id,status into c_id,c_status from public.conversations where user_low_id=low_id and user_high_id=high_id for update;
  if c_id is not null then
    if c_status='declined' then raise exception 'This conversation request was declined'; end if;
    return query select c_id,false; return;
  end if;
  select exists(select 1 from public.group_members a join public.group_members b using(group_id) where a.user_id=uid and b.user_id=p_other_user) into auto_accept;
  insert into public.conversations(user_low_id,user_high_id,status,requested_by)
    values(low_id,high_id,case when auto_accept then 'accepted' else 'pending' end,uid)
    on conflict(user_low_id,user_high_id) do nothing returning id into c_id;
  if c_id is null then
    select id,status into c_id,c_status from public.conversations where user_low_id=low_id and user_high_id=high_id for update;
    if c_status='declined' then raise exception 'This conversation request was declined'; end if;
    return query select c_id,false; return;
  end if;
  insert into public.messages(conversation_id,sender_id,receiver_id,body) values(c_id,uid,p_other_user,first_text);
  return query select c_id,true;
end $$;

create or replace function public.send_conversation_message(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c public.conversations%rowtype; other_id uuid; message_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into c from public.conversations where id=p_conversation_id for update;
  if not found or uid not in(c.user_low_id,c.user_high_id) then raise exception 'Conversation not found'; end if;
  other_id:=case when c.user_low_id=uid then c.user_high_id else c.user_low_id end;
  insert into public.messages(conversation_id,sender_id,receiver_id,body) values(c.id,uid,other_id,btrim(coalesce(p_body,''))) returning id into message_id;
  return message_id;
end $$;

create or replace function public.respond_to_conversation(p_conversation_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c public.conversations%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into c from public.conversations where id=p_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;
  if uid=c.requested_by then raise exception 'Only the recipient may respond to this request'; end if;
  if uid not in(c.user_low_id,c.user_high_id) then raise exception 'Conversation not found'; end if;
  if c.status<>'pending' then raise exception 'Conversation request is not pending'; end if;
  update public.conversations set status=case when p_accept then 'accepted' else 'declined' end where id=c.id returning status into c.status;
  return c.status;
end $$;

alter table public.reports add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
alter table public.reports enable row level security;
grant insert on public.reports to authenticated;
create index if not exists idx_reports_conversation on public.reports(conversation_id);
drop policy if exists reports_select_own on public.reports;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists reports_insert_own on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated with check(reporter_id=auth.uid() and reporter_id<>reported_user_id);
create or replace function public.report_user(p_reported_user uuid,p_conversation_id uuid,p_reason text,p_details text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); report_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_reported_user is null or p_reported_user=uid then raise exception 'Invalid reported user'; end if;
  if p_conversation_id is not null and not exists(select 1 from public.conversations c where c.id=p_conversation_id and uid in(c.user_low_id,c.user_high_id) and p_reported_user in(c.user_low_id,c.user_high_id)) then raise exception 'You can report only a participant in your conversation'; end if;
  if p_reason not in('spam','harassment','hate','scam','other') then raise exception 'Invalid report reason'; end if;
  insert into public.reports(reporter_id,reported_user_id,conversation_id,reason,details) values(uid,p_reported_user,p_conversation_id,p_reason,nullif(btrim(p_details),'')) returning id into report_id;
  return report_id;
end $$;

create or replace function public.decline_blocked_pending_request() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update public.conversations set status='declined' where status='pending' and user_low_id=least(new.blocker_id,new.blocked_id) and user_high_id=greatest(new.blocker_id,new.blocked_id);
  return new;
end $$;
drop trigger if exists blocks_decline_pending_conversation on public.blocks;
create trigger blocks_decline_pending_conversation after insert on public.blocks for each row execute function public.decline_blocked_pending_request();

revoke all on function public.start_conversation(uuid,text) from public,anon;
grant execute on function public.start_conversation(uuid,text) to authenticated;
revoke all on function public.respond_to_conversation(uuid,boolean) from public,anon;
grant execute on function public.respond_to_conversation(uuid,boolean) to authenticated;
revoke all on function public.send_conversation_message(uuid,text) from public,anon;
grant execute on function public.send_conversation_message(uuid,text) to authenticated;
revoke all on function public.report_user(uuid,uuid,text,text) from public,anon;
grant execute on function public.report_user(uuid,uuid,text,text) to authenticated;
revoke all on function public.enforce_conversation_message_rules() from public,anon,authenticated;
revoke all on function public.decline_blocked_pending_request() from public,anon,authenticated;
commit;


-- Publish conversation metadata for live request badges.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversations') then alter publication supabase_realtime add table public.conversations; end if;
end $$;

-- Group expense edit and soft-delete RPCs (kept in sync with the migration).
begin;

alter table public.group_expenses
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create or replace function public.update_group_expense(
  p_expense_id uuid,
  p_paid_by uuid,
  p_amount_paise bigint,
  p_description text,
  p_category text,
  p_expense_date date,
  p_splits jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_created_by uuid;
  v_deleted_at timestamptz;
  split_count integer;
  unique_user_count integer;
  split_total bigint;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;
  if p_splits is null or jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'Select at least one member to split this expense with';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_splits) as part(value)
    where jsonb_typeof(part.value) <> 'object'
      or not (part.value ? 'user_id')
      or not (part.value ? 'share_paise')
      or (part.value ->> 'user_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (part.value ->> 'share_paise') !~ '^[0-9]+$'
  ) then
    raise exception 'Invalid expense split data';
  end if;

  select ge.group_id, ge.created_by, ge.deleted_at
  into v_group_id, v_created_by, v_deleted_at
  from public.group_expenses ge
  where ge.id = p_expense_id
  for update;
  if not found then
    raise exception 'Expense not found';
  end if;
  if v_deleted_at is not null then
    raise exception 'Deleted expenses cannot be edited';
  end if;
  if uid <> v_created_by and not public.is_group_admin(v_group_id, uid) then
    raise exception 'Only the expense creator or a group admin may edit this expense';
  end if;

  -- Serialize membership changes and edits for this group while validating split users.
  perform 1 from public.groups where id = v_group_id for update;
  if p_paid_by is null or not public.is_group_member_for_user(v_group_id, p_paid_by) then
    raise exception 'Payer must be a current group member';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_splits) as part(value)
    where not public.is_group_member_for_user(v_group_id, (part.value ->> 'user_id')::uuid)
  ) then
    raise exception 'Every person in the split must be a current group member';
  end if;

  select count(*)::integer,
         count(distinct (part.value ->> 'user_id')::uuid)::integer,
         coalesce(sum((part.value ->> 'share_paise')::bigint), 0)::bigint
  into split_count, unique_user_count, split_total
  from jsonb_array_elements(p_splits) as part(value);
  if split_count <> unique_user_count then
    raise exception 'Each member can appear only once in the split';
  end if;
  if split_total <> p_amount_paise then
    raise exception 'Split shares must add up to the expense amount';
  end if;

  update public.group_expenses
  set paid_by = p_paid_by,
      amount_paise = p_amount_paise,
      description = nullif(btrim(p_description), ''),
      category = coalesce(nullif(btrim(p_category), ''), 'general'),
      expense_date = coalesce(p_expense_date, current_date),
      updated_at = now(),
      updated_by = uid
  where id = p_expense_id;

  delete from public.expense_splits where expense_id = p_expense_id;
  insert into public.expense_splits (expense_id, user_id, share_paise)
  select p_expense_id, (part.value ->> 'user_id')::uuid, (part.value ->> 'share_paise')::bigint
  from jsonb_array_elements(p_splits) as part(value);
end;
$$;

create or replace function public.delete_group_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_created_by uuid;
  v_deleted_at timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select ge.group_id, ge.created_by, ge.deleted_at
  into v_group_id, v_created_by, v_deleted_at
  from public.group_expenses ge
  where ge.id = p_expense_id
  for update;
  if not found or v_deleted_at is not null then
    raise exception 'Expense not found';
  end if;
  if uid <> v_created_by and not public.is_group_admin(v_group_id, uid) then
    raise exception 'Only the expense creator or a group admin may delete this expense';
  end if;
  update public.group_expenses
  set deleted_at = now(), updated_at = now(), updated_by = uid
  where id = p_expense_id;
end;
$$;

revoke all on function public.update_group_expense(uuid, uuid, bigint, text, text, date, jsonb) from public, anon;
grant execute on function public.update_group_expense(uuid, uuid, bigint, text, text, date, jsonb) to authenticated;
revoke all on function public.delete_group_expense(uuid) from public, anon;
grant execute on function public.delete_group_expense(uuid) to authenticated;

commit;

