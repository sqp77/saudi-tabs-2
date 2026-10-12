/**
 * Fixtures captured from https://api.eayni.info/client on 2026-10-12.
 * These lock the normalizers to the real response shapes.
 */
import { describe, expect, it } from 'vitest';
import { normalizeCategory, normalizeContacts, normalizeContainer, normalizeCountry, normalizeOrderCheck, normalizePoints, normalizeProfile, normalizeReasons, normalizeRegionWithCities, normalizeReward, toPaginated } from './normalize';
import { markdownToHtml } from './markdown';
import { extractUploadedUrls } from './normalize';
import { pointInPolygon } from './geo-polygon';

describe('live API shapes', () => {
  it('items → category groups with sub-items and reward points', () => {
    const c = normalizeCategory({ _id: 'g1', category: { _id: 'c1', name_ar: 'ملابس', name_en: 'clothes', image: 'https://x/C1.png', active: true, countable: true }, items: [{ _id: 'i1', name_ar: 'ملابس رجالية', name_en: 'Male Cloths', reward: '20', price: '0.01', active: true, countable: true, image: 'https://x/t.png' }, { _id: 'i2', name_en: 'Off', active: false }] });
    expect(c.id).toBe('g1');
    expect(c.nameEn).toBe('clothes');
    expect(c.items).toHaveLength(1);
    expect(c.items[0]).toMatchObject({ id: 'i1', categoryId: 'g1', reward: 20, nameAr: 'ملابس رجالية' });
  });

  it('country → dial code without plus, ISO3 code and flag image', () => {
    const c = normalizeCountry({ name_ar: 'المملكة العربية السعودية', name_en: 'Saudi arabia', code: 'KSA', active: true, dial: '+966', image: 'https://x/KSA.png' });
    expect(c.code).toBe('966');
    expect(c.iso).toBe('KSA');
    expect(c.flag).toContain('KSA.png');
  });

  it('all-cities → regions with embedded child cities', () => {
    const r = normalizeRegionWithCities({ _id: 'r1', name_ar: 'المنطقه الشرقيه', name_en: 'Eastern Province', count: 1, child: [{ _id: 'c1', name_ar: 'الدمام', name_en: 'Damam' }] });
    expect(r.cities[0]).toMatchObject({ id: 'c1', regionId: 'r1', nameEn: 'Damam' });
  });

  it('cancellation reasons wrapped in value.reasons_ar', () => {
    const list = normalizeReasons({ _id: 'x', value: { reasons_ar: ['سبب ١', 'سبب ٢'] } }, 'ar');
    expect(list.map((r) => r.text)).toEqual(['سبب ١', 'سبب ٢']);
  });

  it('contacts wrapped in value with socialmedia', () => {
    const c = normalizeContacts({ _id: 'x', value: { socialmedia: [{ image: 'i', url: 'https://wa.me/+966509444514', name: 'واتس اب' }], phone: '0509444514', email: 'info@eayni.org', website: 'https://eayni.org', address: 'الخبر' } });
    expect(c.phone).toBe('0509444514');
    expect(c.whatsapp).toBe('+966509444514');
    expect(c.social).toHaveLength(1);
  });

  it('paginated mongoose shape', () => {
    const p = toPaginated({ limit: 10, hasPrevPage: false, hasNextPage: true, hasMore: true, docs: [{ _id: 'a' }], totalDocs: 11, totalPages: 2, page: 1 }, (x) => x, 1);
    expect(p.hasMore).toBe(true);
    expect(p.total).toBe(11);
  });

  it('order/check → runningOrder / requestForRateOrder', () => {
    expect(normalizeOrderCheck({ runningOrder: null, requestForRateOrder: null })).toMatchObject({ activeOrder: undefined, pendingRate: undefined });
    expect(normalizeOrderCheck({ runningOrder: { _id: 'o1', status: 'order.client.send' }, requestForRateOrder: { _id: 'o2', status: 'order.driver.completed' } })).toMatchObject({ activeOrder: { id: 'o1' }, pendingRate: { id: 'o2' } });
  });

  it('points → availableCredit + transactions.docs', () => {
    const p = normalizePoints({ transactions: { docs: [{ _id: 't1', credit: 20, createdAt: '2026-01-01' }], page: 1 }, totalCredit: 20, totalDebit: 0, availableCredit: 20 });
    expect(p.balance).toBe(20);
    expect(p.history[0].points).toBe(20);
  });

  it('reward → localized name + numeric points', () => {
    expect(normalizeReward({ _id: 'r', name_ar: 'ايفون', name_en: 'iphone', points: '1000', active: true, image: 'i' })).toMatchObject({ title: 'ايفون', points: 1000 });
  });

  it('profile under data envelope with GeoJSON location', () => {
    const u = normalizeProfile({ data: { _id: 'u', name: 'P', email: 'p@x.co', phone: '0500000000', email_verified: false, is_phone_verified: false, active: true, country: 'KSA', location: { type: 'Point', coordinates: [46.6, 24.7] } } });
    expect(u.location).toEqual({ lat: 24.7, lng: 46.6 });
    expect(u.countryCode).toBe('KSA');
    expect(u.emailVerified).toBe(false);
  });

  it('container → coverage polygons from MultiPolygon, point-in-zone works', () => {
    const c = normalizeContainer({ _id: 'c', name_ar: 'حاوية', name_en: 'container', type: 'recycling', active: true, allowedRegions: { type: 'MultiPolygon', coordinates: [[[[50.09, 26.31], [50.13, 26.31], [50.13, 26.28], [50.09, 26.28], [50.09, 26.31]]]] } });
    expect(c.polygons).toHaveLength(1);
    expect(c.polygons[0][0]).toEqual({ lat: 26.31, lng: 50.09 });
    expect(pointInPolygon({ lat: 26.3, lng: 50.11 }, c.polygons[0])).toBe(true);
    expect(pointInPolygon({ lat: 24.7, lng: 46.6 }, c.polygons[0])).toBe(false);
  });

  it('upload service → files[].url (confirmed on {{SERVICE_URL}}/upload)', () => {
    const urls = extractUploadedUrls({ message: 'files upload successfully!', s3Result: [{ $metadata: { httpStatusCode: 200 }, ETag: '"e6f"', ServerSideEncryption: 'AES256' }], files: [{ url: 'https://eayni-assets.s3.amazonaws.com/eayni/2026/10/12/x.png', contentType: 'image/png' }] });
    expect(urls).toEqual(['https://eayni-assets.s3.amazonaws.com/eayni/2026/10/12/x.png']);
    expect(extractUploadedUrls({ message: 'files upload successfully!', s3Result: [], files: [] })).toEqual([]);
  });

  it('markdown subset renders safely', () => {
    const html = markdownToHtml('**Intro:**\n\nBy using the app <script>x</script>\n\n- one\n- two');
    expect(html).toContain('<strong>Intro:</strong>');
    expect(html).toContain('<ul>');
    expect(html).not.toContain('<script>');
  });
});
