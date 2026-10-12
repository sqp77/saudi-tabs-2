import {
  AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, input, output, signal, untracked, viewChild,
} from '@angular/core';
import { IonIcon } from '@ionic/angular';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';
import type { LatLng } from '../../../core/models';
import { I18nService } from '../../../core/i18n/i18n.service';

export type MarkerKind = 'pickup' | 'driver' | 'user' | 'container' | 'selected';

export interface MapMarker {
  id: string;
  position: LatLng;
  kind: MarkerKind;
  label?: string;
  /** Bearing in degrees for the driver marker. */
  heading?: number;
}

/**
 * Leaflet wrapper. Tiles come from `environment.mapTiles` (OpenStreetMap by
 * default; switch to a commercial/tile-server URL for production volumes).
 *
 * `pinMode` renders a fixed center pin and emits `centerChange` while the user
 * drags the map (Uber-style location picking).
 */
@Component({
  selector: 'app-map',
  imports: [IonIcon],
  template: `
    <div class="map" #mapEl></div>
    @if (pinMode()) {
      <div class="pin" [class.lifted]="dragging()" aria-hidden="true">
        <div class="pin__head"><ion-icon name="location"></ion-icon></div>
        <div class="pin__stem"></div>
        <div class="pin__shadow"></div>
      </div>
    }
    <ng-content></ng-content>
  `,
  styles: [`
    :host { display: block; position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--eayni-surface-2); }
    .map { position: absolute; inset: 0; z-index: 0; }
    .pin { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -100%); z-index: 400; pointer-events: none; display: flex; flex-direction: column; align-items: center; transition: transform .18s ease; }
    .pin.lifted { transform: translate(-50%, -118%); }
    .pin__head { width: 44px; height: 44px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: var(--ion-color-primary); box-shadow: 0 10px 24px rgba(0,0,0,.28); display: grid; place-items: center; }
    .pin__head ion-icon { transform: rotate(45deg); color: #fff; font-size: 22px; }
    .pin__stem { width: 3px; height: 10px; background: var(--ion-color-primary); margin-top: -2px; }
    .pin__shadow { width: 14px; height: 6px; border-radius: 50%; background: rgba(0,0,0,.25); margin-top: 2px; transition: transform .18s ease, opacity .18s ease; }
    .pin.lifted .pin__shadow { transform: scale(1.4); opacity: .5; }
  `],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  readonly center = input<LatLng>(environment.defaultMapCenter);
  readonly zoom = input<number>(14);
  readonly markers = input<MapMarker[]>([]);
  readonly pinMode = input<boolean>(false);
  readonly interactive = input<boolean>(true);
  readonly fitMarkers = input<boolean>(false);
  readonly polyline = input<LatLng[] | null>(null);
  /** Filled coverage areas (outer rings). */
  readonly polygons = input<LatLng[][]>([]);

  readonly centerChange = output<LatLng>();
  readonly markerClick = output<MapMarker>();
  readonly ready = output<void>();

  readonly dragging = signal(false);

  private map?: L.Map;
  private layer = L.layerGroup();
  private markerRefs = new Map<string, L.Marker>();
  private line?: L.Polyline;
  private polys: L.Polygon[] = [];
  private resizeObs?: ResizeObserver;

  constructor() {
    effect(() => {
      const c = this.center();
      untracked(() => {
        if (!this.map) return;
        const cur = this.map.getCenter();
        if (Math.abs(cur.lat - c.lat) > 1e-6 || Math.abs(cur.lng - c.lng) > 1e-6) this.map.setView([c.lat, c.lng], this.map.getZoom(), { animate: true });
      });
    });
    effect(() => {
      const ms = this.markers();
      const fit = this.fitMarkers();
      untracked(() => this.renderMarkers(ms, fit));
    });
    effect(() => {
      const pts = this.polyline();
      untracked(() => this.renderLine(pts));
    });
    effect(() => {
      const rings = this.polygons();
      untracked(() => this.renderPolygons(rings));
    });
  }

  ngAfterViewInit(): void {
    const el = this.mapEl().nativeElement;
    const c = this.center();
    this.map = L.map(el, {
      center: [c.lat, c.lng],
      zoom: this.zoom(),
      zoomControl: false,
      attributionControl: true,
      dragging: this.interactive(),
      scrollWheelZoom: this.interactive(),
      touchZoom: this.interactive(),
      doubleClickZoom: this.interactive(),
      boxZoom: false,
      keyboard: this.interactive(),
      tap: this.interactive(),
    } as L.MapOptions);
    L.tileLayer(environment.mapTiles.url, { attribution: environment.mapTiles.attribution, maxZoom: environment.mapTiles.maxZoom }).addTo(this.map);
    this.layer.addTo(this.map);
    this.map.on('movestart', () => this.dragging.set(true));
    this.map.on('moveend', () => {
      this.dragging.set(false);
      if (this.pinMode()) {
        const ctr = this.map!.getCenter();
        this.centerChange.emit({ lat: ctr.lat, lng: ctr.lng });
      }
    });
    this.renderMarkers(this.markers(), this.fitMarkers());
    this.renderLine(this.polyline());
    this.renderPolygons(this.polygons());
    this.resizeObs = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObs.observe(el);
    setTimeout(() => { this.map?.invalidateSize(); this.ready.emit(); }, 80);
  }

  ngOnDestroy(): void {
    this.resizeObs?.disconnect();
    this.map?.remove();
    this.map = undefined;
  }

  invalidate(): void { this.map?.invalidateSize(); }

  flyTo(p: LatLng, zoom?: number): void {
    this.map?.flyTo([p.lat, p.lng], zoom ?? this.map.getZoom(), { duration: 0.6 });
  }

  fitAll(padding = 48): void {
    if (!this.map) return;
    const pts = [...this.markerRefs.values()].map((m) => m.getLatLng());
    if (pts.length === 0) return;
    if (pts.length === 1) { this.map.setView(pts[0], Math.max(this.map.getZoom(), 15)); return; }
    this.map.fitBounds(L.latLngBounds(pts), { padding: [padding, padding], maxZoom: 16 });
  }

  private renderMarkers(ms: MapMarker[], fit: boolean): void {
    if (!this.map) return;
    const keep = new Set<string>();
    for (const m of ms) {
      keep.add(m.id);
      const existing = this.markerRefs.get(m.id);
      if (existing) {
        animateMove(existing, m.position);
        existing.setIcon(this.icon(m));
      } else {
        const mk = L.marker([m.position.lat, m.position.lng], { icon: this.icon(m), keyboard: false, riseOnHover: true });
        mk.on('click', () => this.markerClick.emit(m));
        mk.addTo(this.layer);
        this.markerRefs.set(m.id, mk);
      }
    }
    for (const [id, mk] of this.markerRefs) if (!keep.has(id)) { this.layer.removeLayer(mk); this.markerRefs.delete(id); }
    if (fit && ms.length) this.fitAll();
  }

  private renderPolygons(rings: LatLng[][]): void {
    if (!this.map) return;
    for (const p of this.polys) this.layer.removeLayer(p);
    this.polys = rings.filter((r) => r.length >= 3).map((r) => L.polygon(r.map((p) => [p.lat, p.lng] as [number, number]), { color: '#0e7a4f', weight: 2, fillColor: '#1db47a', fillOpacity: 0.18 }).addTo(this.layer));
    if (this.polys.length && this.markerRefs.size === 0) this.map.fitBounds(L.featureGroup(this.polys).getBounds(), { padding: [32, 32], maxZoom: 15 });
  }

  fitPolygons(): void {
    if (this.map && this.polys.length) this.map.fitBounds(L.featureGroup(this.polys).getBounds(), { padding: [32, 32], maxZoom: 15 });
  }

  private renderLine(pts: LatLng[] | null): void {
    if (!this.map) return;
    if (this.line) { this.layer.removeLayer(this.line); this.line = undefined; }
    if (pts && pts.length > 1) {
      this.line = L.polyline(pts.map((p) => [p.lat, p.lng] as [number, number]), { color: '#0e7a4f', weight: 5, opacity: .85, lineCap: 'round', dashArray: '1 10' });
      this.line.addTo(this.layer);
    }
  }

  private icon(m: MapMarker): L.DivIcon {
    const label = m.label ? `<span class="mk__label">${escapeHtml(m.label)}</span>` : '';
    const rotate = m.heading != null ? `style="transform: rotate(${m.heading}deg)"` : '';
    const inner: Record<MarkerKind, string> = {
      pickup: `<div class="mk mk--pickup"><div class="mk__dot"><ion-icon name="home"></ion-icon></div>${label}</div>`,
      driver: `<div class="mk mk--driver"><div class="mk__dot" ${rotate}><ion-icon name="car"></ion-icon></div>${label}</div>`,
      user: `<div class="mk mk--user"><div class="mk__pulse"></div><div class="mk__dot"></div></div>`,
      container: `<div class="mk mk--container"><div class="mk__dot"><ion-icon name="trash-bin"></ion-icon></div>${label}</div>`,
      selected: `<div class="mk mk--selected"><div class="mk__dot"><ion-icon name="location"></ion-icon></div>${label}</div>`,
    };
    const size: Record<MarkerKind, [number, number]> = { pickup: [44, 44], driver: [48, 48], user: [28, 28], container: [38, 38], selected: [44, 44] };
    const [w, h] = size[m.kind];
    return L.divIcon({ html: inner[m.kind], className: `eayni-marker ${this.i18n.isRtl() ? 'rtl' : ''}`, iconSize: [w, h], iconAnchor: [w / 2, h / 2] });
  }
}

function animateMove(marker: L.Marker, to: LatLng, duration = 700): void {
  const from = marker.getLatLng();
  if (Math.abs(from.lat - to.lat) < 1e-7 && Math.abs(from.lng - to.lng) < 1e-7) return;
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    marker.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
