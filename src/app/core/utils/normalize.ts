/**
 * Defensive normalizers. The backend's response envelope is undocumented, so
 * these helpers accept the common Node/Mongoose shapes ({data}, {result},
 * {docs}, bare arrays, ...) and pull the fields the UI needs.
 */
import { environment } from '../../../environments/environment';
import type {
  AppNotification, Banner, Campaign, ChatMessage, City, ContactInfo, Container, Country, Driver, GeocodeResult, ItemCategory,
  ItemOption, LatLng, Order, OrderCheck, OrderItem, OrderStatusHistoryEntry, Paginated, Partner, PointsSummary, Region,
  RegionWithCities, Reward, StaticPage, UserProfile, CancellationReason,
} from '../models';

type Rec = Record<string, unknown>;

export const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);

/** Unwrap common envelopes: {data: X} / {result: X} / {payload: X} / X. */
export function unwrap(body: unknown): unknown {
  if (!isRec(body)) return body;
  for (const key of ['data', 'result', 'payload', 'body']) {
    if (key in body && body[key] !== undefined && body[key] !== null) {
      const inner = body[key];
      // {data: {docs: []}} and {data: {data: []}} happen with paginated plugins.
      if (isRec(inner) && ('docs' in inner || 'data' in inner || 'items' in inner || 'results' in inner)) return inner;
      return inner;
    }
  }
  return body;
}

/** Extract an array from an unwrapped payload. */
export function toArray(body: unknown): unknown[] {
  const inner = unwrap(body);
  if (Array.isArray(inner)) return inner;
  if (isRec(inner)) {
    for (const key of ['docs', 'items', 'results', 'list', 'rows', 'data', 'orders', 'notifications', 'containers', 'rewards', 'messages', 'partners', 'regions', 'cities', 'countries']) {
      if (Array.isArray(inner[key])) return inner[key] as unknown[];
    }
  }
  return [];
}

/** Mongoose-paginate shape confirmed on the live API: `{ docs, page, totalPages, totalDocs, hasNextPage, hasMore, nextPage, limit }`. */
export function toPaginated<T>(body: unknown, map: (x: unknown) => T, requestedPage = 1): Paginated<T> {
  const inner = unwrap(body);
  const items = toArray(body).map(map);
  let page = requestedPage;
  let totalPages: number | undefined;
  let total: number | undefined;
  let hasMore: boolean | undefined;
  if (isRec(inner)) {
    page = num(inner['page']) ?? num(inner['currentPage']) ?? requestedPage;
    totalPages = num(inner['totalPages']) ?? num(inner['pages']) ?? num(inner['last_page']);
    total = num(inner['total']) ?? num(inner['totalDocs']) ?? num(inner['count']);
    hasMore = bool(inner['hasNextPage']) ?? bool(inner['hasMore']);
  }
  if (hasMore === undefined) hasMore = totalPages != null ? page < totalPages : items.length > 0 && items.length >= 10;
  return { items, page, totalPages, total, hasMore };
}

export const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);
export const num = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};
export const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

export function idOf(v: unknown): string {
  if (typeof v === 'string') return v;
  if (isRec(v)) return str(v['_id']) ?? str(v['id']) ?? str(v['uuid']) ?? '';
  return '';
}

export function localized(v: unknown, base: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!isRec(v)) return typeof v === 'string' ? v : '';
  const alt = lang === 'ar' ? 'en' : 'ar';
  const cands = [
    v[`${base}_${lang}`], v[`${base}${lang === 'ar' ? 'Ar' : 'En'}`], v[`${base}.${lang}`],
    isRec(v[base]) ? (v[base] as Rec)[lang] : undefined,
    v[base], v[`${base}_${alt}`], v[`${base}${alt === 'ar' ? 'Ar' : 'En'}`],
    isRec(v[base]) ? (v[base] as Rec)[alt] : undefined,
    v['title'], v['name'], v['label'],
  ];
  for (const c of cands) if (typeof c === 'string' && c.trim()) return c;
  return '';
}

