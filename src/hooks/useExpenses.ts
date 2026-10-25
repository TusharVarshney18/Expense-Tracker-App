import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import {
  cacheExpenses,
  deleteLocalExpense,
  getLocalExpenses,
  upsertLocalExpense
} from '@/lib/db';
import { useAuth } from '@/context/AuthProvider';
import type { Expense } from '@/types';
import { removeReceiptObject } from '@/lib/receipts';

export interface NewExpenseInput {
  amount: number;
  category: string;
  note?: string | null;
  receiptUri?: string | null;
  spentAt?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = typeof error.message === 'string' ? error.message : null;
    const code =
      'code' in error && typeof error.code === 'string' ? error.code : null;
    return [code, message].filter(Boolean).join(': ') || 'Failed to load expenses.';
  }
  return 'Failed to load expenses.';
}

export function useExpenses() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesForUserId, setExpensesForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      setExpensesForUserId(null);
      setLoading(false);
      return;
    }
    setExpenses([]);
    setExpensesForUserId(userId);
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('personal_expenses')
        .select('*')
        .order('spent_at', { ascending: false })
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;

      setExpenses((data as Expense[]) ?? []);
      await cacheExpenses(userId, (data as Expense[]) ?? []);
    } catch (err) {
      // Fall back to the offline cache when the network is unavailable.
      setError(getErrorMessage(err));
      setExpenses(await getLocalExpenses(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // This effect starts an async data load; the state updates belong to that request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addExpense = useCallback(
    async (input: NewExpenseInput): Promise<Expense> => {
      if (!userId) throw new Error('Not signed in.');

      let receiptUrl: string | null = null;

      if (input.receiptUri) {
        try {
          const response = await fetch(input.receiptUri);
          const arrayBuffer = await response.arrayBuffer();
          const path = `${userId}/${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(path, arrayBuffer, {
              contentType: 'image/jpeg',
              upsert: false
            });
          if (!uploadError) {
            receiptUrl = path;
          }
        } catch {
          // Ignore receipt upload failure if bucket missing or offline
        }
      }

      const { data, error: insertError } = await supabase
        .from('personal_expenses')
        .insert({
          user_id: userId,
          amount: input.amount,
          category: input.category,
          note: input.note ?? null,
          receipt_url: receiptUrl,
          spent_at: input.spentAt ?? new Date().toISOString().slice(0, 10)
        })
        .select()
        .single();

      if (insertError) throw insertError;
      const created = data as Expense;

      setExpenses((prev) => [created, ...prev]);
      await upsertLocalExpense(created);
      return created;
    },
    [userId]
  );

  const removeExpense = useCallback(async (id: string) => {
    if (!userId) throw new Error('Not signed in.');
    const { data: expense, error: readError } = await supabase
      .from('personal_expenses')
      .select('receipt_url')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw readError;
    if (!expense) throw new Error('Expense not found.');
    if (expense.receipt_url) {
      await removeReceiptObject(userId, expense.receipt_url);
    }
    const { error: deleteError } = await supabase
      .from('personal_expenses')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await deleteLocalExpense(id);
  }, [userId]);

  const visibleExpenses = expensesForUserId === userId ? expenses : [];
  const total = visibleExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    expenses: visibleExpenses,
    loading,
    error,
    total,
    reload: load,
    addExpense,
    removeExpense
  };
}
