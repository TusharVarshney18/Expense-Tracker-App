import { supabase } from './supabase';

const RECEIPT_BUCKET = 'receipts';
const PAGE_SIZE = 500;

export async function removeReceiptObject(userId: string, path: string): Promise<void> {
  if (!path.startsWith(`${userId}/`)) {
    throw new Error('Receipt path does not belong to the signed-in user.');
  }
  const { error } = await supabase.storage.from(RECEIPT_BUCKET).remove([path]);
  if (error && error.statusCode !== '404') throw error;
}

export async function removeAllReceiptObjects(userId: string): Promise<void> {
  while (true) {
    const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).list(userId, {
      limit: PAGE_SIZE,
      // Always read from the front: deleting one page shifts the remaining
      // objects left, so advancing an offset would skip every other page.
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (error) throw error;
    const paths = (data ?? []).map((file) => `${userId}/${file.name}`);
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from(RECEIPT_BUCKET).remove(paths);
      if (removeError) throw removeError;
    }
    if (!data || data.length < PAGE_SIZE) return;
  }
}
