import * as SQLite from 'expo-sqlite';

import type { Expense, Message } from '@/types';

/**
 * Local SQLite cache. The app keeps a device-local copy of the signed-in user's
 * expenses and recent messages so it stays usable offline. Everything here is
 * wiped by `wipeLocalData()` when the user deletes their account.
 */

const DB_NAME = 'expense_counter.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_expenses (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        receipt_url TEXT,
        spent_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS local_messages (
        id TEXT PRIMARY KEY NOT NULL,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        body TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_local_messages_created
        ON local_messages (created_at);

      CREATE TABLE IF NOT EXISTS local_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

/* ------------------------------- expenses -------------------------------- */

export async function cacheExpenses(expenses: Expense[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const e of expenses) {
      await db.runAsync(
        `INSERT OR REPLACE INTO local_expenses
           (id, user_id, amount, category, note, receipt_url, spent_at, created_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        e.id,
        e.user_id,
        e.amount,
        e.category,
        e.note,
        e.receipt_url,
        e.spent_at,
        e.created_at
      );
    }
  });
}

export async function getLocalExpenses(): Promise<Expense[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Expense & { synced: number }>(
    'SELECT * FROM local_expenses ORDER BY spent_at DESC, created_at DESC'
  );
  return rows.map(({ synced: _synced, ...rest }) => rest);
}

export async function upsertLocalExpense(expense: Expense): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_expenses
       (id, user_id, amount, category, note, receipt_url, spent_at, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    expense.id,
    expense.user_id,
    expense.amount,
    expense.category,
    expense.note,
    expense.receipt_url,
    expense.spent_at,
    expense.created_at
  );
}

export async function deleteLocalExpense(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM local_expenses WHERE id = ?', id);
}

/* -------------------------------- messages ------------------------------- */

export async function cacheMessages(messages: Message[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const m of messages) {
      await db.runAsync(
        `INSERT OR REPLACE INTO local_messages
           (id, sender_id, receiver_id, body, read_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        m.id,
        m.sender_id,
        m.receiver_id,
        m.body,
        m.read_at,
        m.created_at
      );
    }
  });
}

export async function getLocalMessages(withUserId: string, selfId: string): Promise<Message[]> {
  const db = await getDatabase();
  return db.getAllAsync<Message>(
    `SELECT * FROM local_messages
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC`,
    selfId,
    withUserId,
    withUserId,
    selfId
  );
}

/* -------------------------------- settings ------------------------------- */

export async function getLocalSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setLocalSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO local_settings (key, value) VALUES (?, ?)',
    key,
    value
  );
}

/* ------------------------------ account wipe ----------------------------- */

/**
 * Deletes every row in every local SQLite table and reclaims space.
 * Called by the Delete Account flow after the server-side wipe succeeds.
 */
export async function wipeLocalData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM local_expenses;
    DELETE FROM local_messages;
    DELETE FROM local_settings;
    VACUUM;
  `);
}
