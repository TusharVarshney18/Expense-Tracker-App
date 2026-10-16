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
  avatar_url  text,
  push_token  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

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
-- messages
-- 1:1 chat messages between two users.
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  receiver_id  uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  read_at      timestamptz,
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
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
