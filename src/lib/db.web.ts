import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Expense, Message } from '@/types';

/**
 * Web implementation of the local cache (see `db.ts` for the native SQLite one).
 *
 * `expo-sqlite` on web is backed by OPFS and, when its worker starts, takes an
 * exclusive synchronous access handle on *every* file in its directory. OPFS
 * allows only one sync access handle per file, so a second tab (or a worker left
 * behind by Fast Refresh) fails with:
 *
 *   NoModificationAllowedError: Failed to execute 'createSyncAccessHandle' ...
 *   Access Handles cannot be created if there is another open Access Handle ...
 *
 * This cache only holds a disposable copy of server data, so on web we use
 * AsyncStorage (localStorage) instead. That works across tabs and does not need
 * COOP/COEP headers or SharedArrayBuffer.
 */

const KEY_PREFIX = 'expense-counter:localdb:';
const EXPENSES_PREFIX = `${KEY_PREFIX}expenses:`;
const MESSAGES_KEY = `${KEY_PREFIX}messages`;
const SETTINGS_PREFIX = `${KEY_PREFIX}setting:`;

// Mirror the native table's practical size; localStorage has a small quota.
const MAX_CACHED_MESSAGES = 500;

function expensesKey(userId: string): string {
  return `${EXPENSES_PREFIX}${userId}`;
}

function settingKey(key: string): string {
  return `${SETTINGS_PREFIX}${key}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const stored = await AsyncStorage.getItem(key);
  if (stored == null) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Same ordering as `ORDER BY spent_at DESC, created_at DESC`. */
function compareExpenses(a: Expense, b: Expense): number {
  if (a.spent_at !== b.spent_at) return a.spent_at < b.spent_at ? 1 : -1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  return 0;
}

/* ------------------------------- expenses -------------------------------- */

export async function cacheExpenses(userId: string, expenses: Expense[]): Promise<void> {
  const mine = expenses.filter((expense) => expense.user_id === userId);
  await writeJson(expensesKey(userId), mine);
}

export async function getLocalExpenses(userId: string): Promise<Expense[]> {
  const expenses = await readJson<Expense[]>(expensesKey(userId), []);
  return expenses.slice().sort(compareExpenses);
}

export async function upsertLocalExpense(expense: Expense): Promise<void> {
  const key = expensesKey(expense.user_id);
  const expenses = await readJson<Expense[]>(key, []);
  const next = expenses.filter((item) => item.id !== expense.id);
  next.push(expense);
  await writeJson(key, next.sort(compareExpenses));
}

export async function deleteLocalExpense(id: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const expenseKeys = keys.filter((key) => key.startsWith(EXPENSES_PREFIX));
  if (expenseKeys.length === 0) return;

  const entries = await AsyncStorage.multiGet(expenseKeys);
  const updates: [string, string][] = [];
  for (const [key, stored] of entries) {
    if (stored == null) continue;
    let expenses: Expense[];
    try {
      expenses = JSON.parse(stored) as Expense[];
    } catch {
      continue;
    }
    if (!expenses.some((expense) => expense.id === id)) continue;
    updates.push([key, JSON.stringify(expenses.filter((expense) => expense.id !== id))]);
  }
  if (updates.length > 0) await AsyncStorage.multiSet(updates);
}

/* -------------------------------- messages ------------------------------- */

export async function cacheMessages(messages: Message[]): Promise<void> {
  const cached = await readJson<Message[]>(MESSAGES_KEY, []);
  const byId = new Map(cached.map((message) => [message.id, message]));
  for (const message of messages) {
    byId.set(message.id, message);
  }
  const merged = Array.from(byId.values()).sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
  );
  const trimmed =
    merged.length > MAX_CACHED_MESSAGES ? merged.slice(-MAX_CACHED_MESSAGES) : merged;
  await writeJson(MESSAGES_KEY, trimmed);
}

export async function getLocalMessages(withUserId: string, selfId: string): Promise<Message[]> {
  const cached = await readJson<Message[]>(MESSAGES_KEY, []);
  return cached
    .filter(
      (message) =>
        (message.sender_id === selfId && message.receiver_id === withUserId) ||
        (message.sender_id === withUserId && message.receiver_id === selfId)
    )
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
}

/* -------------------------------- settings ------------------------------- */

export async function getLocalSetting(key: string): Promise<string | null> {
  return AsyncStorage.getItem(settingKey(key));
}

export async function setLocalSetting(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(settingKey(key), value);
}

/* ------------------------------ account wipe ----------------------------- */

async function removeKeysWhere(predicate: (key: string) => boolean): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const matches = keys.filter(predicate);
  if (matches.length > 0) await AsyncStorage.multiRemove(matches);
}

/** Matches the native `wipeLocalData()`: expenses, messages and settings. */
export async function wipeLocalData(): Promise<void> {
  await removeKeysWhere((key) => key.startsWith(KEY_PREFIX));
}

/** Matches the native `wipeLocalUserData()`: keep device settings. */
export async function wipeLocalUserData(): Promise<void> {
  await removeKeysWhere(
    (key) => key === MESSAGES_KEY || key.startsWith(EXPENSES_PREFIX)
  );
}
