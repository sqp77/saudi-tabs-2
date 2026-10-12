import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { Order } from '../../core/models';
import { OrdersStore } from '../../core/services/orders.store';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { OrderCardComponent } from '../../shared/components/order-card/order-card.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-orders',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonRefresher, IonRefresherContent, TPipe, OrderCardComponent, EmptyStateComponent, SkeletonComponent],
  template: `
    <ion-header class="ion-no-border" [translucent]="true">
      <ion-toolbar><ion-title>{{ 'orders.title' | t }}</ion-title></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="eayni-page">
        <div class="search">
          <ion-icon name="search-outline"></ion-icon>
          <input type="search" [placeholder]="'orders.search' | t" [value]="query()" (input)="query.set($any($event.target).value)" />
        </div>
        <div class="filters" role="tablist">
          @for (f of filters; track f) {
            <button type="button" role="tab" [attr.aria-selected]="filter() === f" [class.active]="filter() === f" (click)="filter.set(f)">
              {{ ('orders.filter.' + f) | t }} <span class="n">{{ i18n.formatNumber(countFor(f)) }}</span>
            </button>
          }
        </div>

        @if (store.loading() && !store.loaded()) {
          <app-skeleton [count]="4"></app-skeleton>
        } @else if (!list().length) {
          <app-empty-state icon="cube-outline" [title]="'orders.empty.title' | t" [subtitle]="'orders.empty.subtitle' | t" [cta]="'orders.empty.cta' | t" (action)="go('/donate')"></app-empty-state>
        } @else {
          <div class="list eayni-stagger">
            @for (o of list(); track o.id) {
              <app-order-card [order]="o" (open)="go('/orders/' + o.id)"></app-order-card>
            }
          </div>
        }
        @if (store.lastSync(); as t) { <p class="sync eayni-small eayni-muted">{{ 'track.lastUpdated' | t: { time: i18n.relativeTime(t) } }}</p> }
      </div>
    </ion-content>
  `,
  styles: [`
    .search { display: flex; align-items: center; gap: 8px; background: var(--eayni-surface); border: 1px solid var(--eayni-border); border-radius: 14px; padding: 0 14px; margin: 6px 0 12px; }
    .search ion-icon { color: var(--eayni-text-3); font-size: 18px; }
    .search input { flex: 1; border: 0; background: none; font: inherit; padding: 12px 0; color: var(--eayni-text); outline: none; }
    .filters { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; margin-bottom: 12px; }
    .filters button { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--eayni-border); background: var(--eayni-surface); color: var(--eayni-text-2); font: inherit; font-size: 13px; font-weight: 700; }
    .filters button.active { background: var(--ion-color-primary); color: #fff; border-color: var(--ion-color-primary); }
    .n { font-size: 11px; opacity: .8; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .sync { text-align: center; margin-top: 16px; }
  `],
})
export class OrdersPage implements ViewWillEnter {
  readonly i18n = inject(I18nService);
  readonly store = inject(OrdersStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly filters: Filter[] = ['all', 'active', 'completed', 'cancelled'];
  readonly filter = signal<Filter>('all');
  readonly query = signal('');

  readonly list = computed<Order[]>(() => {
    const base = this.filter() === 'active' ? this.store.active() : this.filter() === 'completed' ? this.store.completed() : this.filter() === 'cancelled' ? this.store.cancelled() : this.store.orders();
    const q = this.query().trim().toLowerCase();
    if (!q) return base;
    return base.filter((o) => [o.code, o.id, o.address, o.cityName, ...o.items.flatMap((i) => [i.name, i.nameAr, i.nameEn, i.categoryName])].some((s) => s?.toLowerCase().includes(q)));
  });

  ionViewWillEnter(): void {
    this.store.refresh({ silent: this.store.loaded() }).catch((e) => this.toast.error(e));
  }

  countFor(f: Filter): number {
    return f === 'active' ? this.store.active().length : f === 'completed' ? this.store.completed().length : f === 'cancelled' ? this.store.cancelled().length : this.store.orders().length;
  }

  async refresh(ev: CustomEvent): Promise<void> {
    await Promise.allSettled([this.store.refresh({ silent: true }), this.store.refreshCheck()]);
    (ev.target as HTMLIonRefresherElement).complete();
  }

  go(url: string): void { void this.router.navigateByUrl(url); }
}
