-- =============================================================================
-- Expense Counter — Row Level Security policies
-- Apply AFTER schema.sql.
-- =============================================================================

-- Enable RLS on every application table.
alter table public.profiles           enable row level security;
alter table public.personal_expenses  enable row level security;
alter table public.messages           enable row level security;
alter table public.conversations      enable row level security;
grant select on public.conversations to authenticated;
alter table public.reports            enable row level security;
grant insert on public.reports to authenticated;
alter table public.blocks             enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- Basic profile fields are available to authenticated users. Email, push tokens,
-- UPI IDs and Terms acceptance metadata are never part of the directory.
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

-- Conversation metadata is visible to either participant, including a pending
-- request so its recipient can review it.
drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants on public.conversations
  for select to authenticated
  using (auth.uid() in (user_low_id, user_high_id));

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
-- reports — users can submit reports; normal users cannot read report records.
-- -----------------------------------------------------------------------------
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid() and reporter_id <> reported_user_id);

drop policy if exists reports_select_own on public.reports;
drop policy if exists "reports_select_own" on public.reports;

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


-- SECURITY DEFINER avoids recursive reads of group_members from its policies.
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.group_members gm
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
    select 1
    from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid
  );
$$;

create or replace function public.is_group_admin(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid and gm.role = 'admin'
  );
$$;

-- UPI IDs are deliberately not readable through ordinary profile queries.
create or replace function public.get_my_upi_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(p) ->> 'upi_id'
  from public.profiles p
  where p.id = auth.uid();
$$;

