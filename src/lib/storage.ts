import * as SecureStore from 'expo-secure-store';
import type { SupportedStorage } from '@supabase/supabase-js';

/**
 * A Supabase auth storage adapter backed by expo-secure-store (Keychain on iOS,
 * EncryptedSharedPreferences on Android).
 *
 * SecureStore rejects values larger than ~2048 bytes, and Supabase sessions can
 * exceed that, so large values are transparently split into numbered chunks.
 * A small manifest key records how many chunks exist.
 */

const CHUNK_SIZE = 1800;
const MANIFEST_SUFFIX = '__chunks';

function manifestKey(key: string): string {
  return `${key}${MANIFEST_SUFFIX}`;
}

export const SecureStoreAdapter: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    const manifest = await SecureStore.getItemAsync(manifestKey(key));

    if (manifest === null) {
      // Not chunked (or not present at all).
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = Number.parseInt(manifest, 10);
    if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
      return null;
    }

    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i += 1) {
      const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    // Remove any previously stored representation first.
    await this.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${index}`, chunk))
    );
    await SecureStore.setItemAsync(manifestKey(key), String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    const manifest = await SecureStore.getItemAsync(manifestKey(key));
    if (manifest !== null) {
      const chunkCount = Number.parseInt(manifest, 10);
      if (Number.isFinite(chunkCount) && chunkCount > 0) {
        await Promise.all(
          Array.from({ length: chunkCount }, (_, i) =>
            SecureStore.deleteItemAsync(`${key}.${i}`)
          )
        );
      }
      await SecureStore.deleteItemAsync(manifestKey(key));
    }
    await SecureStore.deleteItemAsync(key);
  }
};
