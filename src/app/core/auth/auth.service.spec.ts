import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { TokenStore } from './token-store.service';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';
import { ApiClient } from '../api/api-client.service';

describe('AuthService + interceptor', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let store: TokenStore;

  beforeEach(async () => {
    environment.clientApiUrl = 'https://api.test';
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(TokenStore);
    await store.set(null);
    await auth.init();
  });

  afterEach(() => { http.verify(); environment.clientApiUrl = ''; });

  it('signs in with email + password on /auth/signin and loads /account/me', async () => {
    const p = auth.signIn({ email: '  Saud@Example.com ', password: 'secret1' });
    const req = http.expectOne('https://api.test/auth/signin');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'saud@example.com', password: 'secret1' });
    expect(req.request.headers.get('Accept-Language')).toBe('ar');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: 'AT' });
    const me = await vi.waitFor(() => http.expectOne('https://api.test/account/me'));
    expect(me.request.headers.get('Authorization')).toBe('Bearer AT');
    me.flush({ data: { _id: 'u1', name: 'Saud', email: 'saud@example.com', phone: '0555930749', country: 'KSA', email_verified: false } });
    await p;
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.name).toBe('Saud');
    expect(auth.user()?.countryCode).toBe('KSA');
  });

  it('signs up on /auth/signup with the confirmed {user, accessToken} response', async () => {
    const p = auth.signUp({ name: 'Saud', email: 'saud@example.com', password: 'secret1', phone: '0555930749', countryCode: '966' });
    const req = http.expectOne('https://api.test/auth/signup');
    expect(req.request.body).toMatchObject({ name: 'Saud', email: 'saud@example.com', phone: '0555930749' });
    req.flush({ user: { _id: 'u2', name: 'Saud', email: 'saud@example.com', phone: '0555930749', location: { type: 'Point', coordinates: [] } }, accessToken: 'AT2' });
    await vi.waitFor(() => expect(auth.user()?.id).toBe('u2')); // embedded user applied before /account/me resolves
    (await vi.waitFor(() => http.expectOne('https://api.test/account/me'))).flush({ data: { _id: 'u2', name: 'Saud', phone: '0555930749' } });
    await p;
    expect(store.accessToken).toBe('AT2');
    expect(auth.user()?.phone).toBe('0555930749');
  });

  it('surfaces the backend message on wrong credentials', async () => {
    const p = auth.signIn({ email: 'a@b.co', password: 'wrong12' });
    http.expectOne('https://api.test/auth/signin').flush({ message: 'Sorry user or password incorrect' }, { status: 401, statusText: 'Unauthorized' });
    await expect(p).rejects.toMatchObject({ kind: 'unauthorized', message: 'Sorry user or password incorrect' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('still supports the OTP endpoints (phone-signin stores the phone)', async () => {
    const p = auth.requestCode({ phone: '0555930749', countryCode: '966' });
    http.expectOne('https://api.test/auth/phone-signin').flush({ message: 'sent' });
    await p;
    expect(store.phone()).toEqual({ phone: '0555930749', countryCode: '966' });
  });

  it('refreshes once on 401 and replays the request', async () => {
    await store.set({ accessToken: 'OLD', refreshToken: 'RT' });
    const api = TestBed.inject(ApiClient);
    const p = api.get('account/points');
    const first = http.expectOne('https://api.test/account/points');
    expect(first.request.headers.get('Authorization')).toBe('Bearer OLD');
    first.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    const refresh = await vi.waitFor(() => http.expectOne('https://api.test/auth/refresh-token'));
    expect(refresh.request.body).toMatchObject({ refreshToken: 'RT' });
    refresh.flush({ accessToken: 'NEW', refreshToken: 'RT2' });
    const replay = await vi.waitFor(() => http.expectOne('https://api.test/account/points'));
    expect(replay.request.headers.get('Authorization')).toBe('Bearer NEW');
    replay.flush({ availableCredit: 9 });
    await expect(p).resolves.toEqual({ availableCredit: 9 });
    expect(store.tokens()?.refreshToken).toBe('RT2');
  });

  it('signs out when refresh fails', async () => {
    await store.set({ accessToken: 'OLD', refreshToken: 'BAD' });
    const api = TestBed.inject(ApiClient);
    const p = api.get('account/points');
    http.expectOne('https://api.test/account/points').flush({}, { status: 401, statusText: 'Unauthorized' });
    (await vi.waitFor(() => http.expectOne('https://api.test/auth/refresh-token'))).flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(p).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
  });
});
