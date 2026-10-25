import { useCallback, useEffect, useState } from 'react';

import { blockUser, getBlockedIds, unblockUser } from '@/services/moderation';
import { useAuth } from '@/context/AuthProvider';

/** Manages the set of users the signed-in user has blocked. */
export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBlockedIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setBlockedIds(await getBlockedIds());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // This effect starts an async data load; the state updates belong to that request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const block = useCallback(
    async (id: string) => {
      await blockUser(id);
      setBlockedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    []
  );

  const unblock = useCallback(async (id: string) => {
    await unblockUser(id);
    setBlockedIds((prev) => prev.filter((b) => b !== id));
  }, []);

  return { blockedIds, loading, block, unblock, refresh };
}
