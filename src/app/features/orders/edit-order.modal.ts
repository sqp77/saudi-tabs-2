import { Component, OnInit, inject, input, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { OrderApi } from '../../core/api/order-api.service';
import { PublicApi } from '../../core/api/public-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { ItemCategory, ItemOption, Order } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { toApiLocation } from '../../core/utils/normalize';
import { normalizeLocalPhone, toApiPhone, isValidMobile } from '../../core/utils/phone';
import { environment } from '../../../environments/environment';

interface EditItem { categoryId: string; name: string; nameAr: string; nameEn: string; quantity: number }

/** Edits an active order through PUT /order/:id (items, phone, address). */
@Component({
  selector: 'app-edit-order-modal',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonSpinner, TPipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ 'orders.edit.title' | t }}</ion-title>
        <ion-buttons slot="end"><ion-button (click)="close()"><ion-icon slot="icon-only" name="close"></ion-icon></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h4>{{ 'donate.review.items' | t }}</h4>
      @for (it of items(); track $index; let i = $index) {
        <div class="row">
          <select class="eayni-input" [value]="it.categoryId" (change)="setCat(i, $any($event.target).value)">
            @for (c of categories(); track c.id) { <option [value]="c.id">{{ i18n.lang() === 'ar' ? (c.nameAr || c.name) : (c.nameEn || c.name) }}</option> }
          </select>
          <select class="eayni-input" [value]="optionIdFor(it)" (change)="setOption(i, $any($event.target).value)">
            <option value="">{{ 'donate.categories.noteHint' | t }}</option>
            @for (o of optionsFor(it.categoryId); track o.id) { <option [value]="o.id">{{ i18n.lang() === 'ar' ? (o.nameAr || o.name) : (o.nameEn || o.name) }}</option> }
          </select>
          <input class="eayni-input" [value]="it.name" (input)="setName(i, $any($event.target).value)" [placeholder]="'donate.categories.noteHint' | t" />
          <div class="qty">
            <button type="button" (click)="setQty(i, -1)"><ion-icon name="remove"></ion-icon></button>
            <span>{{ it.quantity }}</span>
            <button type="button" (click)="setQty(i, 1)"><ion-icon name="add"></ion-icon></button>
            <button type="button" class="del" (click)="remove(i)"><ion-icon name="trash-outline"></ion-icon></button>
          </div>
        </div>
      }
      <ion-button fill="clear" size="small" (click)="add()"><ion-icon slot="start" name="add-circle-outline"></ion-icon>{{ 'common.items' | t }}</ion-button>

      <div class="eayni-field">
        <label>{{ 'donate.details.phone' | t }}</label>
        <input class="eayni-input" type="tel" dir="ltr" [value]="phone()" (input)="phone.set($any($event.target).value)" />
      </div>
      <div class="eayni-field">
        <label>{{ 'donate.location.address' | t }}</label>
        <input class="eayni-input" [value]="address()" (input)="address.set($any($event.target).value)" />
      </div>
      <div class="eayni-field">
        <label>{{ 'donate.location.address2' | t }}</label>
        <input class="eayni-input" [value]="address2()" (input)="address2.set($any($event.target).value)" />
      </div>

      <ion-button expand="block" class="eayni-btn" (click)="save()" [disabled]="busy() || !items().length">
        @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ 'common.save' | t }} }
      </ion-button>
    </ion-content>
  `,
  styles: [`
    h4 { margin: 4px 0 10px; font-weight: 800; }
    .row { display: grid; grid-template-columns: 1fr; gap: 8px; padding: 12px; border: 1px solid var(--eayni-border); border-radius: var(--eayni-radius-sm); margin-bottom: 10px; background: var(--eayni-surface); }
    .qty { display: flex; align-items: center; gap: 8px; }
    .qty button { width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--eayni-surface-2); color: var(--ion-color-primary); display: grid; place-items: center; font-size: 18px; }
    .qty span { min-width: 30px; text-align: center; font-weight: 800; }
    .qty .del { margin-inline-start: auto; color: var(--ion-color-danger); }
  `],
})
export class EditOrderModalComponent implements OnInit {
  readonly order = input.required<Order>();
  readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);
  private readonly publicApi = inject(PublicApi);
  private readonly modal = inject(ModalController);
  private readonly toast = inject(ToastService);

  readonly categories = signal<ItemCategory[]>([]);
  readonly items = signal<EditItem[]>([]);
  readonly phone = signal('');
  readonly address = signal('');
  readonly address2 = signal('');
  readonly busy = signal(false);

  async ngOnInit(): Promise<void> {
    const o = this.order();
    this.items.set(o.items.map((it) => ({ categoryId: it.categoryId ?? '', name: it.nameAr || it.nameEn || it.name, nameAr: it.nameAr ?? it.name, nameEn: it.nameEn ?? it.name, quantity: it.quantity })));
    this.phone.set(o.phone ?? '');
    this.address.set(o.address ?? '');
    this.address2.set(o.address2 ?? '');
    try { this.categories.set(await this.publicApi.categories()); } catch { /* ignore */ }
  }

  setCat(i: number, id: string): void { this.items.update((l) => l.map((it, k) => (k === i ? { ...it, categoryId: id } : it))); }
  optionsFor(categoryId: string): ItemOption[] { return this.categories().find((c) => c.id === categoryId)?.items ?? []; }
  optionIdFor(it: EditItem): string { return this.optionsFor(it.categoryId).find((o) => o.nameAr === it.nameAr || o.nameEn === it.nameEn)?.id ?? ''; }
  setOption(i: number, optionId: string): void {
    const it = this.items()[i];
    const o = this.optionsFor(it?.categoryId ?? '').find((x) => x.id === optionId);
    if (o) this.items.update((l) => l.map((x, k) => (k === i ? { ...x, name: (this.i18n.lang() === 'ar' ? o.nameAr : o.nameEn) || o.name, nameAr: o.nameAr ?? o.name, nameEn: o.nameEn ?? o.name } : x)));
  }
  setName(i: number, name: string): void { this.items.update((l) => l.map((it, k) => (k === i ? { ...it, name, nameAr: name, nameEn: name } : it))); }
  setQty(i: number, d: number): void { this.items.update((l) => l.map((it, k) => (k === i ? { ...it, quantity: Math.max(1, it.quantity + d) } : it))); }
  remove(i: number): void { this.items.update((l) => l.filter((_, k) => k !== i)); }
  add(): void { const c = this.categories()[0]; this.items.update((l) => [...l, { categoryId: c?.id ?? '', name: '', nameAr: '', nameEn: '', quantity: 1 }]); }
  close(): void { void this.modal.dismiss(); }

  async save(): Promise<void> {
    const o = this.order();
    const phone = toApiPhone(normalizeLocalPhone(this.phone(), environment.defaultCountryCode));
    if (!isValidMobile(phone)) { await this.toast.show(this.i18n.t('auth.phone.invalid'), 'warning'); return; }
    this.busy.set(true);
    try {
      const updated = await this.api.update(o.id, {
        region: o.regionId, city: o.cityId,
        location: o.location ? toApiLocation(o.location) : undefined,
        items: this.items().filter((it) => it.categoryId).map((it) => ({ category: it.categoryId, item_name: it.name || undefined, item_name_ar: it.nameAr || it.name, item_name_en: it.nameEn || it.name, quantity: it.quantity })),
        address: this.address() || undefined, address2: this.address2() || undefined, phone, images: o.images,
      });
      const merged: Order = updated.id ? updated : { ...o, phone, address: this.address(), address2: this.address2(), items: this.items().map((it) => ({ categoryId: it.categoryId, name: it.name, nameAr: it.nameAr, nameEn: it.nameEn, quantity: it.quantity, raw: null })) };
      await this.modal.dismiss(merged);
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
