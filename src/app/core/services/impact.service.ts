import { Injectable, computed, inject } from '@angular/core';
import { OrdersStore } from './orders.store';
import type { Order } from '../models';

export interface CategoryStat { key: string; label: string; items: number; orders: number }
export interface MonthStat { key: string; year: number; month: number; orders: number; items: number }

/**
 * Impact figures derived ONLY from completed orders returned by the API.
 * Item counts are "measured" (they are what the user submitted and the backend
 * recorded). We deliberately do not estimate kilograms or CO2: the API exposes
 * no weights or methodology, so any such number would be fabricated.
 */
@Injectable({ providedIn: 'root' })
export class ImpactService {
  private readonly store = inject(OrdersStore);

  readonly completed = computed(() => this.store.completed());
  readonly completedCount = computed(() => this.completed().length);
  readonly totalItems = computed(() => this.completed().reduce((s, o) => s + itemsOf(o), 0));
  readonly measuredWeightKg = computed(() => {
    const withWeight = this.completed().filter((o) => typeof o.weight === 'number');
    return withWeight.length ? withWeight.reduce((s, o) => s + (o.weight ?? 0), 0) : null;
  });

  readonly byCategory = computed<CategoryStat[]>(() => {
    const map = new Map<string, CategoryStat>();
    for (const o of this.completed()) {
      const seen = new Set<string>();
      for (const it of o.items) {
        const key = it.categoryId ?? it.categoryName ?? it.name ?? 'other';
        const label = it.categoryName ?? it.name ?? key;
        const cur = map.get(key) ?? { key, label, items: 0, orders: 0 };
        cur.items += it.quantity;
        if (!seen.has(key)) { cur.orders += 1; seen.add(key); }
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.items - a.items);
  });

  readonly byMonth = computed<MonthStat[]>(() => {
    const now = new Date();
    const months: MonthStat[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, year: d.getFullYear(), month: d.getMonth(), orders: 0, items: 0 });
    }
    const idx = new Map(months.map((m) => [m.key, m]));
    for (const o of this.completed()) {
      const d = dateOf(o);
      if (!d) continue;
      const m = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (m) { m.orders += 1; m.items += itemsOf(o); }
    }
    return months;
  });

  /** Consecutive months (ending this month or last month) with at least one completed donation. */
  readonly streakMonths = computed(() => {
    const keys = new Set(this.completed().map((o) => dateOf(o)).filter((d): d is Date => !!d).map((d) => `${d.getFullYear()}-${d.getMonth()}`));
    const now = new Date();
    let streak = 0;
    let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    if (!keys.has(`${cursor.getFullYear()}-${cursor.getMonth()}`)) cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    while (keys.has(`${cursor.getFullYear()}-${cursor.getMonth()}`)) {
      streak += 1;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    }
    return streak;
  });

  readonly distinctMonths = computed(() => new Set(this.completed().map((o) => dateOf(o)).filter((d): d is Date => !!d).map((d) => `${d.getFullYear()}-${d.getMonth()}`)).size);
  readonly distinctCategories = computed(() => this.byCategory().length);
  readonly thisYearCount = computed(() => this.completed().filter((o) => dateOf(o)?.getFullYear() === new Date().getFullYear()).length);
}

export function itemsOf(o: Order): number {
  return o.items.reduce((s, it) => s + (Number.isFinite(it.quantity) ? it.quantity : 0), 0);
}

export function dateOf(o: Order): Date | null {
  const raw = o.completedAt ?? o.updatedAt ?? o.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
