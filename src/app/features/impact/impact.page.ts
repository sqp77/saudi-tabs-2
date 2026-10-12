import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { AlertController, IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { AccountApi } from '../../core/api/account-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Achievement, AchievementsService } from '../../core/services/achievements.service';
import { ImpactService } from '../../core/services/impact.service';
import { OrdersStore } from '../../core/services/orders.store';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { StatTileComponent } from '../../shared/components/stat-tile/stat-tile.component';

@Component({
  selector: 'app-impact',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonRefresher, IonRefresherContent, TPipe, StatTileComponent, SectionTitleComponent, EmptyStateComponent],
  template: `
    <ion-header class="ion-no-border" [translucent]="true">
      <ion-toolbar><ion-title>{{ 'impact.title' | t }}</ion-title></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="eayni-page">
        <p class="eayni-muted sub">{{ 'impact.subtitle' | t }}</p>

        <div class="eayni-grid-2 eayni-stagger">
          <app-stat-tile icon="checkmark-done-outline" [value]="i18n.formatNumber(impact.completedCount())" [label]="'impact.completed' | t" [accent]="true" [badge]="'common.measured' | t"></app-stat-tile>
          <app-stat-tile icon="shirt-outline" [value]="i18n.formatNumber(impact.totalItems())" [label]="'impact.items' | t" [badge]="'common.measured' | t"></app-stat-tile>
          <app-stat-tile icon="leaf-outline" [value]="points() === null ? '—' : i18n.formatNumber(points()!)" [label]="'impact.points' | t"></app-stat-tile>
          <app-stat-tile icon="flame-outline" [value]="i18n.formatNumber(impact.streakMonths())" [label]="'impact.streak' | t"></app-stat-tile>
        </div>

        @if (impact.measuredWeightKg() !== null) {
          <div class="eayni-card weight"><ion-icon name="scale-outline"></ion-icon><div><strong>{{ i18n.formatNumber(impact.measuredWeightKg()!, { maximumFractionDigits: 1 }) }} kg</strong><span class="eayni-small eayni-muted">{{ 'common.measured' | t }}</span></div></div>
        }

        @if (!impact.completedCount()) {
          <app-empty-state icon="leaf-outline" [title]="'impact.empty' | t" [cta]="'home.hero.cta' | t" (action)="go('/donate')"></app-empty-state>
        } @else {
          <!-- goal -->
          <app-section-title [title]="'impact.goal.title' | t" [action]="'impact.goal.edit' | t" (actionClick)="editGoal()"></app-section-title>
          <div class="eayni-card goal">
            <div class="goal__row"><span>{{ 'impact.goal.body' | t: { target: i18n.formatNumber(ach.yearlyGoal()) } }}</span><strong>{{ 'impact.goal.progress' | t: { current: i18n.formatNumber(impact.thisYearCount()), target: i18n.formatNumber(ach.yearlyGoal()) } }}</strong></div>
            <div class="bar"><div class="bar__fill" [style.width.%]="goalPct()"></div></div>
          </div>

          <!-- monthly chart -->
          <app-section-title [title]="'impact.timeline' | t"></app-section-title>
          <div class="eayni-card chart" role="img" [attr.aria-label]="'impact.timeline' | t">
            <div class="bars">
              @for (m of impact.byMonth(); track m.key) {
                <div class="col" [title]="monthLabel(m.year, m.month) + ': ' + m.orders">
                  <div class="col__bar" [style.height.%]="maxMonth() ? (m.orders / maxMonth()) * 100 : 0" [class.zero]="!m.orders"></div>
                  <span class="col__lbl">{{ monthShort(m.year, m.month) }}</span>
                </div>
              }
            </div>
          </div>

          <!-- categories -->
          <app-section-title [title]="'impact.categories' | t"></app-section-title>
          <div class="eayni-card cats">
            @for (c of impact.byCategory(); track c.key) {
              <div class="cat">
                <div class="cat__row"><span>{{ c.label }}</span><strong>{{ i18n.formatNumber(c.items) }}</strong></div>
                <div class="bar"><div class="bar__fill" [style.width.%]="(c.items / (impact.byCategory()[0].items || 1)) * 100"></div></div>
              </div>
            }
          </div>
        }

        <!-- achievements -->
        <app-section-title [title]="'impact.achievements' | t" [action]="i18n.formatNumber(ach.unlockedCount()) + '/' + i18n.formatNumber(ach.list().length)"></app-section-title>
        <div class="badges eayni-stagger">
          @for (a of ach.list(); track a.id) {
            <button type="button" class="badge" [class.on]="a.unlocked" (click)="a.unlocked && shareBadge(a)">
              <div class="badge__icon"><ion-icon [name]="a.icon"></ion-icon></div>
              <strong>{{ a.titleKey | t }}</strong>
              <span class="eayni-small eayni-muted">{{ a.descKey | t }}</span>
              <div class="bar mini"><div class="bar__fill" [style.width.%]="(a.current / a.target) * 100"></div></div>
              <span class="badge__state">{{ (a.unlocked ? 'impact.achievements.unlocked' : 'impact.achievements.locked') | t }}</span>
            </button>
          }
        </div>

        <!-- methodology -->
        <div class="eayni-note method"><ion-icon name="information-circle-outline"></ion-icon><div><strong>{{ 'impact.estimate.title' | t }}</strong><p>{{ 'impact.estimate.body' | t }}</p></div></div>
        <div class="eayni-note eayni-note--info"><ion-icon name="people-outline"></ion-icon><div><strong>{{ 'impact.community.title' | t }}</strong><p>{{ 'impact.community.body' | t }}</p></div></div>
      </div>
    </ion-content>
  `,
  styles: [`
    .sub { margin: 0 0 14px; font-size: 13.5px; }
    .weight { margin-top: 12px; display: flex; align-items: center; gap: 12px; } .weight ion-icon { font-size: 26px; color: var(--ion-color-primary); } .weight div { display: flex; flex-direction: column; }
    .goal__row { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; margin-bottom: 10px; }
    .bar { height: 10px; border-radius: 5px; background: var(--eayni-surface-2); overflow: hidden; }
    .bar__fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--ion-color-primary-tint), var(--ion-color-primary)); transition: width .6s cubic-bezier(.2,.8,.2,1); }
    .bar.mini { height: 5px; margin: 8px 0 6px; }
    .chart .bars { display: flex; align-items: flex-end; gap: 6px; height: 140px; }
    .col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; }
    .col__bar { width: 100%; max-width: 22px; min-height: 4px; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg, var(--ion-color-primary-tint), var(--ion-color-primary)); transition: height .6s ease; }
    .col__bar.zero { background: var(--eayni-surface-2); }
    .col__lbl { font-size: 10px; color: var(--eayni-text-3); }
    .cats { display: flex; flex-direction: column; gap: 12px; }
    .cat__row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .badges { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .badge { text-align: start; display: flex; flex-direction: column; gap: 4px; padding: 14px; border-radius: var(--eayni-radius); background: var(--eayni-surface); border: 1px solid var(--eayni-border); font: inherit; color: var(--eayni-text); opacity: .72; filter: grayscale(.4); }
    .badge.on { opacity: 1; filter: none; border-color: color-mix(in srgb, var(--ion-color-tertiary) 60%, var(--eayni-border)); }
    .badge__icon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--eayni-surface-2); color: var(--eayni-text-3); font-size: 22px; margin-bottom: 6px; }
    .badge.on .badge__icon { background: linear-gradient(135deg, var(--ion-color-tertiary), #e2c37f); color: #1f1a0e; }
    .badge strong { font-size: 13.5px; }
    .badge__state { font-size: 11px; font-weight: 700; color: var(--eayni-text-3); }
    .badge.on .badge__state { color: var(--ion-color-tertiary-shade); }
    .method { margin-top: 18px; } .method p, .eayni-note p { margin: 4px 0 0; }
  `],
})
export class ImpactPage implements ViewWillEnter {
  readonly i18n = inject(I18nService);
  readonly impact = inject(ImpactService);
  readonly ach = inject(AchievementsService);
  private readonly store = inject(OrdersStore);
  private readonly account = inject(AccountApi);
  private readonly alerts = inject(AlertController);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly points = signal<number | null>(null);
  readonly maxMonth = computed(() => Math.max(0, ...this.impact.byMonth().map((m) => m.orders)));
  readonly goalPct = computed(() => Math.min(100, (this.impact.thisYearCount() / Math.max(1, this.ach.yearlyGoal())) * 100));

