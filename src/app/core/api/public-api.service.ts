import { Injectable, effect, inject, untracked } from '@angular/core';
import { ApiClient } from './api-client.service';
import { I18nService } from '../i18n/i18n.service';
import type { Banner, Campaign, CancellationReason, City, ContactInfo, Country, ItemCategory, Paginated, Partner, Region, RegionWithCities, StaticPage } from '../models';
import {
  isRec, normalizeBanner, normalizeCampaign, normalizeCategory, normalizeCity, normalizeContacts, normalizeCountry, normalizePage,
  normalizePartner, normalizeReasons, normalizeRegion, normalizeRegionWithCities, str, toArray, toPaginated, unwrap,
} from '../utils/normalize';

/**
 * Endpoints under /public (no auth required).
 *
 * The live API localizes responses by `Accept-Language` (an `en` request omits
 * `*_ar` fields), so the in-memory cache is cleared whenever the language changes.
 */
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private cache = new Map<string, Promise<unknown>>();

  constructor() {
    effect(() => { this.i18n.lang(); untracked(() => this.clearCache()); });
  }

  private cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) {
      const p = loader().catch((e) => { this.cache.delete(key); throw e; });
      this.cache.set(key, p);
    }
    return this.cache.get(key) as Promise<T>;
  }

  clearCache(): void { this.cache.clear(); }

  /** GET /public/country → `[{ name_ar, name_en, code: 'KSA', dial: '+966', image }]` */
  countries(): Promise<Country[]> {
    return this.cached('countries', async () => toArray(await this.api.get('public/country', { skipAuth: true })).map(normalizeCountry).filter((c) => c.code));
  }

  /** GET /public/items → category groups with selectable sub-items (`reward` points per unit). */
  categories(): Promise<ItemCategory[]> {
    return this.cached('items', async () => toArray(await this.api.get('public/items', { skipAuth: true })).map(normalizeCategory).filter((c) => c.id));
  }

  /** GET /public/all-cities → regions with embedded cities, both languages. Preferred over /regions + /cities. */
  regionsWithCities(): Promise<RegionWithCities[]> {
    return this.cached('all-cities', async () => toArray(await this.api.get('public/all-cities', { skipAuth: true })).map(normalizeRegionWithCities).filter((r) => r.id));
  }

  /** GET /public/regions (single-language names). */
  regions(): Promise<Region[]> {
    return this.cached('regions', async () => toArray(await this.api.get('public/regions', { skipAuth: true })).map(normalizeRegion).filter((r) => r.id));
  }

  /** GET /public/regions/:region/cities */
  cities(regionId: string): Promise<City[]> {
    return this.cached(`cities:${regionId}`, async () =>
      toArray(await this.api.get(`public/regions/${encodeURIComponent(regionId)}/cities`, { skipAuth: true })).map((c) => normalizeCity(c, regionId)).filter((c) => c.id));
  }

  /** GET /public/cancellation-reasons → `{ value: { reasons_ar: string[] } }` */
  cancellationReasons(): Promise<CancellationReason[]> {
    return this.cached('reasons', async () => normalizeReasons(await this.api.get('public/cancellation-reasons', { skipAuth: true }), this.i18n.lang()));
  }

  /** GET /public/partners?page=N (mongoose-paginate) */
  async partners(page = 1): Promise<Paginated<Partner>> {
    return toPaginated(await this.api.get('public/partners', { params: { page }, skipAuth: true }), normalizePartner, page);
  }

  /** GET /public/sponsors?type=Golden|Silver (paginated; `sponserType` on each doc) */
  async sponsors(type?: string): Promise<Partner[]> {
    return toArray(await this.api.get('public/sponsors', { params: { type }, skipAuth: true })).map(normalizePartner);
  }

  /** GET /public/bunners (sic) → `[{ _id, image }]` */
  banners(): Promise<Banner[]> {
    return this.cached('banners', async () => toArray(await this.api.get('public/bunners', { skipAuth: true })).map(normalizeBanner).filter((b) => b.image));
  }

  /** GET /public/ad → `{ url }` (popup image) */
  ad(): Promise<Banner | null> {
    return this.cached('ad', async () => {
      const body = unwrap(await this.api.get('public/ad', { skipAuth: true }));
      if (Array.isArray(body)) { const b = body.map(normalizeBanner).find((x) => x.image); return b ?? null; }
      if (isRec(body) && (str(body['url']) || str(body['image']))) { const b = normalizeBanner(body); return b.image ? b : null; }
      return null;
    });
  }

  /** GET /public/social-services?page=N → campaigns / initiatives */
  async campaigns(page = 1): Promise<Paginated<Campaign>> {
    return toPaginated(await this.api.get('public/social-services', { params: { page }, skipAuth: true }), normalizeCampaign, page);
  }

  /** GET /public/page?page=about|terms|… → `{ title_xx, content_xx (markdown), image }` or `null` */
  page(slug: string): Promise<StaticPage> {
    return this.cached(`page:${slug}`, async () => normalizePage(await this.api.get('public/page', { params: { page: slug }, skipAuth: true }), slug));
  }

  /** GET /public/contacts → `{ value: { socialmedia, phone, email, website, address } }` */
  contacts(): Promise<ContactInfo> {
    return this.cached('contacts', async () => normalizeContacts(await this.api.get('public/contacts', { skipAuth: true })));
  }

  /** POST /public/contact/submit */
  submitContact(body: { name: string; email?: string; phone?: string; message: string }): Promise<unknown> {
    return this.api.post('public/contact/submit', body, { skipAuth: true });
  }

  /** GET /health → `{ status: 'UP' }` */
  health(): Promise<unknown> {
    return this.api.get('health', { skipAuth: true });
  }
}