/** Convert an API location array to LatLng according to the configured ordering. */
export function fromApiLocation(v: unknown): LatLng | undefined {
  let arr: unknown[] | undefined;
  if (Array.isArray(v) && v.length >= 2) arr = v;
  else if (isRec(v)) {
    if (Array.isArray(v['coordinates'])) {
      // GeoJSON is always [lng, lat]
      const c = v['coordinates'] as unknown[];
      const lng = num(c[0]), lat = num(c[1]);
      return lat != null && lng != null ? { lat, lng } : undefined;
    }
    const lat = num(v['lat'] ?? v['latitude']);
    const lng = num(v['lng'] ?? v['long'] ?? v['lon'] ?? v['longitude']);
    return lat != null && lng != null ? { lat, lng } : undefined;
  }
  if (!arr) return undefined;
  const a = num(arr[0]), b = num(arr[1]);
  if (a == null || b == null) return undefined;
  return environment.locationOrder === 'latlng' ? { lat: a, lng: b } : { lat: b, lng: a };
}

export function toApiLocation(p: LatLng): [number, number] {
  return environment.locationOrder === 'latlng' ? [p.lat, p.lng] : [p.lng, p.lat];
}

export function normalizeCountry(v: unknown): Country {
  const r = isRec(v) ? v : {};
  const dial = (str(r['dial']) ?? str(r['dialCode']) ?? str(r['countryCode']) ?? str(r['phoneCode']) ?? '').replace(/^\+/, '').replace(/\D/g, '');
  const iso = str(r['code']) ?? str(r['iso']) ?? str(r['iso2']);
  return { id: idOf(v) || iso || dial, name: localized(v, 'name'), code: dial || (/^\d+$/.test(iso ?? '') ? iso! : ''), iso, flag: str(r['flag']) ?? str(r['image']), raw: v };
}

export const normalizeRegion = (v: unknown): Region => ({ id: idOf(v), name: localized(v, 'name'), raw: v });
export const normalizeCity = (v: unknown, regionId?: string): City => {
  const r = isRec(v) ? v : {};
  return { id: idOf(v), name: localized(v, 'name'), nameAr: str(r['name_ar']), nameEn: str(r['name_en']), regionId: idOf(r['region']) || regionId, raw: v };
};

/** `/public/all-cities` → regions with embedded `child` cities (both languages present regardless of Accept-Language). */
export function normalizeRegionWithCities(v: unknown): RegionWithCities {
  const r = isRec(v) ? v : {};
  const id = idOf(v);
  const kids = Array.isArray(r['child']) ? r['child'] : Array.isArray(r['cities']) ? r['cities'] : [];
  return { id, name: localized(v, 'name'), nameAr: str(r['name_ar']), nameEn: str(r['name_en']), cities: (kids as unknown[]).map((c) => normalizeCity(c, id)).filter((c) => c.id), raw: v };
}

function normalizeItemOption(v: unknown, categoryId: string): ItemOption {
  const r = isRec(v) ? v : {};
  return {
    id: idOf(v),
    categoryId,
    name: localized(v, 'name'),
    nameAr: str(r['name_ar']) ?? str(r['nameAr']),
    nameEn: str(r['name_en']) ?? str(r['nameEn']),
    image: str(r['image']),
    reward: num(r['reward']),
    countable: bool(r['countable']),
    active: bool(r['active']) ?? true,
    raw: v,
  };
}

/** `/public/items` group → category with selectable sub-items. */
export function normalizeCategory(v: unknown): ItemCategory {
  const r = isRec(v) ? v : {};
  const cat = isRec(r['category']) ? (r['category'] as Rec) : r;
  const id = idOf(v);
  const items = (Array.isArray(r['items']) ? (r['items'] as unknown[]) : []).map((it) => normalizeItemOption(it, id)).filter((it) => it.id && it.active !== false);
  return {
    id,
    name: localized(cat, 'name'),
    nameAr: str(cat['name_ar']) ?? str(cat['nameAr']),
    nameEn: str(cat['name_en']) ?? str(cat['nameEn']),
    image: str(cat['image']) ?? str(cat['icon']) ?? str(r['image']),
    icon: str(cat['icon']),
    countable: bool(cat['countable']),
    items,
    raw: v,
  };
}