-- Search by display name or exact email without exposing email addresses.
create or replace function public.search_profiles(p_query text)
returns table (id uuid, full_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q text := btrim(coalesce(p_query, ''));
  escaped_q text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if char_length(q) not between 2 and 100 then return; end if;
  escaped_q := replace(
    replace(replace(q, chr(92), chr(92) || chr(92)), '%', chr(92) || '%'),
    '_', chr(92) || '_'
  );
  return query
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id <> uid
    and (
      coalesce(p.full_name, '') ilike '%' || escaped_q || '%'
      or lower(p.email) = lower(q)
    )
  order by p.full_name nulls last, p.id
  limit 20;
end;
$$;

drop function if exists public.get_group_member_profiles(uuid);
create function public.get_group_member_profiles(p_group_id uuid)
returns table (id uuid, full_name text, upi_id text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group';
  end if;

  return query
  select p.id, p.full_name, to_jsonb(p) ->> 'upi_id'
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  where gm.group_id = p_group_id
  order by gm.joined_at asc;
end;
$$;

create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'Group name must be between 1 and 80 characters';
  end if;

  insert into public.groups (name, created_by)
  values (btrim(p_name), uid)
  returning id into gid;

  insert into public.group_members (group_id, user_id, role)
  values (gid, uid, 'admin');

  return gid;
end;
$$;

create or replace function public.join_group(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_invite_code is null or btrim(p_invite_code) = '' then
    raise exception 'Enter an invite code';
  end if;

  select g.id into gid
  from public.groups g
  where g.invite_code = lower(btrim(p_invite_code));

  if gid is null then
    raise exception 'Invite code not found';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (gid, uid, 'member')
  on conflict (group_id, user_id) do nothing;

  return gid;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  member_role text;
  next_admin uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform 1 from public.groups where id = p_group_id for update;

  select gm.role into member_role
  from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = uid
  for update;

  if member_role is null then
    raise exception 'You are not a member of this group';
  end if;
  if public.group_member_balance_paise(p_group_id, uid) <> 0 then
    raise exception 'Settle your group balance before leaving';
  end if;

  if member_role = 'admin' then
    select gm.user_id into next_admin
    from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id <> uid
    order by (gm.role = 'admin') desc, gm.joined_at asc
    limit 1;

    if next_admin is null then
      delete from public.groups where id = p_group_id;
      return;
    end if;

    update public.group_members
    set role = 'admin'
    where group_id = p_group_id and user_id = next_admin;

    update public.groups
    set created_by = next_admin
    where id = p_group_id and created_by = uid;
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = uid;
end;
$$;

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

create or replace function public.group_member_balance_paise(p_group_id uuid, p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select (
    coalesce((
      select sum(ge.amount_paise)
      from public.group_expenses ge
      where ge.group_id = p_group_id and ge.deleted_at is null and ge.paid_by = p_user_id
    ), 0)
    - coalesce((
      select sum(es.share_paise)
      from public.expense_splits es
      join public.group_expenses ge on ge.id = es.expense_id
      where ge.group_id = p_group_id and ge.deleted_at is null and es.user_id = p_user_id
    ), 0)
    + coalesce((
      select sum(s.amount_paise)
      from public.settlements s
      where s.group_id = p_group_id and s.from_user = p_user_id
    ), 0)
    - coalesce((
      select sum(s.amount_paise)
      from public.settlements s
      where s.group_id = p_group_id and s.to_user = p_user_id
    ), 0)
  )::bigint;
$$;

create or replace function public.create_group_settlement(
  p_group_id uuid,
  p_to_user uuid,
  p_amount_paise bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  from_balance bigint;
  to_balance bigint;
  settlement_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Settlement amount must be greater than zero';
  end if;
  if not public.is_group_member(p_group_id)
    or not public.is_group_member_for_user(p_group_id, p_to_user) then
    raise exception 'Both people must be members of this group';
  end if;
  if p_to_user = uid then
    raise exception 'You cannot settle a balance with yourself';
  end if;

  -- Serialize settlement writes per group so two stale clients cannot both
  -- record the same outstanding debt.
  perform 1 from public.groups where id = p_group_id for update;

  from_balance := public.group_member_balance_paise(p_group_id, uid);
  to_balance := public.group_member_balance_paise(p_group_id, p_to_user);
  if from_balance >= 0 or to_balance <= 0 or p_amount_paise > least(-from_balance, to_balance) then
    raise exception 'Settlement exceeds the current amount owed';
  end if;

  insert into public.settlements (group_id, from_user, to_user, amount_paise, created_by)
  values (p_group_id, uid, p_to_user, p_amount_paise, uid)
  returning id into settlement_id;

  return settlement_id;
end;
$$;

create or replace function public.confirm_group_settlement(
  p_group_id uuid,
  p_from_user uuid,
  p_amount_paise bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  from_balance bigint;
  to_balance bigint;
  settlement_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Settlement amount must be greater than zero';
  end if;
  if not public.is_group_member(p_group_id)
    or not public.is_group_member_for_user(p_group_id, p_from_user) then
    raise exception 'Both people must be members of this group';
  end if;
  if p_from_user = uid then
    raise exception 'You cannot confirm a payment to yourself';
  end if;

  perform 1 from public.groups where id = p_group_id for update;

  from_balance := public.group_member_balance_paise(p_group_id, p_from_user);
  to_balance := public.group_member_balance_paise(p_group_id, uid);
  if from_balance >= 0 or to_balance <= 0 or p_amount_paise > least(-from_balance, to_balance) then
    raise exception 'Settlement exceeds the current amount owed';
  end if;

  insert into public.settlements (group_id, from_user, to_user, amount_paise, created_by)
  values (p_group_id, p_from_user, uid, p_amount_paise, uid)
  returning id into settlement_id;

  return settlement_id;
end;
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.is_group_member_for_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_group_admin(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cleanup_group_data_before_profile_delete() from public, anon, authenticated;
revoke all on function public.get_my_upi_id() from public, anon;
grant execute on function public.get_my_upi_id() to authenticated;
revoke all on function public.get_group_member_profiles(uuid) from public, anon;
grant execute on function public.get_group_member_profiles(uuid) to authenticated;
revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;
revoke all on function public.accept_current_terms(text) from public, anon;
grant execute on function public.accept_current_terms(text) to authenticated;
revoke all on function public.group_member_balance_paise(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
revoke all on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;
revoke all on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;
revoke all on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb) from public, anon;
grant execute on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb) to authenticated;
revoke all on function public.create_group_settlement(uuid, uuid, bigint) from public, anon;
grant execute on function public.create_group_settlement(uuid, uuid, bigint) to authenticated;
revoke all on function public.confirm_group_settlement(uuid, uuid, bigint) from public, anon;
grant execute on function public.confirm_group_settlement(uuid, uuid, bigint) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Keep profile discovery for chat while making the private UPI column available
-- only through the authenticated self/group-member RPCs above.
revoke select on public.profiles from public, anon, authenticated;
grant select (id, full_name, display_name, avatar_url, created_at, updated_at,
              terms_accepted_at, terms_version)
  on public.profiles to authenticated;
revoke insert, delete on public.profiles from public, anon, authenticated;
revoke update on public.profiles from public, anon, authenticated;
grant update (display_name, upi_id, push_token) on public.profiles to authenticated;

revoke all on public.groups, public.group_members, public.group_expenses,
  public.expense_splits, public.settlements from anon, public;
grant select, insert, update, delete on public.groups, public.group_members,
  public.group_expenses, public.expense_splits, public.settlements to authenticated;

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

drop policy if exists "group_members_select_members" on public.group_members;
create policy "group_members_select_members"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "group_expenses_select_members" on public.group_expenses;
create policy "group_expenses_select_members"
  on public.group_expenses for select to authenticated
  using (public.is_group_member(group_id) and deleted_at is null);

drop policy if exists "expense_splits_select_group_members" on public.expense_splits;
create policy "expense_splits_select_group_members"
  on public.expense_splits for select to authenticated
  using (
    exists (
      select 1 from public.group_expenses ge
      where ge.id = expense_id
        and ge.deleted_at is null
        and public.is_group_member(ge.group_id)
    )
  );

drop policy if exists "settlements_select_members" on public.settlements;
create policy "settlements_select_members"
  on public.settlements for select to authenticated
  using (public.is_group_member(group_id));

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

