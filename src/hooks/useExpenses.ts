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

export interface NewExpenseInput {
  amount: number;
  category: string;
  note?: string | null;
  receiptUri?: string | null;
  spentAt?: string;
}

export function useExpenses() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
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
      await cacheExpenses((data as Expense[]) ?? []);
    } catch (err) {
      // Fall back to the offline cache when the network is unavailable.
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
      setExpenses(await getLocalExpenses());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addExpense = useCallback(
    async (input: NewExpenseInput): Promise<Expense> => {
      if (!userId) throw new Error('Not signed in.');

      let receiptUrl: string | null = null;

      if (input.receiptUri) {
        const response = await fetch(input.receiptUri);
        const arrayBuffer = await response.arrayBuffer();
        const path = `${userId}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(path, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });
        if (uploadError) throw uploadError;
        receiptUrl = path;
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
    const { error: deleteError } = await supabase
      .from('personal_expenses')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await deleteLocalExpense(id);
  }, []);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    expenses,
    loading,
    error,
    total,
    reload: load,
    addExpense,
    removeExpense
  };
}
