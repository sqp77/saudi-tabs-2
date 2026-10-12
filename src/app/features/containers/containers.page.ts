import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ActionSheetController, IonBackButton, IonButtons, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { AccountApi } from '../../core/api/account-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { Container, ContainerAction, LatLng } from '../../core/models';
import { LocationService } from '../../core/services/location.service';
import { ToastService } from '../../core/services/toast.service';
import { pointInPolygon, polygonCentroid } from '../../core/utils/geo-polygon';
import { haversineKm } from '../../core/utils/geo';
import { MapComponent, MapMarker } from '../../shared/components/map/map.component';

/**
 * Recycling container services: GET /account/containers?lat&long returns
 * container types with an `allowedRegions` coverage polygon (no single pin).
 * Users inside a coverage zone can request a container, report maintenance
 * or mark it emptied via POST /account/containers/:id/:action.
 */
@Component({
  selector: 'app-containers',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonSpinner, TPipe, MapComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'containers.title' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <div class="wrap">
      <app-map class="map" [center]="center()" [zoom]="12" [markers]="markers()" [polygons]="polygons()" (markerClick)="select($event.id)">
        <button type="button" class="locate" (click)="locate()" [disabled]="locating()" [attr.aria-label]="'containers.locate' | t">
          @if (locating()) { <ion-spinner name="crescent"></ion-spinner> } @else { <ion-icon name="locate"></ion-icon> }
        </button>
      </app-map>
      <div class="sheet">
        <p class="eayni-small eayni-muted sub">{{ 'containers.subtitle' | t }}</p>
        @if (loading()) { <div class="row"><ion-spinner name="dots"></ion-spinner></div> }
        @else if (!containers().length) { <p class="empty">{{ 'containers.empty' | t }}</p> }
        @else {
          <div class="list">
            @for (c of containers(); track c.id) {
              <div class="item" [class.sel]="selected() === c.id" (click)="select(c.id)">
                <div class="item__icon">@if (c.image) { <img [src]="c.image" alt="" loading="lazy" /> } @else { <ion-icon name="trash-bin"></ion-icon> }</div>
                <div class="item__body">
                  <strong>{{ c.name || c.code || ('common.unknown' | t) }}</strong>
                  <span class="eayni-small eayni-muted">
                    @if (c.type) { {{ c.type }} · }
                    @if (covers(c)) { <span class="in">{{ 'containers.inZone' | t }}</span> } @else if (distance(c) !== null) { {{ 'containers.distance' | t: { km: i18n.formatNumber(distance(c)!, { maximumFractionDigits: 1 }) } }} } @else { {{ 'containers.outZone' | t }} }
                  </span>
                </div>
                <button type="button" class="act" (click)="report(c); $event.stopPropagation()" [attr.aria-label]="'containers.report' | t"><ion-icon name="hand-right-outline"></ion-icon></button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .wrap { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .map { flex: 1; min-height: 40%; position: relative; }
    .locate { position: absolute; bottom: 14px; inset-inline-end: 14px; width: 46px; height: 46px; border-radius: 50%; border: 0; background: var(--eayni-surface); color: var(--ion-color-primary); display: grid; place-items: center; font-size: 22px; box-shadow: var(--eayni-shadow); z-index: 500; }
    .sheet { max-height: 48%; overflow-y: auto; background: var(--eayni-bg); border-radius: 22px 22px 0 0; margin-top: -20px; z-index: 2; position: relative; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); box-shadow: 0 -10px 30px rgba(0,0,0,.08); }
    .sub { margin: 0 0 10px; }
    .row { display: grid; place-items: center; padding: 20px; }
    .empty { text-align: center; color: var(--eayni-text-2); padding: 20px; }
    .list { display: flex; flex-direction: column; gap: 8px; }
    .item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--eayni-radius-sm); background: var(--eayni-surface); border: 1px solid var(--eayni-border); cursor: pointer; }
    .item.sel { border-color: var(--ion-color-primary); }
    .item__icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-tertiary) 22%, transparent); color: var(--ion-color-tertiary-shade); font-size: 20px; flex: none; overflow: hidden; }
    .item__icon img { width: 100%; height: 100%; object-fit: cover; }
    .item__body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .in { color: var(--ion-color-success); font-weight: 700; }
    .act { width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--ion-color-primary); color: #fff; display: grid; place-items: center; font-size: 18px; }
  `],
})
export class ContainersPage implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(AccountApi);
  private readonly location = inject(LocationService);
  private readonly toast = inject(ToastService);
  private readonly sheets = inject(ActionSheetController);
  private readonly map = viewChild(MapComponent);

  readonly center = signal<LatLng>(environment.defaultMapCenter);
  readonly me = signal<LatLng | null>(null);
  readonly containers = signal<Container[]>([]);
  readonly loading = signal(true);
  readonly locating = signal(false);
  readonly selected = signal<string | null>(null);

  readonly polygons = computed<LatLng[][]>(() => {
    const sel = this.selected();
    const list = sel ? this.containers().filter((c) => c.id === sel) : this.containers();
    return list.flatMap((c) => c.polygons);
  });
  readonly markers = computed<MapMarker[]>(() => {
    const out: MapMarker[] = this.containers().filter((c) => c.location).map((c) => ({ id: c.id, position: c.location!, kind: this.selected() === c.id ? 'selected' : 'container', label: c.name || c.code }));
    const me = this.me();
    if (me) out.push({ id: 'me', position: me, kind: 'user' });
    return out;
  });

  async ngOnInit(): Promise<void> { await this.locate(); }

  async locate(): Promise<void> {
    this.locating.set(true);
    const p = (await this.location.current()) ?? this.location.last() ?? environment.defaultMapCenter;
    this.me.set(this.location.permission() === 'granted' ? p : null);
    this.center.set(p);
    this.locating.set(false);
    await this.load(p);
  }

  private async load(p: LatLng): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.containers(p.lat, p.lng);
      const list = res.items.filter((c) => c.active !== false).map((c) => ({ ...c, distanceKm: c.distanceKm ?? (c.location ? haversineKm(p, c.location) : c.polygons[0] ? haversineKm(p, polygonCentroid(c.polygons[0])) : undefined) }));
      this.containers.set(list.sort((a, b) => Number(this.covers(b)) - Number(this.covers(a)) || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)));
      // Focus the zone that covers the user when there is one; otherwise show every zone.
      const covering = this.containers().find((c) => this.covers(c));
      this.selected.set(covering?.id ?? null);
      setTimeout(() => this.map()?.fitPolygons(), 150);
    } catch (e) { await this.toast.error(e); }
    finally { this.loading.set(false); }
  }

  covers(c: Container): boolean {
    const me = this.me() ?? this.center();
    return c.polygons.some((ring) => pointInPolygon(me, ring));
  }
  distance(c: Container): number | null { return c.distanceKm ?? null; }

  select(id: string): void {
    this.selected.set(this.selected() === id ? null : id);
    setTimeout(() => this.map()?.fitPolygons(), 50);
  }

  async report(c: Container): Promise<void> {
    const sheet = await this.sheets.create({
      header: c.name || c.code,
      buttons: [
        { text: this.i18n.t('containers.action.requested'), icon: 'car-outline', data: 'requested' },
        { text: this.i18n.t('containers.action.maintenance'), icon: 'construct-outline', data: 'maintenance' },
        { text: this.i18n.t('containers.action.empty'), icon: 'checkmark-circle-outline', data: 'empty' },
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
    const { data } = await sheet.onWillDismiss<ContainerAction>();
    if (!data) return;
    try {
      await this.api.containerAction(c.id, data);
      await this.toast.success('containers.action.done');
    } catch (e) { await this.toast.error(e); }
  }
}
