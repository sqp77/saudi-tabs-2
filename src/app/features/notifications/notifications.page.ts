import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/angular';
import { AccountApi } from '../../core/api/account-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { AppNotification } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** GET /account/notifications (paginated). */
@Component({
  selector: 'app-notifications',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, TPipe, EmptyStateComponent, SkeletonComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'notif.title' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="reload($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="eayni-page">
        @if (loading()) { <app-skeleton [count]="5" [height]="72"></app-skeleton> }
        @else if (!items().length) { <app-empty-state icon="notifications-off-outline" [title]="'notif.empty' | t"></app-empty-state> }
        @else {
          <div class="list eayni-stagger">
            @for (n of items(); track n.id) {
              <button type="button" class="n" [class.unread]="n.read === false" (click)="open(n)">
                <div class="n__icon"><ion-icon [name]="iconFor(n)"></ion-icon></div>
                <div class="n__body">
                  <strong>{{ n.title }}</strong>
                  @if (n.body) { <span>{{ n.body }}</span> }
                  <time class="eayni-small eayni-muted">{{ i18n.relativeTime(n.createdAt) || i18n.formatDate(n.createdAt) }}</time>
                </div>
                @if (n.image) { <img [src]="n.image" alt="" loading="lazy" /> }
              </button>
            }
          </div>
          <ion-infinite-scroll (ionInfinite)="more($event)" [disabled]="!hasMore()"><ion-infinite-scroll-content></ion-infinite-scroll-content></ion-infinite-scroll>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .list { display: flex; flex-direction: column; gap: 8px; padding-top: 6px; }
    .n { width: 100%; text-align: start; display: flex; gap: 12px; align-items: flex-start; padding: 12px; border-radius: var(--eayni-radius); background: var(--eayni-surface); border: 1px solid var(--eayni-border); font: inherit; color: var(--eayni-text); cursor: pointer; }
    .n.unread { border-color: color-mix(in srgb, var(--ion-color-primary) 40%, var(--eayni-border)); background: color-mix(in srgb, var(--ion-color-primary) 5%, var(--eayni-surface)); }
    .n__icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent); color: var(--ion-color-primary); font-size: 20px; flex: none; }
    .n__body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: 14px; }
    .n__body span { color: var(--eayni-text-2); line-height: 1.45; }
    .n img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
  `],
})
export class NotificationsPage implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(AccountApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(true);
  readonly hasMore = signal(false);
  private page = 1;

  ngOnInit(): void { void this.reload(); }

  async reload(ev?: CustomEvent): Promise<void> {
    this.page = 1;
    try {
      const res = await this.api.notifications(1);
      this.items.set(res.items);
      this.hasMore.set(res.hasMore && res.totalPages != null);
    } catch (e) { if (!ev) await this.toast.error(e); }
    finally { this.loading.set(false); (ev?.target as HTMLIonRefresherElement | undefined)?.complete(); }
  }

  async more(ev: CustomEvent): Promise<void> {
    try {
      const res = await this.api.notifications(++this.page);
      this.items.update((l) => [...l, ...res.items.filter((n) => !l.some((x) => x.id === n.id))]);
      this.hasMore.set(res.hasMore && res.totalPages != null && this.page < res.totalPages);
    } catch { this.hasMore.set(false); }
    finally { (ev.target as HTMLIonInfiniteScrollElement).complete(); }
  }

  iconFor(n: AppNotification): string {
    const t = `${n.type ?? ''} ${n.title}`.toLowerCase();
    if (/driver|سائق/.test(t)) return 'car-outline';
    if (/complet|اكتمل|done/.test(t)) return 'ribbon-outline';
    if (/point|نقاط|reward|مكاف/.test(t)) return 'gift-outline';
    if (/campaign|حملة|ad/.test(t)) return 'megaphone-outline';
    if (/order|طلب/.test(t)) return 'cube-outline';
    return 'notifications-outline';
  }

  open(n: AppNotification): void {
    if (n.orderId) void this.router.navigateByUrl(`/orders/${n.orderId}`);
  }
}