  ionViewWillEnter(): void {
    void this.store.refresh({ silent: this.store.loaded() }).catch((e) => this.toast.error(e));
    if (environment.features.rewards) void this.account.points().then((p) => this.points.set(p.balance)).catch(() => undefined);
  }

  async refresh(ev: CustomEvent): Promise<void> {
    await Promise.allSettled([this.store.refresh({ silent: true }), this.account.points().then((p) => this.points.set(p.balance))]);
    (ev.target as HTMLIonRefresherElement).complete();
  }

  monthLabel(y: number, m: number): string { return new Intl.DateTimeFormat(this.i18n.locale(), { month: 'long', year: 'numeric' }).format(new Date(y, m, 1)); }
  monthShort(y: number, m: number): string { return new Intl.DateTimeFormat(this.i18n.locale(), { month: 'narrow' }).format(new Date(y, m, 1)); }

  async editGoal(): Promise<void> {
    const a = await this.alerts.create({
      header: this.i18n.t('impact.goal.edit'),
      inputs: [{ type: 'number', name: 'goal', value: this.ach.yearlyGoal(), min: 1, max: 100 }],
      buttons: [{ text: this.i18n.t('common.cancel'), role: 'cancel' }, { text: this.i18n.t('common.save'), handler: (v: { goal: string }) => { const n = Number(v.goal); if (n > 0) void this.ach.setYearlyGoal(Math.round(n)); } }],
    });
    await a.present();
  }

  async shareBadge(a: Achievement): Promise<void> {
    const text = `${this.i18n.t('app.name')} · ${this.i18n.t(a.titleKey)} — ${this.i18n.t(a.descKey)}`;
    try { await Share.share({ title: this.i18n.t('impact.certificate'), text }); } catch { try { await navigator.clipboard.writeText(text); await this.toast.success('common.copied'); } catch { /* ignore */ } }
  }

  go(url: string): void { void this.router.navigateByUrl(url); }
}
