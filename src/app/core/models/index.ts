/**
 * Typed models for the EAYNI client API.
 *
 * The Postman collection documents REQUEST bodies but contains no response
 * examples. Every response model here is therefore intentionally permissive:
 * fields that the app relies on are normalized by `normalize*` helpers in
 * `core/utils/normalize.ts`, and unknown extra fields are preserved in `raw`.
 */

export type Id = string;

export interface LatLng {
  lat: number;
  lng: number;
}

/** POST /auth/phone-signin */
export interface PhoneSignInRequest {
  phone: string;
  countryCode: string;
}

/** POST /auth/phone-verify */
export interface PhoneVerifyRequest {
  phone: string;
  code: string;
}

/** POST /auth/refresh-token */
export interface RefreshTokenRequest {
  refreshToken: string;
  fcm?: string;
}

/** Response of phone-verify / refresh-token. `accessToken` is confirmed by the collection's test script. */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  raw?: unknown;
}

/** GET /public/country — `{ name_ar, name_en, code: 'KSA', dial: '+966', image, active }` */
export interface Country {
  id: Id;
  name: string;
  /** Dial code without "+", e.g. "966" — sent as `countryCode`. */
  code: string;
  iso?: string;
  flag?: string;
  raw: unknown;
}

export interface Region {
  id: Id;
  name: string;
  raw: unknown;
}

export interface City {
  id: Id;
  name: string;
  nameAr?: string;
  nameEn?: string;
  regionId?: Id;
  raw: unknown;
}

/** GET /public/all-cities — `[{ _id, name_ar, name_en, count, child: City[] }]` */
export interface RegionWithCities extends Region {
  nameAr?: string;
  nameEn?: string;
  cities: City[];
}

/**
 * GET /public/items — confirmed shape (2026-10-12):
 * `[{ _id, category: { _id, name_ar, name_en, image, countable }, items: [{ _id, name_ar, name_en, image, reward, countable, active }] }]`
 * The top-level `_id` is what `POST /order/submit` expects in `items[].category`.
 */
export interface ItemCategory {
  /** Group id — sent as `items[].category` on order submit. */
  id: Id;
  name: string;
  nameAr?: string;
  nameEn?: string;
  image?: string;
  icon?: string;
  countable?: boolean;
  items: ItemOption[];
  raw: unknown;
}

export interface ItemOption {
  id: Id;
  categoryId: Id;
  name: string;
  nameAr?: string;
  nameEn?: string;
  image?: string;
  /** Eco points per unit as published by the backend (string in the API). */
  reward?: number;
  countable?: boolean;
  active?: boolean;
  raw: unknown;
}

export interface OrderItemInput {
  category: Id;
  item_name_ar: string;
  item_name_en: string;
  quantity: number;
}

/** POST /order/submit */
export interface SubmitOrderRequest {
  region: Id;
  city: Id;
  location: [number, number];
  items: OrderItemInput[];
  address?: string;
  address2?: string;
  images?: string[];
  phone: string;
}

/** PUT /order/:id */
export interface UpdateOrderRequest {
  region?: Id;
  city?: Id;
  location?: [number, number];
  items?: { category: Id; item_name?: string; item_name_ar?: string; item_name_en?: string; quantity: number }[];
  address?: string;
  address2?: string;
  images?: string[];
  phone?: string;
}

export interface OrderItem {
  categoryId?: Id;
  categoryName?: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  quantity: number;
  raw: unknown;
}

export interface Driver {
  id?: Id;
  name?: string;
  phone?: string;
  avatar?: string;
  vehicle?: string;
  plate?: string;
  rating?: number;
  /** Only present if the backend ever embeds a position. Never fabricated. */
  location?: LatLng;
  raw: unknown;
}

export interface OrderStatusHistoryEntry {
  status: string;
  at?: string;
  by?: string;
  note?: string;
  raw: unknown;
}

