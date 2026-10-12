import { Component, computed, inject, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TPipe } from '../../../core/i18n/t.pipe';
import type { Order } from '../../../core/models';
import { itemsOf } from '../../../core/services/impact.service';
import { StatusChipComponent } from '../status-chip/status-chip.component';

@Component({
  selector: 'app-order-card',
  imports: [IonIcon, TPipe, StatusChipComponent],
  template: `
    <button class="card" (click)="open.emit(order())" type="button">
      <div class="card__thumb">
        @if (order().images[0]) {
          <img [src]="order().images[0]" alt="" loading="lazy" />
        } @else {
          <ion-icon name="shirt-outline"></ion-icon>
        }
      </div>
      <div class="card__body">
        <div class="card__row">
          <span class="card__code">{{ 'orders.code' | t }} #{{ order().code || shortId() }}</span>
          <app-status-chip [status]="order().status"></app-status-chip>
        </div>
        <div class="card__items">{{ itemsSummary() }}</div>
        <div class="card__meta">
          <ion-icon name="time-outline"></ion-icon>
          <span>{{ i18n.relativeTime(order().createdAt) || i18n.formatDate(order().createdAt) }}</span>
          <span class="dot">•</span>
          <span>{{ 'orders.items' | t: { count: i18n.formatNumber(count()) } }}</span>
        </div>
      </div>
      <ion-icon class="card__chev" [name]="i18n.isRtl() ? 'chevron-back' : 'chevron-forward'"></ion-icon>
    </button>
  `,
  styles: [`
    .card { width: 100%; text-align: start; display: grid; grid-template-columns: 56px 1fr 20px; align-items: center; gap: 12px; padding: 12px; background: var(--eayni-surface); border: 1px solid var(--eayni-border); border-radius: var(--eayni-radius); color: inherit; font: inherit; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease; }
    .card:active { transform: scale(.985); }
    .card__thumb { width: 56px; height: 56px; border-radius: 14px; overflow: hidden; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-primary) 10%, transparent); color: var(--ion-color-primary); font-size: 24px; }
    .card__thumb img { width: 100%; height: 100%; object-fit: cover; }
    .card__body { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .card__row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .card__code { font-weight: 700; font-size: 13px; color: var(--eayni-text-2); }
    .card__items { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card__meta { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--eayni-text-3); }
    .dot { opacity: .6; }
    .card__chev { color: var(--eayni-text-3); }
  `],
})
export class OrderCardComponent {
  readonly i18n = inject(I18nService);
  readonly order = input.required<Order>();
  readonly open = output<Order>();

  readonly count = computed(() => itemsOf(this.order()));
  readonly shortId = computed(() => this.order().id.slice(-6).toUpperCase());
  readonly itemsSummary = computed(() => {
    const lang = this.i18n.lang();
    const names = this.order().items.map((it) => (lang === 'ar' ? it.nameAr || it.categoryName || it.name : it.nameEn || it.categoryName || it.name) || it.categoryName || '').filter(Boolean);
    const uniq = [...new Set(names)];
    return uniq.slice(0, 3).join(lang === 'ar' ? '، ' : ', ') + (uniq.length > 3 ? ' …' : '');
  });
}
