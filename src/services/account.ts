import { supabase } from '@/lib/supabase';
import { clearPushToken } from '@/lib/notifications';
import { wipeLocalData } from '@/lib/db';

/**
 * Server-side + local wipe for the Delete Account flow.
 *
 * Order matters:
 *   1. Clear the push token so no further notifications are addressed to the user.
 *   2. Call the `delete_account()` RPC, which (as SECURITY DEFINER) deletes the
 *      user's profile row — cascading to personal_expenses, messages, blocks and
 *      reports — and then removes the auth.users row itself.
 *   3. Wipe the on-device SQLite cache.
 *   4. Sign out, clearing the encrypted session from SecureStore.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await clearPushToken(userId);

  const { error } = await supabase.rpc('delete_account');
  if (error) {
    throw new Error(`Account deletion failed on the server: ${error.message}`);
  }

  await wipeLocalData();
  await supabase.auth.signOut();
}
