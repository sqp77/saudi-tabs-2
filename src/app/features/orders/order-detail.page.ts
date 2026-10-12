import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { OrderApi } from '../../core/api/order-api.service';
import { PublicApi } from '../../core/api/public-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { Order } from '../../core/models';
import { itemsOf } from '../../core/services/impact.service';
import { OrdersStore } from '../../core/services/orders.store';
import { ToastService } from '../../core/services/toast.service';
import { stageOf } from '../../core/utils/order-status';
import { MapComponent } from '../../shared/components/map/map.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StageTimelineComponent } from '../../shared/components/stage-timeline/stage-timeline.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { RateModalComponent } from './rate.modal';
import { EditOrderModalComponent } from './edit-order.modal';

@Component({
  selector: 'app-order-detail',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, TPipe, MapComponent, StageTimelineComponent, StatusChipComponent, SkeletonComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/orders" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'orders.detail.title' | t }}</ion-title>
        @if (order(); as o) {
          <ion-buttons slot="end"><ion-button (click)="go('/donate', { from: o.id })" [attr.aria-label]="'orders.detail.redonate' | t"><ion-icon slot="icon-only" name="repeat-outline"></ion-icon></ion-button></ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="eayni-page">
        @if (!order()) {
          @if (loading()) { <app-skeleton [count]="4" [height]="120"></app-skeleton> }
          @else { <div class="eayni-note"><ion-icon name="alert-circle-outline"></ion-icon><span>{{ 'orders.detail.notFound' | t }}</span></div> }
        } @else {
          @let o = order()!;
          <header class="head eayni-fade-up">
            <div>
              <div class="code">{{ 'orders.code' | t }} #{{ o.code || o.id.slice(-6).toUpperCase() }}</div>
              <div class="date eayni-small eayni-muted">{{ 'orders.createdAt' | t }}: {{ i18n.formatDate(o.createdAt) }}</div>
            </div>
            <app-status-chip [status]="o.status"></app-status-chip>
          </header>

          @if (info().active) {
            <div class="eayni-note eayni-note--info contact48"><ion-icon name="call-outline"></ion-icon><span>{{ 'orders.contact48' | t }}</span></div>
          }

          <section class="eayni-card">
            <h3>{{ 'orders.detail.timeline' | t }}</h3>
            <app-stage-timeline [status]="o.status" [history]="o.history"></app-stage-timeline>
            @if (info().inferred && o.status) {
              <p class="raw eayni-small eayni-muted"><ion-icon name="code-slash-outline"></ion-icon> {{ 'orders.detail.rawStatus' | t }}: <code>{{ o.status }}</code></p>
            }
          </section>

          @if (o.driver; as d) {
            <section class="eayni-card driver">
              <h3>{{ 'orders.detail.driver' | t }}</h3>
              <div class="driver__row">
                <div class="avatar">@if (d.avatar) { <img [src]="d.avatar" alt="" /> } @else { <ion-icon name="person"></ion-icon> }</div>
                <div class="driver__info">
                  <strong>{{ d.name || ('common.unknown' | t) }}</strong>
                  @if (d.vehicle || d.plate) { <span class="eayni-small eayni-muted">{{ d.vehicle }} {{ d.plate }}</span> }
                </div>
                @if (d.phone) { <a class="callbtn" [href]="'tel:' + d.phone" [attr.aria-label]="'common.call' | t"><ion-icon name="call"></ion-icon></a> }
              </div>
            </section>
          }

          <section class="eayni-card">
            <h3>{{ 'orders.detail.items' | t }} <span class="count">{{ 'orders.items' | t: { count: i18n.formatNumber(itemsCount()) } }}</span></h3>
            <ul class="items">
              @for (it of o.items; track $index) {
                <li><span>{{ itemLabel(it) }}</span><strong>×{{ i18n.formatNumber(it.quantity) }}</strong></li>
              }
            </ul>
            @if (o.weight !== undefined) { <p class="eayni-small eayni-muted">{{ 'common.measured' | t }}: {{ i18n.formatNumber(o.weight) }} kg</p> }
          </section>

          <section class="eayni-card">
            <h3>{{ 'orders.detail.pickup' | t }}</h3>
            @if (o.location; as loc) {
              <div class="map"><app-map [center]="loc" [zoom]="15" [interactive]="false" [markers]="[{ id: 'p', position: loc, kind: 'pickup' }]"></app-map></div>
            }
            <p>{{ [o.cityName, o.regionName].join(', ') }}</p>
            @if (o.address) { <p class="eayni-muted">{{ o.address }}@if (o.address2) { · {{ o.address2 }}}</p> }
            @if (o.phone) { <p class="eayni-small"><ion-icon name="call-outline"></ion-icon> <span dir="ltr">{{ o.phone }}</span></p> }
          </section>

          @if (o.images.length) {
            <section class="eayni-card">
              <h3>{{ 'orders.detail.photos' | t }}</h3>
              <div class="photos">@for (u of o.images; track u) { <a [href]="u" target="_blank" rel="noopener"><img [src]="u" alt="" loading="lazy" /></a> }</div>
            </section>
          }

          @if (info().active) {
            <section class="eayni-card prep">
              <h3><ion-icon name="bulb-outline"></ion-icon> {{ 'track.prepare.title' | t }}</h3>
              <ol>
                <li>{{ 'track.prepare.1' | t }}</li><li>{{ 'track.prepare.2' | t }}</li><li>{{ 'track.prepare.3' | t }}</li><li>{{ 'track.prepare.4' | t }}</li>
              </ol>
            </section>
          }

          @if (o.rating) {
            <section class="eayni-card">
              <h3>{{ 'orders.detail.rate' | t }}</h3>
              <div class="stars">@for (s of [1,2,3,4,5]; track s) { <ion-icon [name]="s <= o.rating!.stars ? 'star' : 'star-outline'"></ion-icon> }</div>
              @if (o.rating.review) { <p class="eayni-muted">{{ o.rating.review }}</p> }
            </section>
          }

          <section class="actions">
            @if (chatEnabled) { <ion-button expand="block" class="eayni-btn-ghost" (click)="go('/orders/' + o.id + '/chat')"><ion-icon slot="start" name="chatbubbles-outline"></ion-icon>{{ 'orders.detail.chat' | t }}</ion-button> }
            @if (info().stage === 'completed') {
              @if (!o.rating) { <ion-button expand="block" class="eayni-btn-ghost" (click)="rate()"><ion-icon slot="start" name="star-outline"></ion-icon>{{ 'orders.detail.rate' | t }}</ion-button> }
              <ion-button expand="block" class="eayni-btn-ghost" (click)="go('/orders/' + o.id + '/receipt')"><ion-icon slot="start" name="receipt-outline"></ion-icon>{{ 'orders.detail.receipt' | t }}</ion-button>
            }
            @if (info().active) {
              <ion-button expand="block" class="eayni-btn-ghost" (click)="edit()"><ion-icon slot="start" name="create-outline"></ion-icon>{{ 'orders.detail.edit' | t }}</ion-button>
              <ion-button expand="block" fill="clear" color="danger" class="eayni-btn" (click)="cancel()"><ion-icon slot="start" name="close-circle-outline"></ion-icon>{{ 'orders.detail.cancel' | t }}</ion-button>
            }
            <ion-button expand="block" fill="clear" class="eayni-btn" (click)="go('/donate', { from: o.id })"><ion-icon slot="start" name="repeat-outline"></ion-icon>{{ 'orders.detail.redonate' | t }}</ion-button>
          </section>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .contact48 { margin-bottom: 12px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 6px 0 14px; }
    .code { font-weight: 900; font-size: 18px; }
    h3 { margin: 0 0 12px; font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 6px; }
    .count { margin-inline-start: auto; font-size: 12px; font-weight: 600; color: var(--eayni-text-2); }
    .raw { margin: 8px 0 0; display: flex; align-items: center; gap: 6px; } code { font-size: 11px; background: var(--eayni-surface-2); padding: 2px 6px; border-radius: 6px; direction: ltr; }
    .items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .items li { display: flex; justify-content: space-between; font-size: 14px; }
    .map { height: 150px; border-radius: var(--eayni-radius-sm); overflow: hidden; margin-bottom: 10px; }
    p { margin: 4px 0; font-size: 14px; }
    .photos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; }
    .driver__row { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background: var(--eayni-surface-2); display: grid; place-items: center; font-size: 24px; color: var(--eayni-text-3); }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .driver__info { flex: 1; display: flex; flex-direction: column; }
    .callbtn { width: 44px; height: 44px; border-radius: 50%; background: var(--ion-color-primary); color: #fff; display: grid; place-items: center; font-size: 20px; }
    .prep ol { margin: 0; padding-inline-start: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; color: var(--eayni-text-2); }
    .stars { display: flex; gap: 4px; color: var(--ion-color-warning); font-size: 22px; }
    .actions { display: flex; flex-direction: column; gap: 8px; margin: 16px 0 8px; }
  `],
})
export class OrderDetailPage implements OnInit {
  readonly id = input.required<string>();
  readonly i18n = inject(I18nService);
  private readonly store = inject(OrdersStore);
  private readonly api = inject(OrderApi);
  private readonly publicApi = inject(PublicApi);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);
  private readonly modals = inject(ModalController);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly chatEnabled = environment.features.chat;
  readonly order = computed<Order | undefined>(() => this.store.byId(this.id()));
  readonly info = computed(() => stageOf(this.order()?.status));
  readonly itemsCount = computed(() => (this.order() ? itemsOf(this.order()!) : 0));

  async ngOnInit(): Promise<void> {
    if (!this.store.loaded()) await this.store.refresh().catch((e) => this.toast.error(e));
    if (!this.order()) await this.store.refreshCheck();
    this.loading.set(false);
  }

  itemLabel(it: Order['items'][number]): string {
    const n = this.i18n.lang() === 'ar' ? it.nameAr || it.name : it.nameEn || it.name;
    return it.categoryName && n && it.categoryName !== n ? `${it.categoryName} — ${n}` : n || it.categoryName || '';
  }

  go(url: string, query?: Record<string, string>): void { void this.router.navigate([url], { queryParams: query }); }

  async rate(): Promise<void> {
    const o = this.order();
    if (!o) return;
    const m = await this.modals.create({ component: RateModalComponent, componentProps: { order: o }, breakpoints: [0, 0.75, 1], initialBreakpoint: 0.75, cssClass: 'eayni-sheet' });
    await m.present();
    const { data } = await m.onWillDismiss<{ stars: number; review: string }>();
    if (data) {
      this.store.patch(o.id, { rating: data });
      await this.toast.success('orders.rate.done');
    }
  }

  async edit(): Promise<void> {
    const o = this.order();
    if (!o) return;
    const m = await this.modals.create({ component: EditOrderModalComponent, componentProps: { order: o }, cssClass: 'eayni-sheet' });
    await m.present();
    const { data } = await m.onWillDismiss<Order>();
    if (data) {
      this.store.upsert({ ...o, ...data, id: o.id });
      await this.toast.success('orders.edit.done');
    }
  }

  async cancel(): Promise<void> {
    const o = this.order();
    if (!o) return;
    let reasons: { id: string; text: string }[] = [];
    try { reasons = await this.publicApi.cancellationReasons(); } catch { /* fall back to free text */ }
    const alert = await this.alerts.create({
      header: this.i18n.t('orders.cancel.title'),
      subHeader: this.i18n.t('orders.cancel.subtitle'),
      inputs: reasons.length
        ? [...reasons.map((r, i) => ({ type: 'radio' as const, label: r.text, value: r.text, checked: i === 0 })), { type: 'radio' as const, label: this.i18n.t('orders.cancel.other'), value: '__other' }]
        : [{ type: 'textarea' as const, name: 'reason', placeholder: this.i18n.t('orders.cancel.reason') }],
      buttons: [
        { text: this.i18n.t('common.back'), role: 'cancel' },
        {
          text: this.i18n.t('orders.cancel.confirm'), role: 'destructive',
          handler: async (value: string | { reason: string }) => {
            let reason = typeof value === 'string' ? value : value?.reason ?? '';
            if (reason === '__other') {
              const other = await this.alerts.create({ header: this.i18n.t('orders.cancel.other'), inputs: [{ type: 'textarea', name: 'reason' }], buttons: [{ text: this.i18n.t('common.cancel'), role: 'cancel' }, { text: this.i18n.t('common.confirm'), role: 'confirm' }] });
              await other.present();
              const r = await other.onWillDismiss<{ values: { reason: string } }>();
              if (r.role !== 'confirm') return;
              reason = r.data?.values?.reason ?? '';
            }
            await this.doCancel(o, reason);
          },
        },
      ],
    });
    await alert.present();
  }

  private async doCancel(o: Order, reason: string): Promise<void> {
    try {
      await this.api.cancel(o.id, reason || '-');
      await this.store.refresh({ silent: true }).catch(() => undefined);
      if (this.store.byId(o.id) && stageOf(this.store.byId(o.id)!.status).active) this.store.patch(o.id, { status: 'order.client.cancelled', cancelReason: reason });
      await this.toast.success('orders.cancel.done');
      void this.router.navigateByUrl('/tabs/orders');
    } catch (e) {
      await this.toast.error(e);
    }
  }
}
