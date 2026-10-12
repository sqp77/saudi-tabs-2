import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Thin wrapper over Capacitor Preferences (native secure-ish key/value storage,
 * localStorage on the web). All values are JSON encoded.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value == null ? null : (JSON.parse(value) as T);
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await Preferences.set({ key, value: JSON.stringify(value) });
    } catch {
      /* storage unavailable */
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch {
      /* ignore */
    }
  }
}
