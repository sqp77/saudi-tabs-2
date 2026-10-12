import { describe, expect, it } from 'vitest';
import { extractUploadedUrls, fromApiLocation, normalizeOrder, normalizeOrderCheck, normalizePoints, toApiLocation, toArray, toPaginated, unwrap } from './normalize';

describe('normalize', () => {
  it('unwraps common envelopes', () => {
    expect(unwrap({ data: { a: 1 } })).toEqual({ a: 1 });
    expect(unwrap({ result: [1] })).toEqual([1]);
    expect(unwrap([1, 2])).toEqual([1, 2]);
  });

  it('extracts arrays from paginated shapes', () => {
    expect(toArray({ data: { docs: [{ _id: 'a' }] } })).toHaveLength(1);
    expect(toArray({ items: [1] })).toEqual([1]);
    expect(toArray({ data: [1, 2] })).toEqual([1, 2]);
    expect(toArray(null)).toEqual([]);
  });

  it('builds paginated results with hasMore from totalPages', () => {
    const p = toPaginated({ data: { docs: [{ _id: '1' }], page: 1, totalPages: 3 } }, (x) => x, 1);
    expect(p.items).toHaveLength(1);
    expect(p.hasMore).toBe(true);
    expect(p.totalPages).toBe(3);
  });

  it('handles [lat, lng] arrays, GeoJSON points and {lat,long} objects', () => {
    expect(fromApiLocation([46.6, 24.7])).toEqual({ lat: 24.7, lng: 46.6 }); // lnglat default (GeoJSON)
    expect(fromApiLocation({ type: 'Point', coordinates: [46.6, 24.7] })).toEqual({ lat: 24.7, lng: 46.6 });
    expect(fromApiLocation({ lat: '24.7', long: '46.6' })).toEqual({ lat: 24.7, lng: 46.6 });
    expect(fromApiLocation(undefined)).toBeUndefined();
    expect(toApiLocation({ lat: 1, lng: 2 })).toEqual([2, 1]);
  });

  it('normalizes an order with populated references', () => {
    const o = normalizeOrder({
      _id: 'o1', code: 'E-100', status: 'order.client.send', createdAt: '2026-10-01T10:00:00Z',
      region: { _id: 'r1', name_ar: 'الرياض', name_en: 'Riyadh' }, city: { _id: 'c1', name: 'Riyadh' },
      location: [46.6, 24.7], phone: '0500000000', images: ['https://x/1.jpg', { url: 'https://x/2.jpg' }],
      items: [{ category: { _id: 'k1', name_ar: 'ملابس', name_en: 'Clothes' }, item_name_ar: 'ملابس أطفال', item_name_en: 'Kids', quantity: '3' }],
      driver: { _id: 'd1', name: 'Ali', phone: '0555', location: { type: 'Point', coordinates: [46.5, 24.6] } },
      history: [{ status: 'order.client.send', createdAt: '2026-10-01T10:00:00Z' }],
      rate: { stars: 4, review: 'ok' },
    });
    expect(o.id).toBe('o1');
    expect(o.regionName).toBe('الرياض');
    expect(o.cityId).toBe('c1');
    expect(o.images).toEqual(['https://x/1.jpg', 'https://x/2.jpg']);
    expect(o.items[0]).toMatchObject({ categoryId: 'k1', categoryName: 'ملابس', quantity: 3, nameEn: 'Kids' });
    expect(o.driver?.location).toEqual({ lat: 24.6, lng: 46.5 });
    expect(o.history).toHaveLength(1);
    expect(o.rating).toEqual({ stars: 4, review: 'ok' });
  });

  it('never fabricates a driver when none is embedded', () => {
    expect(normalizeOrder({ _id: 'x', status: 'order.client.send' }).driver).toBeUndefined();
  });

  it('normalizes /order/check variants', () => {
    expect(normalizeOrderCheck({ data: { order: { _id: 'a', status: 'order.client.send' } } }).activeOrder?.id).toBe('a');
    expect(normalizeOrderCheck({ data: { rate: { _id: 'b', status: 'order.driver.completed' } } }).pendingRate?.id).toBe('b');
    expect(normalizeOrderCheck({ data: null }).activeOrder).toBeUndefined();
  });

  it('normalizes points in several shapes', () => {
    expect(normalizePoints({ data: { points: 120 } }).balance).toBe(120);
    expect(normalizePoints({ data: 50 }).balance).toBe(50);
    expect(normalizePoints({ balance: 7, history: [{ points: 5, title: 'x' }] }).history).toHaveLength(1);
  });

  it('finds upload URLs in nested responses', () => {
    expect(extractUploadedUrls({ data: { url: 'https://s3/a.jpg' } })).toEqual(['https://s3/a.jpg']);
    expect(extractUploadedUrls({ files: [{ Location: 'https://s3/b.jpg' }] })).toEqual(['https://s3/b.jpg']);
    expect(extractUploadedUrls('https://s3/c.jpg')).toEqual(['https://s3/c.jpg']);
    expect(extractUploadedUrls({ ok: true })).toEqual([]);
  });
});
