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

export function useExpenses({ loadOnMount = true }: { loadOnMount?: boolean } = {}) {
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

      const rows = (data as Expense[]) ?? [];
      setExpenses(rows);
      // Keep the disposable cache current without holding the screen in its
      // loading state while SQLite writes every expense one by one.
      void cacheExpenses(userId, rows).catch((cacheError) => {
        console.warn('Could not update the offline expense cache.', cacheError);
      });
    } catch (err) {
      // Fall back to the offline cache when the network is unavailable.
      setError(getErrorMessage(err));
      try {
        setExpenses(await getLocalExpenses(userId));
      } catch (cacheError) {
        console.warn('Could not read the offline expense cache.', cacheError);
        setExpenses([]);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!loadOnMount) return;
    // This effect starts an async data load; the state updates belong to that request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, loadOnMount]);

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
      void upsertLocalExpense(created).catch((cacheError) => {
        console.warn('Could not add the expense to the offline cache.', cacheError);
      });
      return created;
    },
    [userId]
  );

  const removeExpense = useCallback(async (id: string) => {
    if (!userId) throw new Error('Not signed in.');
    const { data: expense, error: deleteError } = await supabase
      .from('personal_expenses')
      .delete()
      .eq('id', id)
      .select('receipt_url')
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!expense) throw new Error('Expense not found.');

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    void deleteLocalExpense(id).catch((cacheError) => {
      console.warn('Could not remove the expense from the offline cache.', cacheError);
    });
    if (expense.receipt_url) {
      void removeReceiptObject(userId, expense.receipt_url).catch((receiptError) => {
        console.warn('Could not remove the expense receipt.', receiptError);
      });
    }
  }, [userId]);

  const updateExpense = useCallback(async (
    id: string,
    input: Pick<NewExpenseInput, 'amount' | 'category' | 'note'>
  ): Promise<Expense> => {
    if (!userId) throw new Error('Not signed in.');
    const { data, error: updateError } = await supabase
      .from('personal_expenses')
      .update({
        amount: input.amount,
        category: input.category,
        note: input.note ?? null
      })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    const updated = data as Expense;
    setExpenses((prev) => prev.map((expense) => expense.id === id ? updated : expense));
    void upsertLocalExpense(updated).catch((cacheError) => {
      console.warn('Could not update the expense in the offline cache.', cacheError);
    });
    return updated;
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
    removeExpense,
    updateExpense
  };
}
