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
