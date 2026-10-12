import { Injectable, inject } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import type { Id, LatLng } from '../models';

export interface DraftItem {
  /** Group id from /public/items — sent as `items[].category`. */
  categoryId: Id;
  categoryName: string;
  /** Sub-item id (informational; the API only takes the names). */
  itemId: Id;
  itemNameAr: string;
  itemNameEn: string;
  reward?: number;
  quantity: number;
  note: string;
}

export interface DonationDraft {
  items: DraftItem[];
  images: string[];
  instructions: string;
  phone: string;
  location: LatLng | null;
  address: string;
  address2: string;
  regionId: Id | '';
  regionName: string;
  cityId: Id | '';
  cityName: string;
  step: number;
  updatedAt: string;
}

const KEY = 'eayni.donation.draft';

export const emptyDraft = (): DonationDraft => ({
  items: [], images: [], instructions: '', phone: '', location: null, address: '', address2: '',
  regionId: '', regionName: '', cityId: '', cityName: '', step: 0, updatedAt: new Date().toISOString(),
});

@Injectable({ providedIn: 'root' })
export class DraftService {
  private readonly storage = inject(StorageService);
  load(): Promise<DonationDraft | null> { return this.storage.get<DonationDraft>(KEY); }
  save(d: DonationDraft): Promise<void> { return this.storage.set(KEY, { ...d, updatedAt: new Date().toISOString() }); }
  clear(): Promise<void> { return this.storage.remove(KEY); }
}
