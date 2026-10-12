import { Injectable, computed, inject, signal } from '@angular/core';
import { ImpactService } from './impact.service';
import { StorageService } from '../storage/storage.service';

export interface Achievement {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  target: number;
  current: number;
  unlocked: boolean;
}

const GOAL_KEY = 'eayni.goal.year';

/**
 * Achievements are computed client-side from VERIFIED completed orders.
 * They are informational badges only (no monetary value). Eco points
 * themselves come from the backend loyalty endpoints.
 */
@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly impact = inject(ImpactService);
  private readonly storage = inject(StorageService);
  readonly yearlyGoal = signal(6);

  constructor() {
    void this.storage.get<number>(GOAL_KEY).then((g) => { if (g && g > 0) this.yearlyGoal.set(g); });
  }

  async setYearlyGoal(n: number): Promise<void> {
    this.yearlyGoal.set(n);
    await this.storage.set(GOAL_KEY, n);
  }

  readonly list = computed<Achievement[]>(() => {
    const completed = this.impact.completedCount();
    const items = this.impact.totalItems();
    const months = this.impact.distinctMonths();
    const cats = this.impact.distinctCategories();
    const mk = (id: string, icon: string, target: number, current: number): Achievement => ({
      id, icon, titleKey: `ach.${id}.title`, descKey: `ach.${id}.desc`, target, current: Math.min(current, target), unlocked: current >= target,
    });
    return [
      mk('first', 'leaf-outline', 1, completed),
      mk('champion', 'trophy-outline', 5, completed),
      mk('contributor', 'people-outline', 50, items),
      mk('hero', 'shield-checkmark-outline', 15, completed),
      mk('ambassador', 'planet-outline', 3, months),
      mk('variety', 'color-palette-outline', 4, cats),
    ];
  });

  readonly unlockedCount = computed(() => this.list().filter((a) => a.unlocked).length);
}
