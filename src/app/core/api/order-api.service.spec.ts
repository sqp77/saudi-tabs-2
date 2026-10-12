import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OrderApi } from './order-api.service';
import { environment } from '../../../environments/environment';

describe('OrderApi', () => {
  let api: OrderApi;
  let http: HttpTestingController;

  beforeEach(() => {
    environment.clientApiUrl = 'https://api.test/';
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(OrderApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); environment.clientApiUrl = ''; });

  it('submits the documented order payload and normalizes the response', async () => {
    const p = api.submit({ region: 'r', city: 'c', location: [46.6, 24.7], items: [{ category: 'k', item_name_ar: 'أ', item_name_en: 'a', quantity: 2 }], phone: '0500000000', images: [] });
    const req = http.expectOne('https://api.test/order/submit');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.location).toEqual([46.6, 24.7]);
    req.flush({ data: { _id: 'new1', status: 'order.client.send', items: [] } });
    const o = await p;
    expect(o.id).toBe('new1');
    expect(o.status).toBe('order.client.send');
  });

  it('lists orders with a status filter and page', async () => {
    const p = api.list({ status: 'order.driver.completed', page: 2 });
    const req = http.expectOne((r) => r.url === 'https://api.test/order/');
    expect(req.request.params.get('status')).toBe('order.driver.completed');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: { docs: [{ _id: 'a', status: 'order.driver.completed' }], page: 2, totalPages: 2 } });
    const res = await p;
    expect(res.items[0].id).toBe('a');
    expect(res.hasMore).toBe(false);
  });

  it('sends geocode as a GeoJSON point [lng, lat]', async () => {
    const p = api.geocode({ lat: 24.7, lng: 46.6 });
    const req = http.expectOne('https://api.test/order/geo/address');
    expect(req.request.body).toEqual({ type: 'Point', coordinates: [46.6, 24.7] });
    req.flush({ data: { address: 'King Fahd Rd' } });
    expect((await p).address).toBe('King Fahd Rd');
  });

  it('cancels with a reason via DELETE body and rates with stars/review', async () => {
    const c = api.cancel('o1', 'moved');
    const del = http.expectOne('https://api.test/order/o1');
    expect(del.request.method).toBe('DELETE');
    expect(del.request.body).toEqual({ reason: 'moved' });
    del.flush({});
    await c;
    const r = api.rate('o1', 5, 'great');
    const rate = http.expectOne('https://api.test/order/o1/rate');
    expect(rate.request.body).toEqual({ stars: 5, review: 'great' });
    rate.flush({});
    await r;
  });
});
