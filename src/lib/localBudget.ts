import AsyncStorage from '@react-native-async-storage/async-storage';

const BUDGET_KEY_PREFIX = 'expense-counter:monthly-budget-paise:';
const LEGACY_BUDGET_KEY = 'expense-counter:monthly-budget-paise';
export const DEFAULT_BUDGET_PAISE = 25_000_00;

function budgetKey(userId: string): string {
  return `${BUDGET_KEY_PREFIX}${userId}`;
}

export async function readLocalBudget(userId: string): Promise<number> {
  await AsyncStorage.removeItem(LEGACY_BUDGET_KEY);
  const stored = await AsyncStorage.getItem(budgetKey(userId));
  const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_BUDGET_PAISE;
}

export async function saveLocalBudget(userId: string, paise: number): Promise<void> {
  if (!Number.isSafeInteger(paise) || paise <= 0) return;
  await AsyncStorage.setItem(budgetKey(userId), String(paise));
}

export async function clearLocalBudget(userId: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(budgetKey(userId)),
    AsyncStorage.removeItem(LEGACY_BUDGET_KEY)
  ]);
}

export async function clearAllLocalBudgets(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const budgetKeys = keys.filter((key) =>
    key === LEGACY_BUDGET_KEY || key.startsWith(BUDGET_KEY_PREFIX)
  );
  if (budgetKeys.length > 0) await AsyncStorage.multiRemove(budgetKeys);
}