function normalizeOrderItem(v: unknown): OrderItem {
  const r = isRec(v) ? v : {};
  const cat = r['category'];
  return {
    categoryId: idOf(cat) || undefined,
    categoryName: isRec(cat) ? localized(cat, 'name') : undefined,
    name: str(r['item_name']) ?? str(r['item_name_ar']) ?? str(r['item_name_en']) ?? str(r['name']) ?? '',
    nameAr: str(r['item_name_ar']),
    nameEn: str(r['item_name_en']),
    quantity: num(r['quantity']) ?? num(r['qty']) ?? 1,
    raw: v,
  };
}

export function normalizeDriver(v: unknown): Driver | undefined {
  if (!isRec(v)) return undefined;
  const d: Driver = {
    id: idOf(v) || undefined,
    name: str(v['name']) ?? str(v['fullName']) ?? (localized(v, 'name') || undefined),
    phone: str(v['phone']) ?? str(v['mobile']),
    avatar: str(v['avatar']) ?? str(v['image']),
    vehicle: str(v['vehicle']) ?? str(v['car']) ?? str(v['vehicleType']),
    plate: str(v['plate']) ?? str(v['plateNumber']),
    rating: num(v['rating']),
    location: fromApiLocation(v['location'] ?? v['currentLocation'] ?? v['position']),
    raw: v,
  };
  return d.id || d.name || d.phone ? d : undefined;
}

function normalizeHistory(v: unknown): OrderStatusHistoryEntry[] {
  if (!Array.isArray(v)) return [];
  return v.map((h) => {
    const r = isRec(h) ? h : {};
    return { status: str(r['status']) ?? str(r['state']) ?? str(h) ?? '', at: str(r['createdAt']) ?? str(r['at']) ?? str(r['date']) ?? str(r['time']), by: str(r['by']) ?? str(r['actor']), note: str(r['note']) ?? str(r['comment']), raw: h };
  }).filter((h) => h.status);
}

export function normalizeOrder(v: unknown): Order {
  const r = isRec(v) ? v : {};
  const region = r['region'], city = r['city'];
  const rating = isRec(r['rate']) ? (r['rate'] as Rec) : isRec(r['rating']) ? (r['rating'] as Rec) : undefined;
  return {
    id: idOf(v),
    code: str(r['code']) ?? str(r['orderCode']) ?? str(r['number']) ?? str(r['orderNumber']),
    status: str(r['status']) ?? str(r['state']) ?? '',
    items: Array.isArray(r['items']) ? (r['items'] as unknown[]).map(normalizeOrderItem) : [],
    images: Array.isArray(r['images']) ? (r['images'] as unknown[]).map((i) => (isRec(i) ? str(i['url']) ?? str(i['path']) ?? '' : str(i) ?? '')).filter(Boolean) : [],
    location: fromApiLocation(r['location']),
    address: str(r['address']),
    address2: str(r['address2']),
    regionId: idOf(region) || undefined,
    regionName: isRec(region) ? localized(region, 'name') : undefined,
    cityId: idOf(city) || undefined,
    cityName: isRec(city) ? localized(city, 'name') : undefined,
    phone: str(r['phone']),
    driver: normalizeDriver(r['driver'] ?? r['assignedDriver']),
    history: normalizeHistory(r['history'] ?? r['statusHistory'] ?? r['timeline'] ?? r['logs']),
    rating: rating ? { stars: num(rating['stars']) ?? num(rating['rate']) ?? 0, review: str(rating['review']) } : num(r['stars']) != null ? { stars: num(r['stars'])!, review: str(r['review']) } : undefined,
    weight: num(r['weight']),
    scheduledAt: str(r['scheduledAt']) ?? str(r['pickupDate']) ?? str(r['date']),
    createdAt: str(r['createdAt']) ?? str(r['created_at']),
    updatedAt: str(r['updatedAt']) ?? str(r['updated_at']),
    completedAt: str(r['completedAt']) ?? str(r['completed_at']),
    cancelReason: str(r['reason']) ?? str(r['cancelReason']),
    raw: v,
  };
}

