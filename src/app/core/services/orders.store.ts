import { Injectable, computed, inject, signal } from '@angular/core';
import { OrderApi } from '../api/order-api.service';
import type { Order, OrderCheck } from '../models';
import { isActiveStatus, isCancelledStatus, isCompletedStatus } from '../utils/order-status';

/**
 * Single source of truth for the user's orders. Everything comes from
 * GET /order/ and GET /order/check; nothing is synthesized.
 */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly api = inject(OrderApi);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<unknown>(null);
  readonly lastSync = signal<Date | null>(null);
  readonly check = signal<OrderCheck | null>(null);

  readonly active = computed(() => this.orders().filter((o) => isActiveStatus(o.status)));
  readonly completed = computed(() => this.orders().filter((o) => isCompletedStatus(o.status)));
  readonly cancelled = computed(() => this.orders().filter((o) => isCancelledStatus(o.status)));
  readonly currentActive = computed<Order | null>(() => this.check()?.activeOrder ?? this.active()[0] ?? null);
  readonly pendingRate = computed<Order | null>(() => {
    const fromCheck = this.check()?.pendingRate;
    if (fromCheck) return fromCheck;
    return this.completed().find((o) => !o.rating) ?? null;
  });

  async refresh(opts: { silent?: boolean } = {}): Promise<void> {
    if (!opts.silent) this.loading.set(true);
    this.error.set(null);
    try {
      // The list endpoint accepts a status filter; without it we expect every order of the user.
      const first = await this.api.list({ page: 1 });
      let items = first.items;
      let page = first.page;
      let hasMore = first.hasMore && first.totalPages != null;
      while (hasMore && page < (first.totalPages ?? 1) && page < 20) {
        page += 1;
        const next = await this.api.list({ page });
        items = items.concat(next.items);
        hasMore = next.hasMore && page < (next.totalPages ?? page);
      }
      this.orders.set(dedupe(items).sort(byNewest));
      this.loaded.set(true);
      this.lastSync.set(new Date());
    } catch (e) {
      this.error.set(e);
      if (!this.loaded()) throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async refreshCheck(): Promise<OrderCheck | null> {
    try {
      const c = await this.api.check();
      this.check.set(c);
      if (c.activeOrder) this.upsert(c.activeOrder);
      return c;
    } catch {
      return null;
    }
  }

  byId(id: string): Order | undefined {
    return this.orders().find((o) => o.id === id) ?? (this.check()?.activeOrder?.id === id ? this.check()?.activeOrder : undefined);
  }

  upsert(order: Order): void {
    const rest = this.orders().filter((o) => o.id !== order.id);
    this.orders.set([order, ...rest].sort(byNewest));
  }

  patch(id: string, patch: Partial<Order>): void {
    this.orders.set(this.orders().map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  clear(): void {
    this.orders.set([]);
    this.check.set(null);
    this.loaded.set(false);
    this.lastSync.set(null);
  }
}

function byNewest(a: Order, b: Order): number {
  const ta = Date.parse(a.createdAt ?? '') || 0;
  const tb = Date.parse(b.createdAt ?? '') || 0;
  return tb - ta;
}

function dedupe(list: Order[]): Order[] {
  const seen = new Map<string, Order>();
  for (const o of list) if (o.id && !seen.has(o.id)) seen.set(o.id, o);
  return [...seen.values()];
}
