import { Component, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  AlertController, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonSpinner, IonToolbar,
} from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { PublicApi } from '../../core/api/public-api.service';
import { OrderApi } from '../../core/api/order-api.service';
import { UploadApi } from '../../core/api/upload-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { City, ItemCategory, ItemOption, LatLng, RegionWithCities, SavedPlace } from '../../core/models';
import { DonationDraft, DraftItem, DraftService, emptyDraft } from '../../core/services/draft.service';
import { LocationService } from '../../core/services/location.service';
import { OrdersStore } from '../../core/services/orders.store';
import { SavedPlacesService } from '../../core/services/saved-places.service';
import { ToastService } from '../../core/services/toast.service';
import { compressImage } from '../../core/utils/image';
import { toApiLocation } from '../../core/utils/normalize';
import { isValidLatLng } from '../../core/utils/geo';
import { categoryIcon } from '../../core/utils/category-icon';
import { isValidMobile, normalizeLocalPhone, toApiPhone } from '../../core/utils/phone';
import { MapComponent } from '../../shared/components/map/map.component';

const MAX_PHOTOS = 5;
const STEPS = ['categories', 'details', 'location', 'review'] as const;

@Component({
  selector: 'app-donate',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonFooter, IonSpinner, TPipe, MapComponent],
  templateUrl: './donate.page.html',
  styleUrl: './donate.page.scss',
})
export class DonatePage implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly publicApi = inject(PublicApi);
  private readonly orderApi = inject(OrderApi);
  private readonly uploadApi = inject(UploadApi);
  private readonly auth = inject(AuthService);
  private readonly location = inject(LocationService);
  private readonly places = inject(SavedPlacesService);
  private readonly drafts = inject(DraftService);
  private readonly orders = inject(OrdersStore);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly map = viewChild(MapComponent);

  readonly steps = STEPS;
  readonly maxPhotos = MAX_PHOTOS;
  readonly step = signal(0);
  readonly draft = signal<DonationDraft>(emptyDraft());
  readonly categories = signal<ItemCategory[]>([]);
  readonly regions = signal<RegionWithCities[]>([]);
  readonly cities = signal<City[]>([]);
  readonly openGroup = signal<string | null>(null);
  readonly savedPlaces = this.places.places;
  readonly loadingCats = signal(true);
  readonly uploading = signal(0);
  readonly locating = signal(false);
  readonly resolving = signal(false);
  readonly submitting = signal(false);
  readonly restored = signal(false);
  readonly permissionDenied = signal(false);
  readonly mapCenter = signal<LatLng>(environment.defaultMapCenter);
  readonly uploadAvailable = this.uploadApi.available;
  readonly isNative = Capacitor.isNativePlatform();

  readonly selectedCount = computed(() => this.draft().items.length);
  readonly totalQty = computed(() => this.draft().items.reduce((s, i) => s + i.quantity, 0));
  /** Eco points published per unit by the backend (`reward`), summed over the draft. Shown as "expected". */
  readonly expectedReward = computed(() => this.draft().items.reduce((s, i) => s + (i.reward ?? 0) * i.quantity, 0));
  readonly phoneValid = computed(() => isValidMobile(normalizeLocalPhone(this.draft().phone, environment.defaultCountryCode)));
  readonly canNext = computed(() => {
    const d = this.draft();
    switch (this.step()) {
      case 0: return d.items.length > 0;
      case 1: return this.phoneValid() && this.uploading() === 0;
      case 2: return isValidLatLng(d.location) && !!d.regionId && !!d.cityId;
      default: return true;
    }
  });

  constructor() {
    // Persist the draft whenever it changes (debounced by the signal graph).
    effect(() => {
      const d = this.draft();
      const step = this.step();
      untracked(() => { if (d.items.length || d.images.length || d.location) void this.drafts.save({ ...d, step }); });
    });
  }

  async ngOnInit(): Promise<void> {
    void this.places.load();
    const qp = this.route.snapshot.queryParamMap;
    const fromOrder = qp.get('from');
    const preselect = qp.get('category');

    const [cats, regions] = await Promise.allSettled([this.publicApi.categories(), this.publicApi.regionsWithCities()]);
    if (cats.status === 'fulfilled') { this.categories.set(cats.value); this.openGroup.set(cats.value[0]?.id ?? null); }
    if (regions.status === 'fulfilled') this.regions.set(regions.value);
    this.loadingCats.set(false);

    const me = this.auth.user();
    const base = emptyDraft();
    base.phone = me?.phone ?? '';

    if (fromOrder) {
      const o = this.orders.byId(fromOrder);
      if (o) {
        base.items = o.items.map((it): DraftItem => {
          const group = this.categories().find((c) => c.id === it.categoryId);
          const opt = group?.items.find((x) => x.nameAr === it.nameAr || x.nameEn === it.nameEn || x.name === it.name);
          return { categoryId: it.categoryId ?? '', categoryName: group?.name ?? it.categoryName ?? '', itemId: opt?.id ?? '', itemNameAr: it.nameAr ?? it.name, itemNameEn: it.nameEn ?? it.name, reward: opt?.reward, quantity: it.quantity, note: '' };
        }).filter((i) => i.categoryId);
        base.location = o.location ?? null;
        base.address = o.address ?? '';
        base.address2 = o.address2 ?? '';
        base.regionId = o.regionId ?? '';
        base.regionName = o.regionName ?? '';
        base.cityId = o.cityId ?? '';
        base.cityName = o.cityName ?? '';
        base.phone = o.phone ?? base.phone;
        this.draft.set(base);
        if (base.regionId) void this.loadCities(base.regionId);
        if (base.location) this.mapCenter.set(base.location);
        return;
      }
    }

    const saved = await this.drafts.load();
    if (saved && (saved.items.length || saved.images.length) && Date.now() - Date.parse(saved.updatedAt) < 3 * 86_400_000) {
      this.draft.set({ ...base, ...saved });
      this.step.set(Math.min(saved.step ?? 0, STEPS.length - 1));
      this.restored.set(true);
      if (saved.regionId) void this.loadCities(saved.regionId);
      if (saved.location) this.mapCenter.set(saved.location);
      return;
    }

    if (preselect) {
      const c = this.categories().find((x) => x.id === preselect);
      if (c) this.openGroup.set(c.id);
    }
    this.draft.set(base);
  }

  // ---------------------------------------------------------------- helpers
  private patch(p: Partial<DonationDraft>): void { this.draft.update((d) => ({ ...d, ...p })); }
  iconFor(c: ItemCategory): string { return categoryIcon(c); }
  catName(c: { nameAr?: string; nameEn?: string; name: string }): string { return (this.i18n.lang() === 'ar' ? c.nameAr : c.nameEn) || c.name; }

  async discardDraft(): Promise<void> {
    await this.drafts.clear();
    const base = emptyDraft();
    base.phone = this.auth.user()?.phone ?? '';
    this.draft.set(base);
    this.step.set(0);
    this.restored.set(false);
  }

  // ------------------------------------------------------------ step 1 items
  isSelected(itemId: string): boolean { return this.draft().items.some((i) => i.itemId === itemId); }
  qtyOf(itemId: string): number { return this.draft().items.find((i) => i.itemId === itemId)?.quantity ?? 0; }
  noteOf(itemId: string): string { return this.draft().items.find((i) => i.itemId === itemId)?.note ?? ''; }
  selectedInGroup(groupId: string): number { return this.draft().items.filter((i) => i.categoryId === groupId).length; }
  toggleGroup(id: string): void { this.openGroup.set(this.openGroup() === id ? null : id); }
  optName(o: ItemOption): string { return (this.i18n.lang() === 'ar' ? o.nameAr : o.nameEn) || o.name; }

  toggle(group: ItemCategory, opt: ItemOption): void {
    if (this.isSelected(opt.id)) this.patch({ items: this.draft().items.filter((i) => i.itemId !== opt.id) });
    else this.patch({ items: [...this.draft().items, { categoryId: group.id, categoryName: group.name, itemId: opt.id, itemNameAr: opt.nameAr ?? opt.name, itemNameEn: opt.nameEn ?? opt.name, reward: opt.reward, quantity: 1, note: '' }] });
  }

  setQty(itemId: string, delta: number): void {
    this.patch({ items: this.draft().items.map((i) => (i.itemId === itemId ? { ...i, quantity: Math.max(1, Math.min(999, i.quantity + delta)) } : i)) });
  }

  setNote(itemId: string, note: string): void {
    this.patch({ items: this.draft().items.map((i) => (i.itemId === itemId ? { ...i, note } : i)) });
  }

  // ---------------------------------------------------------- step 2 details
  async pickPhotos(input?: HTMLInputElement): Promise<void> {
    if (this.draft().images.length >= MAX_PHOTOS) return;
    if (!this.uploadAvailable) { await this.toast.show(this.i18n.t('common.apiNotConfigured'), 'warning'); return; }
    if (this.isNative) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.Uri, source: CameraSource.Prompt, correctOrientation: true });
        if (photo.webPath) {
          const blob = await (await fetch(photo.webPath)).blob();
          await this.uploadBlobs([blob]);
        }
      } catch { /* user cancelled */ }
    } else {
      input?.click();
    }
  }

  async onFiles(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    await this.uploadBlobs(files);
  }

  private async uploadBlobs(blobs: Blob[]): Promise<void> {
    const room = MAX_PHOTOS - this.draft().images.length;
    const list = blobs.slice(0, Math.max(0, room));
    if (!list.length) return;
    this.uploading.update((n) => n + list.length);
    let failed = 0;
    await Promise.all(list.map(async (b, i) => {
      try {
        const compressed = await compressImage(b);
        const url = await this.uploadApi.upload(compressed, `photo-${Date.now()}-${i}.jpg`);
        this.patch({ images: [...this.draft().images, url] });
      } catch { failed += 1; }
      finally { this.uploading.update((n) => n - 1); }
    }));
    if (failed) await this.toast.show(this.i18n.t('donate.details.uploadFailed'), 'danger');
  }

  removePhoto(url: string): void { this.patch({ images: this.draft().images.filter((u) => u !== url) }); }
  setInstructions(v: string): void { this.patch({ instructions: v }); }
  setPhone(v: string): void { this.patch({ phone: v }); }

  // --------------------------------------------------------- step 3 location
  onMapReady(): void {
    const d = this.draft();
    if (!d.location) void this.detect();
  }

  onCenterChange(p: LatLng): void {
    this.patch({ location: p });
    void this.resolveAddress(p);
  }

  async detect(): Promise<void> {
    this.locating.set(true);
    const p = await this.location.current();
    this.locating.set(false);
    if (!p) { this.permissionDenied.set(this.location.permission() === 'denied'); return; }
    this.permissionDenied.set(false);
    this.mapCenter.set(p);
    this.map()?.flyTo(p, 16);
    this.patch({ location: p });
    void this.resolveAddress(p);
  }

  private resolveTimer?: ReturnType<typeof setTimeout>;
  private resolveAddress(p: LatLng): void {
    clearTimeout(this.resolveTimer);
    this.resolveTimer = setTimeout(async () => {
      this.resolving.set(true);
      const addr = await this.location.reverseGeocode(p);
      this.resolving.set(false);
      if (addr && !this.draft().address) this.patch({ address: addr });
    }, 500);
  }

  async setRegion(id: string): Promise<void> {
    const r = this.regions().find((x) => x.id === id);
    this.patch({ regionId: id, regionName: r?.name ?? '', cityId: '', cityName: '' });
    await this.loadCities(id);
  }

  private async loadCities(regionId: string): Promise<void> {
    if (!regionId) { this.cities.set([]); return; }
    const local = this.regions().find((r) => r.id === regionId)?.cities;
    if (local?.length) { this.cities.set(local); return; }
    try { this.cities.set(await this.publicApi.cities(regionId)); } catch { this.cities.set([]); }
  }

  regionName(r: RegionWithCities): string { return (this.i18n.lang() === 'ar' ? r.nameAr : r.nameEn) || r.name; }
  cityName(c: City): string { return (this.i18n.lang() === 'ar' ? c.nameAr : c.nameEn) || c.name; }

  setCity(id: string): void {
    const c = this.cities().find((x) => x.id === id);
    this.patch({ cityId: id, cityName: c?.name ?? '' });
  }

  setAddress(v: string): void { this.patch({ address: v }); }
  setAddress2(v: string): void { this.patch({ address2: v }); }

  usePlace(p: SavedPlace): void {
    this.patch({ location: p.location, address: p.address ?? '', address2: p.address2 ?? '', regionId: p.regionId ?? '', regionName: p.regionName ?? '', cityId: p.cityId ?? '', cityName: p.cityName ?? '' });
    this.mapCenter.set(p.location);
    this.map()?.flyTo(p.location, 16);
    if (p.regionId) void this.loadCities(p.regionId);
  }

  async savePlace(): Promise<void> {
    const d = this.draft();
    if (!d.location) return;
    const alert = await this.alerts.create({
      header: this.i18n.t('donate.location.saveAs'),
      inputs: [
        { type: 'radio', label: this.i18n.t('places.home'), value: 'home', checked: true },
        { type: 'radio', label: this.i18n.t('places.work'), value: 'work' },
        { type: 'radio', label: this.i18n.t('places.other'), value: 'other' },
      ],
      buttons: [
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('common.save'),
          handler: async (kind: 'home' | 'work' | 'other') => {
            await this.places.add({ kind, label: this.i18n.t(`places.${kind}`), location: d.location!, address: d.address, address2: d.address2, regionId: d.regionId || undefined, regionName: d.regionName, cityId: d.cityId || undefined, cityName: d.cityName });
            await this.toast.success('common.done');
          },
        },
      ],
    });
    await alert.present();
  }

  // ------------------------------------------------------------- navigation
  next(): void {
    if (!this.canNext()) { void this.showStepError(); return; }
    this.step.update((s) => Math.min(STEPS.length - 1, s + 1));
  }

  back(): void {
    if (this.step() === 0) { void this.router.navigateByUrl('/tabs/home'); return; }
    this.step.update((s) => Math.max(0, s - 1));
  }

  goTo(step: number): void { if (step < this.step()) this.step.set(step); }

  private async showStepError(): Promise<void> {
    const d = this.draft();
    const key = this.step() === 0 ? 'donate.error.noItems' : this.step() === 1 ? 'donate.error.noPhone' : !isValidLatLng(d.location) ? 'donate.error.noLocation' : 'donate.error.noCity';
    await this.toast.show(this.i18n.t(key), 'warning');
  }

  // ----------------------------------------------------------------- submit
  async submit(): Promise<void> {
    const d = this.draft();
    if (!isValidLatLng(d.location) || !d.regionId || !d.cityId || !d.items.length || this.submitting()) return;
    this.submitting.set(true);
    try {
      const order = await this.orderApi.submit({
        region: d.regionId,
        city: d.cityId,
        location: toApiLocation(d.location),
        items: d.items.map((i) => ({
          category: i.categoryId,
          item_name_ar: i.note ? `${i.itemNameAr} - ${i.note}` : i.itemNameAr,
          item_name_en: i.note ? `${i.itemNameEn} - ${i.note}` : i.itemNameEn,
          quantity: i.quantity,
        })),
        address: [d.address, d.instructions].filter(Boolean).join(' — ') || undefined,
        address2: d.address2 || undefined,
        images: d.images,
        phone: toApiPhone(normalizeLocalPhone(d.phone, environment.defaultCountryCode)),
      });
      await this.drafts.clear();
      if (order.id) this.orders.upsert(order);
      void this.orders.refresh({ silent: true });
      await this.router.navigate(['/donate/success', order.id || 'new'], { replaceUrl: true });
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.submitting.set(false);
    }
  }
}
