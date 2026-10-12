import { Component, OnInit, inject, signal } from '@angular/core';
import { AlertController, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/angular';
import { AccountApi } from '../../core/api/account-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { PointsSummary, Reward } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Loyalty: GET /account/points, GET /account/rewards, POST /account/rewards/:id/redeem */
@Component({
  selector: 'app-rewards',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonRefresher, IonRefresherContent, TPipe, EmptyStateComponent, SectionTitleComponent, SkeletonComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'rewards.title' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="load($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="eayni-page">
        <div class="wallet eayni-fade-up">
          <div class="wallet__label">{{ 'rewards.balance' | t }}</div>
          <div class="wallet__value">{{ points() ? i18n.formatNumber(points()!.balance) : '—' }} <ion-icon name="leaf"></ion-icon></div>
          <div class="wallet__hint">{{ 'rewards.how' | t }}</div>
        </div>

        <app-section-title [title]="'rewards.available' | t"></app-section-title>
        @if (loading()) { <app-skeleton [count]="3"></app-skeleton> }
        @else if (!rewards().length) { <app-empty-state icon="gift-outline" [title]="'rewards.empty' | t"></app-empty-state> }
        @else {
          <div class="list eayni-stagger">
            @for (r of rewards(); track r.id) {
              <div class="reward eayni-card">
                <div class="reward__img">@if (r.image) { <img [src]="r.image" alt="" loading="lazy" /> } @else { <ion-icon name="gift-outline"></ion-icon> }</div>
                <div class="reward__body">
                  <strong>{{ r.title }}</strong>
                  @if (r.description) { <span class="eayni-small eayni-muted">{{ r.description }}</span> }
                  <span class="cost">{{ 'rewards.cost' | t: { points: i18n.formatNumber(r.points) } }}</span>
                </div>
                <ion-button size="small" shape="round" class="eayni-btn" [disabled]="busy() === r.id || !canAfford(r)" (click)="redeem(r)">{{ (canAfford(r) ? 'rewards.redeem' : 'rewards.notEnough') | t }}</ion-button>
              </div>
            }
          </div>
        }

        @if (points()?.history?.length) {
          <app-section-title [title]="'rewards.history' | t"></app-section-title>
          <div class="eayni-card hist">
            @for (h of points()!.history; track $index) {
              <div class="hist__row"><div><div>{{ h.title || '—' }}</div><div class="eayni-small eayni-muted">{{ i18n.formatDate(h.createdAt) }}</div></div><strong [class.neg]="h.points < 0">{{ h.points > 0 ? '+' : '' }}{{ i18n.formatNumber(h.points) }}</strong></div>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .wallet { border-radius: 24px; padding: 22px; background: linear-gradient(135deg, #0e7a4f, #1db47a); color: #fff; box-shadow: var(--eayni-shadow-lg); margin-top: 6px; }
    .wallet__label { font-size: 13px; opacity: .9; }
    .wallet__value { font-size: 40px; font-weight: 900; display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .wallet__hint { font-size: 12.5px; opacity: .85; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .reward { display: flex; align-items: center; gap: 12px; padding: 12px; }
    .reward__img { width: 56px; height: 56px; border-radius: 14px; overflow: hidden; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-tertiary) 20%, transparent); color: var(--ion-color-tertiary-shade); font-size: 26px; flex: none; }
    .reward__img img { width: 100%; height: 100%; object-fit: cover; }
    .reward__body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .cost { font-size: 12.5px; font-weight: 800; color: var(--ion-color-primary); margin-top: 2px; }
    .hist { display: flex; flex-direction: column; gap: 10px; }
    .hist__row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 14px; }
    .neg { color: var(--ion-color-danger); }
  `],
})
export class RewardsPage implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(AccountApi);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);
  readonly points = signal<PointsSummary | null>(null);
  readonly rewards = signal<Reward[]>([]);
  readonly loading = signal(true);
  readonly busy = signal<string | null>(null);

  ngOnInit(): void { void this.load(); }

  async load(ev?: CustomEvent): Promise<void> {
    const [p, r] = await Promise.allSettled([this.api.points(), this.api.rewards()]);
    if (p.status === 'fulfilled') this.points.set(p.value);
    if (r.status === 'fulfilled') this.rewards.set(r.value.items);
    else if (!ev) await this.toast.error(r.reason);
    this.loading.set(false);
    (ev?.target as HTMLIonRefresherElement | undefined)?.complete();
  }

  canAfford(r: Reward): boolean { const b = this.points()?.balance; return b == null ? true : b >= r.points; }

  async redeem(r: Reward): Promise<void> {
    const a = await this.alerts.create({
      header: this.i18n.t('rewards.redeem'), message: this.i18n.t('rewards.confirm', { name: r.title, points: this.i18n.formatNumber(r.points) }),
      buttons: [{ text: this.i18n.t('common.cancel'), role: 'cancel' }, { text: this.i18n.t('common.confirm'), role: 'confirm' }],
    });
    await a.present();
    if ((await a.onWillDismiss()).role !== 'confirm') return;
    this.busy.set(r.id);
    try {
      await this.api.redeem(r.id);
      await this.toast.success('rewards.redeemed');
      await this.load();
    } catch (e) { await this.toast.error(e); }
    finally { this.busy.set(null); }
  }
}
