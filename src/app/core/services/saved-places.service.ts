import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import type { SavedPlace } from '../models';

const KEY = 'eayni.places';

/**
 * Saved pickup locations. The API has no endpoint for user addresses, so these
 * are stored on-device only (documented in BACKEND_REQUIREMENTS.md).
 */
@Injectable({ providedIn: 'root' })
export class SavedPlacesService {
  private readonly storage = inject(StorageService);
  readonly places = signal<SavedPlace[]>([]);
  private loaded = false;

  async load(): Promise<SavedPlace[]> {
    if (!this.loaded) {
      this.places.set((await this.storage.get<SavedPlace[]>(KEY)) ?? []);
      this.loaded = true;
    }
    return this.places();
  }

  async add(place: Omit<SavedPlace, 'id' | 'createdAt'>): Promise<SavedPlace> {
    await this.load();
    const p: SavedPlace = { ...place, id: cryptoId(), createdAt: new Date().toISOString() };
    const next = [p, ...this.places().filter((x) => !(x.kind !== 'other' && x.kind === p.kind))];
    this.places.set(next);
    await this.storage.set(KEY, next);
    return p;
  }

  async update(id: string, patch: Partial<SavedPlace>): Promise<void> {
    const next = this.places().map((p) => (p.id === id ? { ...p, ...patch } : p));
    this.places.set(next);
    await this.storage.set(KEY, next);
  }

  async remove(id: string): Promise<void> {
    const next = this.places().filter((p) => p.id !== id);
    this.places.set(next);
    await this.storage.set(KEY, next);
  }
}

function cryptoId(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}
