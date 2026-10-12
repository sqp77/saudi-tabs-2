import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ImpactService } from './impact.service';
import { OrdersStore } from './orders.store';
import { AchievementsService } from './achievements.service';
import type { Order } from '../models';
import { provideHttpClient } from '@angular/common/http';

const order = (id: string, status: string, qty: number, date: string, cat = 'k1'): Order => ({
  id, status, items: [{ categoryId: cat, categoryName: cat, name: 'x', quantity: qty, raw: null }], images: [], history: [], createdAt: date, completedAt: date, raw: null,
});

describe('ImpactService / AchievementsService', () => {
  let store: OrdersStore;
  let impact: ImpactService;
  let ach: AchievementsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    store = TestBed.inject(OrdersStore);
    impact = TestBed.inject(ImpactService);
    ach = TestBed.inject(AchievementsService);
  });

  it('counts only completed orders and never estimates weight', () => {
    const now = new Date();
    const iso = (m: number): string => new Date(now.getFullYear(), now.getMonth() - m, 2).toISOString();
    store.orders.set([
      order('1', 'order.driver.completed', 5, iso(0)),
      order('2', 'order.driver.completed', 7, iso(1), 'k2'),
      order('3', 'order.client.send', 100, iso(0)),
      order('4', 'order.client.cancelled', 100, iso(0)),
    ]);
    expect(impact.completedCount()).toBe(2);
    expect(impact.totalItems()).toBe(12);
    expect(impact.measuredWeightKg()).toBeNull();
    expect(impact.byCategory().map((c) => c.items)).toEqual([7, 5]);
    expect(impact.streakMonths()).toBe(2);
    expect(impact.byMonth()).toHaveLength(12);
    expect(impact.byMonth().at(-1)?.orders).toBe(1);
  });

  it('unlocks achievements from verified completions', () => {
    store.orders.set([order('1', 'order.driver.completed', 60, '2026-01-10T00:00:00Z')]);
    const list = ach.list();
    expect(list.find((a) => a.id === 'first')?.unlocked).toBe(true);
    expect(list.find((a) => a.id === 'contributor')?.unlocked).toBe(true);
    expect(list.find((a) => a.id === 'champion')?.unlocked).toBe(false);
    expect(ach.unlockedCount()).toBe(2);
  });
});
