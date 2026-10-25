-- Let the receiver of a group payment confirm it. The existing
-- create_group_settlement RPC always records the caller as the payer; this
-- companion records the caller as the receiver and validates both balances.
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

  -- Serialize settlement writes per group so two stale clients cannot both
  -- record the same outstanding debt.
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

revoke all on function public.confirm_group_settlement(uuid, uuid, bigint) from public, anon;
grant execute on function public.confirm_group_settlement(uuid, uuid, bigint) to authenticated;
