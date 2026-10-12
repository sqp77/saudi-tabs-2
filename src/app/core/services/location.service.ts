import { Injectable, inject, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import type { LatLng } from '../models';
import { OrderApi } from '../api/order-api.service';
import { isValidLatLng } from '../utils/geo';

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly orderApi = inject(OrderApi);
  readonly permission = signal<LocationPermission>('unknown');
  readonly last = signal<LatLng | null>(null);

  async checkPermission(): Promise<LocationPermission> {
    try {
      const p = await Geolocation.checkPermissions();
      const state = p.location === 'granted' || p.coarseLocation === 'granted' ? 'granted' : p.location === 'denied' ? 'denied' : 'prompt';
      this.permission.set(state);
      return state;
    } catch {
      this.permission.set('unknown');
      return 'unknown';
    }
  }

  /** Requests permission (if needed) and returns the current position, or null when unavailable. */
  async current(opts: { highAccuracy?: boolean; timeoutMs?: number } = {}): Promise<LatLng | null> {
    try {
      let state = await this.checkPermission();
      if (state !== 'granted') {
        try {
          const req = await Geolocation.requestPermissions();
          state = req.location === 'granted' || req.coarseLocation === 'granted' ? 'granted' : 'denied';
        } catch {
          // Web: requestPermissions is unsupported; getCurrentPosition prompts instead.
          state = 'prompt';
        }
        this.permission.set(state);
        if (state === 'denied') return null;
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: opts.highAccuracy ?? true, timeout: opts.timeoutMs ?? 12_000, maximumAge: 15_000 });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!isValidLatLng(p)) return null;
      this.last.set(p);
      this.permission.set('granted');
      return p;
    } catch (e) {
      const code = (e as { code?: number })?.code;
      const msg = String((e as Error)?.message ?? '').toLowerCase();
      if (code === 1 || msg.includes('denied')) this.permission.set('denied');
      return null;
    }
  }

  /** Reverse geocode via the backend (POST /order/geo/address). */
  async reverseGeocode(p: LatLng): Promise<string | undefined> {
    try {
      const r = await this.orderApi.geocode(p);
      return r.address;
    } catch {
      return undefined;
    }
  }
}
