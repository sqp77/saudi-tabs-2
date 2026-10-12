import type { LatLng } from '../models';

/** Ray-casting point-in-polygon on an outer ring. */
export function pointInPolygon(p: LatLng, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng, yi = ring[i].lat, xj = ring[j].lng, yj = ring[j].lat;
    const intersect = yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(ring: LatLng[]): LatLng {
  const n = ring.length || 1;
  return { lat: ring.reduce((s, p) => s + p.lat, 0) / n, lng: ring.reduce((s, p) => s + p.lng, 0) / n };
}
