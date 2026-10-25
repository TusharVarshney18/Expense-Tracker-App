-- Shared expense groups. Additive migration; existing personal expenses and
-- their policies are unchanged.
begin;

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists upi_id text;

update public.profiles
set display_name = full_name
where display_name is null and full_name is not null;

insert into public.profiles (id, email, full_name, display_name)
select
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name')
from auth.users
where email is not null
on conflict (id) do nothing;

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

-- Index every foreign key not already covered by a primary/unique index, plus
-- the chronological group ledger lookups.
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, display_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

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

create or replace function public.get_group_member_profiles(p_group_id uuid)
returns table (
  id uuid,
  email text,
  full_name text,
  upi_id text
)
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
  select p.id, p.email, p.full_name, to_jsonb(p) ->> 'upi_id'
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

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.is_group_member_for_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_group_admin(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cleanup_group_data_before_profile_delete() from public, anon, authenticated;
revoke all on function public.get_my_upi_id() from public, anon;
grant execute on function public.get_my_upi_id() to authenticated;
revoke all on function public.get_group_member_profiles(uuid) from public, anon;
grant execute on function public.get_group_member_profiles(uuid) to authenticated;
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

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Keep profile discovery for chat while making the private UPI column available
-- only through the authenticated self/group-member RPCs above.
revoke select on public.profiles from public, anon, authenticated;
grant select (id, email, full_name, display_name, avatar_url, created_at, updated_at)
  on public.profiles to authenticated;

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

commit;
