import { describe, expect, it } from 'vitest';
import { haversineKm, isValidLatLng } from './geo';

describe('geo', () => {
  it('computes distance between Riyadh and Jeddah (~845 km)', () => {
    const d = haversineKm({ lat: 24.7136, lng: 46.6753 }, { lat: 21.4858, lng: 39.1925 });
    expect(d).toBeGreaterThan(830);
    expect(d).toBeLessThan(860);
  });
  it('rejects 0,0 and out-of-range coordinates', () => {
    expect(isValidLatLng({ lat: 0, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 95, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 24.7, lng: 46.6 })).toBe(true);
    expect(isValidLatLng(undefined)).toBe(false);
  });
});
