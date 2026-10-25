import { supabase } from '@/lib/supabase';

export type GroupRole = 'admin' | 'member';

export interface GroupSummary {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  role: GroupRole;
  member_count: number;
}

export interface GroupPerson {
  id: string;
  full_name: string | null;
  upi_id: string | null;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profile: GroupPerson | null;
}

export interface GroupExpenseSplit {
  expense_id: string;
  user_id: string;
  share_paise: number;
}

export interface GroupExpense {
  id: string;
  group_id: string;
  paid_by: string;
  amount_paise: number;
  description: string | null;
  category: string | null;
  expense_date: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  splits: GroupExpenseSplit[];
}

export interface GroupSettlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount_paise: number;
  created_by: string;
  created_at: string;
}

export interface GroupDetails {
  group: Omit<GroupSummary, 'role' | 'member_count'>;
  members: GroupMember[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
}

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('The server returned no data.');
  return data;
}

function toPaiseNumber(value: number | string): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error('A stored group amount is outside the supported integer-paise range.');
  }
  return amount;
}

export async function listGroups(): Promise<GroupSummary[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('group_members')
    .select('group_id, role');
  if (membershipsError) throw new Error(membershipsError.message);
  if (!memberships?.length) return [];

  const groupIds = memberships.map((membership) => membership.group_id);
  const [groupsResult, allMembersResult] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, invite_code, created_by, created_at')
      .in('id', groupIds)
      .order('created_at', { ascending: false }),
    supabase.from('group_members').select('group_id, user_id').in('group_id', groupIds)
  ]);
  if (groupsResult.error) throw new Error(groupsResult.error.message);
  if (allMembersResult.error) throw new Error(allMembersResult.error.message);

  const roleByGroup = new Map<string, GroupRole>(
    memberships.map((membership) => [membership.group_id, membership.role as GroupRole])
  );
  const countByGroup = new Map<string, number>();
  for (const member of allMembersResult.data ?? []) {
    countByGroup.set(member.group_id, (countByGroup.get(member.group_id) ?? 0) + 1);
  }

  return (groupsResult.data ?? []).map((group) => ({
    ...group,
    role: roleByGroup.get(group.id) ?? 'member',
    member_count: countByGroup.get(group.id) ?? 0
  }));
}

export async function getGroupDetails(groupId: string): Promise<GroupDetails> {
  const { data: groupData, error: groupError } = await supabase
    .from('groups')
    .select('id, name, invite_code, created_by, created_at')
    .eq('id', groupId)
    .single();
  const group = requireData(groupData, groupError);

  const [membersResult, expensesResult, settlementsResult] = await Promise.all([
    supabase
      .from('group_members')
      .select('group_id, user_id, role, joined_at')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('group_expenses')
      .select('id, group_id, paid_by, amount_paise, description, category, expense_date, created_by, created_at, updated_at, updated_by, deleted_at')
      .eq('group_id', groupId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('settlements')
      .select('id, group_id, from_user, to_user, amount_paise, created_by, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
  ]);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (expensesResult.error) throw new Error(expensesResult.error.message);
  if (settlementsResult.error) throw new Error(settlementsResult.error.message);

  const memberRows = (membersResult.data ?? []).filter(
    (member) => typeof member.user_id === 'string' && member.user_id.trim().length > 0
  );
  const userIds = memberRows.map((member) => member.user_id);
  const expenseRows = expensesResult.data ?? [];
  const expenseIds = expenseRows.map((expense) => expense.id);

  const [profilesResult, splitsResult] = await Promise.all([
    userIds.length
      ? supabase.rpc('get_group_member_profiles', { p_group_id: groupId })
      : Promise.resolve({ data: [], error: null }),
    expenseIds.length
      ? supabase
          .from('expense_splits')
          .select('expense_id, user_id, share_paise')
          .in('expense_id', expenseIds)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (splitsResult.error) throw new Error(splitsResult.error.message);

  const profileRows = (profilesResult.data ?? []) as GroupPerson[];
  const profileById = new Map<string, GroupPerson>(
    profileRows.map((profile) => [profile.id, profile])
  );
  const splitsByExpense = new Map<string, GroupExpenseSplit[]>();
  for (const split of splitsResult.data ?? []) {
    const existing = splitsByExpense.get(split.expense_id) ?? [];
    existing.push({
      expense_id: split.expense_id,
      user_id: split.user_id,
      share_paise: toPaiseNumber(split.share_paise)
    });
    splitsByExpense.set(split.expense_id, existing);
  }

  return {
    group,
    members: memberRows.map((member) => ({
      ...member,
      role: member.role as GroupRole,
      profile: profileById.get(member.user_id) ?? null
    })),
    expenses: expenseRows.map((expense) => ({
      ...expense,
      amount_paise: toPaiseNumber(expense.amount_paise),
      splits: splitsByExpense.get(expense.id) ?? []
    })),
    settlements: (settlementsResult.data ?? []).map((settlement) => ({
      ...settlement,
      amount_paise: toPaiseNumber(settlement.amount_paise)
    }))
  };
}

export async function createGroup(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name.trim() });
  return requireData(data, error);
}

export async function joinGroup(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group', {
    p_invite_code: inviteCode.trim().toLowerCase()
  });
  return requireData(data, error);
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) throw new Error(error.message);
}

export async function addGroupExpense(input: {
  groupId: string;
  paidBy: string;
  amountPaise: number;
  description: string;
  category: string;
  expenseDate: string;
  splits: { user_id: string; share_paise: number }[];
}): Promise<string> {
  const { data, error } = await supabase.rpc('add_group_expense', {
    p_group_id: input.groupId,
    p_paid_by: input.paidBy,
    p_amount_paise: input.amountPaise,
    p_description: input.description.trim(),
    p_category: input.category.trim() || 'general',
    p_expense_date: input.expenseDate,
    p_splits: input.splits
  });
  return requireData(data, error);
}

export async function updateGroupExpense(input: {
  expenseId: string;
  paidBy: string;
  amountPaise: number;
  description: string;
  category: string;
  expenseDate: string;
  splits: { user_id: string; share_paise: number }[];
}): Promise<void> {
  const { error } = await supabase.rpc('update_group_expense', {
    p_expense_id: input.expenseId,
    p_paid_by: input.paidBy,
    p_amount_paise: input.amountPaise,
    p_description: input.description.trim(),
    p_category: input.category.trim() || 'general',
    p_expense_date: input.expenseDate,
    p_splits: input.splits
  });
  if (error) throw new Error(error.message);
}

export async function deleteGroupExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_group_expense', { p_expense_id: expenseId });
  if (error) throw new Error(error.message);
}

export async function recordGroupSettlement(input: {
  groupId: string;
  toUser: string;
  amountPaise: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_settlement', {
    p_group_id: input.groupId,
    p_to_user: input.toUser,
    p_amount_paise: input.amountPaise
  });
  return requireData(data, error);
}

/**
 * Records a payment the receiver has confirmed they got. The caller is always
 * the receiver, so the database can enforce that the amount does not exceed
 * either side's current balance.
 */
export async function confirmGroupSettlement(input: {
  groupId: string;
  fromUser: string;
  amountPaise: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('confirm_group_settlement', {
    p_group_id: input.groupId,
    p_from_user: input.fromUser,
    p_amount_paise: input.amountPaise
  });
  return requireData(data, error);
}
