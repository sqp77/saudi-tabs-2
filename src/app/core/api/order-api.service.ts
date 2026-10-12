import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client.service';
import type { ChatMessage, GeocodeResult, LatLng, Order, OrderCheck, Paginated, SubmitOrderRequest, UpdateOrderRequest } from '../models';
import { isRec, normalizeChatMessage, normalizeGeocode, normalizeOrder, normalizeOrderCheck, toArray, toPaginated, unwrap } from '../utils/normalize';

/** Endpoints under /order (bearer token required). */
@Injectable({ providedIn: 'root' })
export class OrderApi {
  private readonly api = inject(ApiClient);

  /** GET /order/?status=... */
  async list(opts: { status?: string; page?: number } = {}): Promise<Paginated<Order>> {
    const page = opts.page ?? 1;
    return toPaginated(await this.api.get('order/', { params: { status: opts.status, page } }), normalizeOrder, page);
  }

  /** GET /order/check — current order state and whether a rating is pending. */
  async check(): Promise<OrderCheck> {
    return normalizeOrderCheck(await this.api.get('order/check'));
  }

  /** POST /order/submit */
  async submit(body: SubmitOrderRequest): Promise<Order> {
    const res = await this.api.post('order/submit', body);
    const inner = unwrap(res);
    return normalizeOrder(isRec(inner) && isRec(inner['order']) ? inner['order'] : inner);
  }

  /** PUT /order/:id */
  async update(id: string, body: UpdateOrderRequest): Promise<Order> {
    const res = await this.api.put(`order/${encodeURIComponent(id)}`, body);
    const inner = unwrap(res);
    return normalizeOrder(isRec(inner) && isRec(inner['order']) ? inner['order'] : inner);
  }

  /** DELETE /order/:id  (soft delete / cancel) */
  cancel(id: string, reason: string): Promise<unknown> {
    return this.api.delete(`order/${encodeURIComponent(id)}`, { reason });
  }

  /** POST /order/:id/rate */
  rate(id: string, stars: number, review?: string): Promise<unknown> {
    return this.api.post(`order/${encodeURIComponent(id)}/rate`, { stars, review: review ?? '' });
  }

  /** POST /order/geo/address — reverse geocode. Body follows the GeoJSON Point convention ([lng, lat]). */
  async geocode(p: LatLng): Promise<GeocodeResult> {
    return normalizeGeocode(await this.api.post('order/geo/address', { type: 'Point', coordinates: [p.lng, p.lat] }));
  }

  /** GET /order/:id/chat */
  async chatHistory(orderId: string, myUserId?: string): Promise<ChatMessage[]> {
    return toArray(await this.api.get(`order/${encodeURIComponent(orderId)}/chat`)).map((m) => normalizeChatMessage(m, myUserId));
  }

  /** POST /order/:id/chat */
  sendChat(orderId: string, text: string): Promise<unknown> {
    return this.api.post(`order/${encodeURIComponent(orderId)}/chat`, { text });
  }
}