/** `/order/check` confirmed shape: `{ runningOrder: Order | null, requestForRateOrder: Order | null }`. */
export function normalizeOrderCheck(body: unknown): OrderCheck {
  const inner = unwrap(body);
  const r = isRec(inner) ? inner : {};
  let activeOrder: Order | undefined;
  let pendingRate: Order | undefined;
  const direct = r['runningOrder'] ?? r['order'] ?? r['activeOrder'] ?? r['current'];
  if (isRec(direct) && idOf(direct)) activeOrder = normalizeOrder(direct);
  else if (isRec(inner) && idOf(inner) && (str(inner['status']) || Array.isArray(inner['items']))) activeOrder = normalizeOrder(inner);
  const rate = r['requestForRateOrder'] ?? r['rate'] ?? r['toRate'] ?? r['pendingRate'] ?? r['rateOrder'];
  if (isRec(rate) && idOf(rate)) pendingRate = normalizeOrder(rate);
  return { activeOrder, pendingRate, raw: body };
}

export function normalizeChatMessage(v: unknown, myId?: string): ChatMessage {
  const r = isRec(v) ? v : {};
  const sender = r['sender'] ?? r['from'] ?? r['user'];
  const senderType = str(r['senderType']) ?? str(r['type']) ?? (isRec(sender) ? str(sender['type']) ?? str(sender['role']) : undefined);
  const senderId = idOf(sender) || str(r['senderId']) || '';
  const mine = senderType ? /client|user|customer/i.test(senderType) : !!myId && senderId === myId;
  return {
    id: idOf(v) || `${str(r['createdAt']) ?? ''}-${str(r['text']) ?? ''}`,
    text: str(r['text']) ?? str(r['message']) ?? str(r['body']) ?? '',
    senderType,
    senderName: isRec(sender) ? str(sender['name']) : undefined,
    mine,
    createdAt: str(r['createdAt']) ?? str(r['created_at']) ?? str(r['date']),
    raw: v,
  };
}

export function normalizeProfile(body: unknown): UserProfile {
  const inner = unwrap(body);
  const r = isRec(inner) ? (isRec(inner['user']) ? (inner['user'] as Rec) : isRec(inner['client']) ? (inner['client'] as Rec) : inner) : {};
  return {
    id: idOf(r),
    name: str(r['name']),
    email: str(r['email']),
    phone: str(r['phone']),
    avatar: str(r['avatar']) ?? str(r['image']),
    countryCode: str(r['countryCode']) ?? str(r['country']),
    language: str(r['language']),
    location: fromApiLocation(r['location']),
    emailVerified: bool(r['email_verified']),
    phoneVerified: bool(r['is_phone_verified']),
    active: bool(r['active']),
    points: num(r['points']) ?? num(r['loyaltyPoints']),
    createdAt: str(r['createdAt']) ?? str(r['created_at']),
    raw: body,
  };
}

export function normalizeNotification(v: unknown): AppNotification {
  const r = isRec(v) ? v : {};
  const data = isRec(r['data']) ? (r['data'] as Rec) : {};
  return {
    id: idOf(v),
    title: localized(v, 'title') || str(r['title']) || '',
    body: localized(v, 'body') || str(r['body']) || str(r['message']) || str(r['text']) || undefined,
    image: str(r['image']),
    read: bool(r['read']) ?? bool(r['isRead']) ?? bool(r['seen']),
    type: str(r['type']) ?? str(data['type']),
    orderId: idOf(r['order']) || str(data['order']) || str(data['orderId']) || undefined,
    createdAt: str(r['createdAt']) ?? str(r['created_at']),
    raw: v,
  };
}

export function normalizeReward(v: unknown): Reward {
  const r = isRec(v) ? v : {};
  return {
    id: idOf(v),
    title: localized(v, 'title') || localized(v, 'name'),
    description: localized(v, 'description') || undefined,
    image: str(r['image']),
    points: num(r['points']) ?? num(r['cost']) ?? num(r['price']) ?? 0,
    available: bool(r['available']) ?? bool(r['active']) ?? true,
    raw: v,
  };
}

