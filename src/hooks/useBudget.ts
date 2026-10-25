import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import {
  DEFAULT_BUDGET_PAISE,
  readLocalBudget,
  saveLocalBudget
} from '@/lib/localBudget';

/** Device-local monthly budget used by the dashboard progress ring. */
export function useBudget() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [budget, setBudget] = useState({ userId: null as string | null, paise: DEFAULT_BUDGET_PAISE });
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const paise = await readLocalBudget(userId);
    setBudget({ userId, paise });
    setLoadedForUserId(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const loadUserBudget = async () => {
      const paise = await readLocalBudget(userId);
      if (!active) return;
      setBudget({ userId, paise });
      setLoadedForUserId(userId);
    };
    void loadUserBudget();
    return () => {
      active = false;
    };
  }, [userId]);

  const updateBudget = useCallback(async (nextPaise: number) => {
    if (!userId || !Number.isSafeInteger(nextPaise) || nextPaise <= 0) return;
    setBudget({ userId, paise: nextPaise });
    setLoadedForUserId(userId);
    await saveLocalBudget(userId, nextPaise);
  }, [userId]);

  return {
    budgetPaise: budget.userId === userId ? budget.paise : DEFAULT_BUDGET_PAISE,
    loaded: loadedForUserId === userId,
    updateBudget,
    refreshBudget: load
  };
}