export interface Order {
  id: Id;
  code?: string;
  status: string;
  items: OrderItem[];
  images: string[];
  location?: LatLng;
  address?: string;
  address2?: string;
  regionId?: Id;
  regionName?: string;
  cityId?: Id;
  cityName?: string;
  phone?: string;
  driver?: Driver;
  history: OrderStatusHistoryEntry[];
  rating?: { stars: number; review?: string };
  weight?: number;
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  cancelReason?: string;
  raw: unknown;
}

export interface ChatMessage {
  id: Id;
  text: string;
  senderType?: 'client' | 'driver' | 'admin' | string;
  senderName?: string;
  mine: boolean;
  createdAt?: string;
  raw: unknown;
}

export interface UserProfile {
  id: Id;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  countryCode?: string;
  language?: string;
  location?: LatLng;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  active?: boolean;
  points?: number;
  createdAt?: string;
  raw: unknown;
}

/** POST /auth/signin (undocumented in the collection; confirmed live 2026-10-12). Password min 6 chars. */
export interface EmailSignInRequest {
  email: string;
  password: string;
}

/** POST /auth/signup → `{ user, accessToken }`. `phone` is required by the backend schema. */
export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  countryCode?: string;
}

/** PUT /account/profile */
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  fcm?: string;
  os?: string;
  app_version?: string;
  language?: string;
  location?: [number, number];
  avatar?: string;
}

export interface AppNotification {
  id: Id;
  title: string;
  body?: string;
  image?: string;
  read?: boolean;
  type?: string;
  orderId?: Id;
  createdAt?: string;
  raw: unknown;
}

export interface Reward {
  id: Id;
  title: string;
  description?: string;
  image?: string;
  points: number;
  available?: boolean;
  raw: unknown;
}

export interface PointsSummary {
  balance: number;
  total?: number;
  history: { id?: Id; title?: string; points: number; createdAt?: string; raw: unknown }[];
  raw: unknown;
}

/**
 * GET /account/containers — confirmed shape: `{ _id, name_ar, name_en, type, country, image, active, allowedRegions: MultiPolygon }`.
 * A container is a recyclable-collection container service offered inside the `allowedRegions` coverage; it has no single pin.
 */
export interface Container {
  id: Id;
  name?: string;
  code?: string;
  type?: string;
  country?: string;
  location?: LatLng;
  /** Coverage polygons (outer rings) as LatLng lists, converted from GeoJSON [lng, lat]. */
  polygons: LatLng[][];
  address?: string;
  status?: string;
  fillLevel?: number;
  distanceKm?: number;
  image?: string;
  active?: boolean;
  raw: unknown;
}

export type ContainerAction = 'empty' | 'maintenance' | 'requested';

export interface CancellationReason {
  id: Id;
  text: string;
  raw: unknown;
}

export interface Partner {
  id: Id;
  name: string;
  image?: string;
  description?: string;
  url?: string;
  raw: unknown;
}

export interface Banner {
  id: Id;
  title?: string;
  image?: string;
  url?: string;
  raw: unknown;
}

/** GET /public/social-services — campaigns / initiatives (paginated). */
export interface Campaign {
  id: Id;
  title: string;
  content?: string;
  image?: string;
  createdAt?: string;
  raw: unknown;
}

export interface StaticPage {
  slug: string;
  title?: string;
  image?: string;
  content?: string;
  raw: unknown;
}

/** GET /public/contacts — `{ value: { socialmedia: [{ name, url, image }], phone, email, website, address } }` */
export interface ContactInfo {
  phone?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  address?: string;
  social: { name: string; url: string; image?: string }[];
  raw: unknown;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages?: number;
  total?: number;
  hasMore: boolean;
}

export interface GeocodeResult {
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  raw: unknown;
}

/** GET /order/check — shape is undocumented; normalized to this. */
export interface OrderCheck {
  activeOrder?: Order;
  pendingRate?: Order;
  raw: unknown;
}

export interface SavedPlace {
  id: string;
  label: string;
  kind: 'home' | 'work' | 'other';
  location: LatLng;
  address?: string;
  address2?: string;
  regionId?: Id;
  regionName?: string;
  cityId?: Id;
  cityName?: string;
  createdAt: string;
}