/** `/account/points` confirmed shape: `{ transactions: {docs…}, totalCredit, totalDebit, availableCredit }`. */
export function normalizePoints(body: unknown): PointsSummary {
  const inner = unwrap(body);
  const r = isRec(inner) ? inner : {};
  const balance = num(r['availableCredit']) ?? num(inner) ?? num(r['balance']) ?? num(r['points']) ?? num(r['total']) ?? num(r['current']) ?? 0;
  const tx = r['transactions'];
  const historyRaw = Array.isArray(tx) ? (tx as unknown[]) : isRec(tx) && Array.isArray(tx['docs']) ? (tx['docs'] as unknown[]) : Array.isArray(r['history']) ? (r['history'] as unknown[]) : Array.isArray(r['logs']) ? (r['logs'] as unknown[]) : Array.isArray(inner) ? inner : [];
  return {
    balance,
    total: num(r['totalCredit']) ?? num(r['total']) ?? num(r['earned']),
    history: historyRaw.map((h) => {
      const hr = isRec(h) ? h : {};
      const credit = num(hr['credit']), debit = num(hr['debit']);
      const points = num(hr['points']) ?? num(hr['amount']) ?? (credit != null || debit != null ? (credit ?? 0) - (debit ?? 0) : 0);
      return { id: idOf(h) || undefined, title: localized(h, 'title') || localized(h, 'reason') || localized(h, 'description') || str(hr['type']), points, createdAt: str(hr['createdAt']) ?? str(hr['created_at']), raw: h };
    }),
    raw: body,
  };
}

function geoJsonPolygons(v: unknown): LatLng[][] {
  if (!isRec(v)) return [];
  const type = str(v['type']);
  const coords = v['coordinates'];
  if (!Array.isArray(coords)) return [];
  const ring = (c: unknown): LatLng[] => (Array.isArray(c) ? c.map((p) => (Array.isArray(p) && num(p[0]) != null && num(p[1]) != null ? { lat: num(p[1])!, lng: num(p[0])! } : null)).filter((p): p is LatLng => !!p) : []);
  if (type === 'Polygon') return [ring(coords[0])].filter((r) => r.length >= 3);
  if (type === 'MultiPolygon') return (coords as unknown[]).map((poly) => (Array.isArray(poly) ? ring(poly[0]) : [])).filter((r) => r.length >= 3);
  return [];
}

export function normalizeContainer(v: unknown): Container {
  const r = isRec(v) ? v : {};
  const distRaw = num(r['distance']) ?? num(r['dist']);
  return {
    id: idOf(v),
    name: localized(v, 'name') || str(r['code']) || undefined,
    code: str(r['code']),
    type: str(r['type']),
    country: str(r['country']),
    location: fromApiLocation(r['location']),
    polygons: geoJsonPolygons(r['allowedRegions'] ?? r['area'] ?? r['polygon']),
    active: bool(r['active']),
    address: localized(v, 'address') || undefined,
    status: str(r['status']),
    fillLevel: num(r['fillLevel']) ?? num(r['level']),
    // Backend distances are usually meters when > 1000-ish; keep km for display.
    distanceKm: distRaw == null ? undefined : distRaw > 200 ? distRaw / 1000 : distRaw,
    image: str(r['image']),
    raw: v,
  };
}

export const normalizeReason = (v: unknown): CancellationReason => ({ id: idOf(v), text: localized(v, 'reason') || localized(v, 'title') || localized(v, 'name') || str(v) || '', raw: v });

/** `/public/cancellation-reasons` → `{ _id, value: { reasons_ar: string[], reasons_en?: string[] } }` (or a plain array). */
export function normalizeReasons(body: unknown, lang: 'ar' | 'en' = 'ar'): CancellationReason[] {
  const inner = unwrap(body);
  const value = isRec(inner) && isRec(inner['value']) ? (inner['value'] as Rec) : isRec(inner) ? inner : {};
  const list = (value[`reasons_${lang}`] ?? value['reasons'] ?? value[`reasons_${lang === 'ar' ? 'en' : 'ar'}`]) as unknown;
  if (Array.isArray(list)) return list.map((t, i) => ({ id: String(i), text: str(t) ?? '', raw: t })).filter((r) => r.text.trim());
  return toArray(body).map(normalizeReason).filter((r) => r.text);
}

export function normalizePartner(v: unknown): Partner {
  const r = isRec(v) ? v : {};
  return { id: idOf(v), name: localized(v, 'name'), image: str(r['image']) ?? str(r['logo']), description: localized(v, 'description') || undefined, url: str(r['url']) ?? str(r['link']) ?? str(r['website']), raw: v };
}

