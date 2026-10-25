export interface SplitShare {
  userId: string;
  sharePaise: number;
}

export interface DebtTransfer {
  fromUser: string;
  toUser: string;
  amountPaise: number;
}

export interface UserBalance {
  userId: string;
  balancePaise: number;
}

export interface GroupMemberBalanceInput {
  user_id: string;
}

export interface GroupExpenseBalanceInput {
  paid_by: string;
  amount_paise: number;
  splits: { user_id: string; share_paise: number }[];
}

export interface GroupSettlementBalanceInput {
  from_user: string;
  to_user: string;
  amount_paise: number;
}

function validateAmount(amountPaise: number): void {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('Amount must be a positive whole number of paise.');
  }
}

function validateParticipants<T extends { userId: string }>(participants: T[]): void {
  if (participants.length === 0 || participants.some(({ userId }) => !userId.trim())) {
    throw new Error('At least one participant with a user ID is required.');
  }
  if (new Set(participants.map(({ userId }) => userId)).size !== participants.length) {
    throw new Error('Each participant can appear only once.');
  }
}

/** Divide paise evenly, assigning leftover paise in the input order. */
export function splitEqual(amountPaise: number, userIds: string[]): SplitShare[] {
  validateAmount(amountPaise);
  validateParticipants(userIds.map((userId) => ({ userId })));
  const base = Math.floor(amountPaise / userIds.length);
  const remainder = amountPaise % userIds.length;
  return userIds.map((userId, index) => ({
    userId,
    sharePaise: base + (index < remainder ? 1 : 0)
  }));
}

/** Accept exact integer-paise shares only when they sum to the total. */
export function splitExact(amountPaise: number, shares: SplitShare[]): SplitShare[] {
  validateAmount(amountPaise);
  validateParticipants(shares);
  if (shares.some(({ sharePaise }) => !Number.isSafeInteger(sharePaise) || sharePaise < 0)) {
    throw new Error('Each exact share must be a non-negative whole number of paise.');
  }
  if (shares.reduce((sum, { sharePaise }) => sum + BigInt(sharePaise), 0n) !== BigInt(amountPaise)) {
    throw new Error('Exact shares must add up to the expense amount.');
  }
  return shares.map((share) => ({ ...share }));
}

/** Allocate an amount using basis-point percentages and largest remainders. */
export function splitPercent(
  amountPaise: number,
  percentages: { userId: string; basisPoints: number }[]
): SplitShare[] {
  validateAmount(amountPaise);
  validateParticipants(percentages);
  if (percentages.some(({ basisPoints }) => !Number.isSafeInteger(basisPoints) || basisPoints < 0)) {
    throw new Error('Percentages must be non-negative whole basis points.');
  }
  if (percentages.reduce((sum, { basisPoints }) => sum + basisPoints, 0) !== 10_000) {
    throw new Error('Percentages must add up to 100%.');
  }

  const remainderRows = percentages.map(({ userId, basisPoints }, index) => {
    const wholeUnits = Math.floor(amountPaise / 10_000);
    const fractionalUnits = amountPaise % 10_000;
    const fractionProduct = fractionalUnits * basisPoints;
    const sharePaise = wholeUnits * basisPoints + Math.floor(fractionProduct / 10_000);
    return { userId, basisPoints, index, sharePaise, remainder: fractionProduct % 10_000 };
  });
  let remaining = amountPaise - remainderRows.reduce((sum, row) => sum + row.sharePaise, 0);
  const byRemainder = [...remainderRows].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) byRemainder[index].sharePaise += 1;
  return remainderRows.map(({ userId, sharePaise }) => ({ userId, sharePaise }));
}

/**
 * Net position for every current member. Expenses credit the payer and debit
 * each share; settlements credit the payer and debit the receiver. The member
 * totals must always sum to zero, so inconsistent data is rejected instead of
 * rendering balances that cannot be settled.
 */
export function calculateGroupBalances(
  members: GroupMemberBalanceInput[],
  expenses: GroupExpenseBalanceInput[],
  settlements: GroupSettlementBalanceInput[]
): UserBalance[] {
  const memberIds = members.map(({ user_id }) => user_id);
  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error('Each group member can appear only once.');
  }

  const net = new Map<string, number>();
  for (const userId of memberIds) net.set(userId, 0);

  const apply = (userId: string, deltaPaise: number) => {
    net.set(userId, (net.get(userId) ?? 0) + deltaPaise);
  };

  for (const expense of expenses) {
    if (!Number.isSafeInteger(expense.amount_paise)) {
      throw new Error('Group amounts must be whole numbers of paise.');
    }
    apply(expense.paid_by, expense.amount_paise);
    for (const split of expense.splits) {
      if (!Number.isSafeInteger(split.share_paise)) {
        throw new Error('Group amounts must be whole numbers of paise.');
      }
      apply(split.user_id, -split.share_paise);
    }
  }

  for (const settlement of settlements) {
    if (!Number.isSafeInteger(settlement.amount_paise)) {
      throw new Error('Group amounts must be whole numbers of paise.');
    }
    apply(settlement.from_user, settlement.amount_paise);
    apply(settlement.to_user, -settlement.amount_paise);
  }

  const balances = members.map(({ user_id }) => ({
    userId: user_id,
    balancePaise: net.get(user_id) ?? 0
  }));

  const total = balances.reduce(
    (sum, { balancePaise }) => sum + BigInt(balancePaise),
    0n
  );
  if (total !== 0n) {
    throw new Error('Group balances must sum to zero.');
  }

  return balances;
}

/** Greedily match the largest debtor to the largest creditor. Positive balances are owed money. */
export function simplifyDebts(balances: UserBalance[]): DebtTransfer[] {
  if (balances.length === 0) return [];
  validateParticipants(balances);
  if (balances.some(({ balancePaise }) => !Number.isSafeInteger(balancePaise))) {
    throw new Error('Balances must be whole numbers of paise.');
  }
  const total = balances.reduce((sum, { balancePaise }) => sum + BigInt(balancePaise), 0n);
  if (total !== 0n) {
    throw new Error('Balances must sum to zero.');
  }

  const debtors = balances.filter(({ balancePaise }) => balancePaise < 0)
    .map(({ userId, balancePaise }) => ({ userId, remaining: -balancePaise }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = balances.filter(({ balancePaise }) => balancePaise > 0)
    .map(({ userId, balancePaise }) => ({ userId, remaining: balancePaise }))
    .sort((a, b) => b.remaining - a.remaining);
  const transfers: DebtTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountPaise = Math.min(debtor.remaining, creditor.remaining);
    transfers.push({ fromUser: debtor.userId, toUser: creditor.userId, amountPaise });
    debtor.remaining -= amountPaise;
    creditor.remaining -= amountPaise;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }
  return transfers;
}
