import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Share } from '@capacitor/share';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { itemsOf } from '../../core/services/impact.service';
import { OrdersStore } from '../../core/services/orders.store';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Digital donation receipt built strictly from the order the backend returned. */
@Component({
  selector: 'app-order-receipt',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, TPipe, SkeletonComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="'/orders/' + id()" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'orders.receipt.title' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="eayni-page">
        @if (loading()) { <app-skeleton [count]="1" [height]="360"></app-skeleton> }
        @else if (order(); as o) {
          <article class="receipt eayni-fade-up">
            <div class="receipt__top">
              <div class="logo"><ion-icon name="leaf"></ion-icon></div>
              <div class="brand">{{ 'app.name' | t }}</div>
              <h1>{{ 'orders.receipt.title' | t }}</h1>
              <p>{{ 'orders.receipt.subtitle' | t }}</p>
            </div>
            <dl>
              <div><dt>{{ 'orders.receipt.ref' | t }}</dt><dd dir="ltr">{{ o.code || o.id }}</dd></div>
              <div><dt>{{ 'orders.createdAt' | t }}</dt><dd>{{ i18n.formatDate(o.createdAt) }}</dd></div>
              @if (o.completedAt || o.updatedAt) { <div><dt>{{ 'orders.receipt.completedAt' | t }}</dt><dd>{{ i18n.formatDate(o.completedAt || o.updatedAt) }}</dd></div> }
              <div><dt>{{ 'orders.detail.pickup' | t }}</dt><dd>{{ [o.cityName, o.regionName].join(', ') }}</dd></div>
            </dl>
            <table>
              <thead><tr><th>{{ 'donate.review.items' | t }}</th><th>{{ 'donate.categories.qty' | t }}</th></tr></thead>
              <tbody>
                @for (it of o.items; track $index) { <tr><td>{{ it.categoryName || it.name }}@if (it.categoryName && it.name && it.categoryName !== it.name) { <small>{{ it.name }}</small> }</td><td>{{ i18n.formatNumber(it.quantity) }}</td></tr> }
              </tbody>
              <tfoot><tr><td>{{ 'orders.receipt.total' | t }}</td><td>{{ i18n.formatNumber(total()) }}</td></tr>
                @if (o.weight !== undefined) { <tr><td>{{ 'common.measured' | t }}</td><td>{{ i18n.formatNumber(o.weight) }} kg</td></tr> }
              </tfoot>
            </table>
            <p class="note">{{ 'orders.receipt.note' | t }}</p>
            <div class="stamp"><ion-icon name="checkmark-circle"></ion-icon>{{ 'track.stage.completed' | t }}</div>
          </article>
          <ion-button expand="block" class="eayni-btn" (click)="share()"><ion-icon slot="start" name="share-social-outline"></ion-icon>{{ 'common.share' | t }}</ion-button>
        } @else {
          <div class="eayni-note"><ion-icon name="alert-circle-outline"></ion-icon><span>{{ 'orders.detail.notFound' | t }}</span></div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .receipt { background: var(--eayni-surface); border: 1px solid var(--eayni-border); border-radius: 24px; padding: 24px 20px; margin: 8px 0 16px; position: relative; overflow: hidden; }
    .receipt::before { content: ''; position: absolute; inset-inline: 0; top: 0; height: 6px; background: linear-gradient(90deg, var(--ion-color-secondary), var(--ion-color-primary)); }
    .receipt__top { text-align: center; margin-bottom: 18px; }
    .logo { width: 54px; height: 54px; border-radius: 18px; margin: 0 auto 8px; display: grid; place-items: center; background: linear-gradient(135deg, var(--ion-color-secondary), var(--ion-color-primary)); color: #fff; font-size: 28px; }
    .brand { font-weight: 900; letter-spacing: .12em; font-size: 11px; color: var(--ion-color-primary); text-transform: uppercase; }
    h1 { margin: 4px 0; font-size: 22px; font-weight: 900; }
    .receipt__top p { margin: 0; color: var(--eayni-text-2); font-size: 13.5px; }
    dl { margin: 0 0 14px; display: flex; flex-direction: column; gap: 8px; border-top: 1px dashed var(--eayni-border); border-bottom: 1px dashed var(--eayni-border); padding: 12px 0; }
    dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 13.5px; }
    dt { color: var(--eayni-text-2); } dd { margin: 0; font-weight: 700; text-align: end; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: start; font-size: 12px; color: var(--eayni-text-2); padding: 6px 0; }
    td { padding: 8px 0; border-top: 1px solid var(--eayni-border); }
    td small { display: block; color: var(--eayni-text-3); font-size: 12px; }
    td:last-child, th:last-child { text-align: end; }
    tfoot td { font-weight: 800; }
    .note { font-size: 12px; color: var(--eayni-text-3); line-height: 1.5; margin: 14px 0; }
    .stamp { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: color-mix(in srgb, var(--ion-color-success) 14%, transparent); color: var(--ion-color-success); font-weight: 800; font-size: 13px; }
  `],
})
export class OrderReceiptPage implements OnInit {
  readonly id = input.required<string>();
  readonly loading = signal(true);
  readonly i18n = inject(I18nService);
  private readonly store = inject(OrdersStore);
  private readonly toast = inject(ToastService);
  readonly order = computed(() => this.store.byId(this.id()));
  readonly total = computed(() => (this.order() ? itemsOf(this.order()!) : 0));

  async ngOnInit(): Promise<void> {
    if (!this.store.loaded()) await this.store.refresh().catch((e) => this.toast.error(e));
    this.loading.set(false);
  }

  async share(): Promise<void> {
    const o = this.order();
    if (!o) return;
    const text = `${this.i18n.t('app.name')} — ${this.i18n.t('orders.receipt.title')}\n${this.i18n.t('orders.receipt.ref')}: ${o.code || o.id}\n${this.i18n.t('orders.receipt.total')}: ${this.total()}`;
    try {
      await Share.share({ title: this.i18n.t('orders.receipt.title'), text });
    } catch {
      try { await navigator.clipboard.writeText(text); await this.toast.success('common.copied'); } catch { /* ignore */ }
    }
  }
}