export function normalizeBanner(v: unknown): Banner {
  const r = isRec(v) ? v : {};
  const image = str(r['image']) ?? str(r['img']) ?? str(r['banner']) ?? (isImageUrl(str(r['url'])) ? str(r['url']) : undefined);
  const url = str(r['link']) ?? (image !== str(r['url']) ? str(r['url']) : undefined);
  return { id: idOf(v) || image || '', title: localized(v, 'title') || undefined, image, url, raw: v };
}

const isImageUrl = (u?: string): boolean => !!u && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u);

export function normalizeCampaign(v: unknown): Campaign {
  const r = isRec(v) ? v : {};
  return { id: idOf(v), title: localized(v, 'title') || localized(v, 'name'), content: localized(v, 'content') || localized(v, 'description') || undefined, image: str(r['image']), createdAt: str(r['createdAt']), raw: v };
}

/** `/public/page?page=slug` → `{ title_xx, content_xx (markdown), image }` or `null` when the page is not published. */
export function normalizePage(body: unknown, slug: string): StaticPage {
  const inner = unwrap(body);
  const r = isRec(inner) ? inner : {};
  return { slug, title: localized(inner, 'title') || undefined, image: str(r['image']), content: localized(inner, 'content') || localized(inner, 'body') || localized(inner, 'description') || str(r['html']) || undefined, raw: body };
}

export function normalizeContacts(body: unknown): ContactInfo {
  const outer = unwrap(body);
  const r = isRec(outer) && isRec(outer['value']) ? (outer['value'] as Rec) : isRec(outer) ? outer : {};
  const social: { name: string; url: string; image?: string }[] = [];
  const socialRaw = r['socialmedia'] ?? r['social'] ?? r['socials'] ?? r['links'];
  if (Array.isArray(socialRaw)) for (const s of socialRaw) { if (isRec(s)) { const url = str(s['url']) ?? str(s['link']); if (url) social.push({ name: str(s['name']) ?? str(s['type']) ?? 'link', url, image: str(s['image']) }); } }
  else if (isRec(socialRaw)) for (const [k, u] of Object.entries(socialRaw)) if (typeof u === 'string' && u) social.push({ name: k, url: u });
  for (const k of ['facebook', 'twitter', 'x', 'instagram', 'linkedin', 'tiktok', 'youtube', 'snapchat']) { const u = str(r[k]); if (u) social.push({ name: k, url: u }); }
  const wa = social.find((s) => /wa\.me|whatsapp/i.test(s.url));
  const whatsapp = str(r['whatsapp']) ?? (wa ? wa.url.replace(/^.*wa\.me\//, '') : undefined);
  return { phone: str(r['phone']) ?? str(r['mobile']), email: str(r['email']), whatsapp, website: str(r['website']), address: localized(r, 'address') || undefined, social, raw: body };
}

export function normalizeGeocode(body: unknown): GeocodeResult {
  const inner = unwrap(body);
  const r = isRec(inner) ? inner : {};
  const address = str(r['address']) ?? str(r['formatted_address']) ?? str(r['formattedAddress']) ?? str(r['display_name']) ?? (typeof inner === 'string' ? inner : undefined);
  return { address, city: str(r['city']), region: str(r['region']) ?? str(r['state']), country: str(r['country']), raw: body };
}

/** Extract uploaded file URL(s) from the upload service response. */
export function extractUploadedUrls(body: unknown): string[] {
  const out: string[] = [];
  const visit = (v: unknown, depth = 0): void => {
    if (depth > 4 || v == null) return;
    if (typeof v === 'string') { if (/^https?:\/\//i.test(v)) out.push(v); return; }
    if (Array.isArray(v)) { v.forEach((x) => visit(x, depth + 1)); return; }
    if (isRec(v)) {
      for (const key of ['url', 'Location', 'location', 'path', 'file', 'files', 'data', 'result', 's3Result', 'urls', 'images', 'key']) if (key in v) visit(v[key], depth + 1);
    }
  };
  visit(body);
  return Array.from(new Set(out));
}
