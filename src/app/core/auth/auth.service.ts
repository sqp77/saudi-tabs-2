import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiClient } from '../api/api-client.service';
import { ApiError } from '../api/api-error';
import type { AuthTokens, EmailSignInRequest, PhoneSignInRequest, PhoneVerifyRequest, SignUpRequest, UserProfile } from '../models';
import { isRec, normalizeProfile, str, unwrap } from '../utils/normalize';
import { TokenStore } from './token-store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly store = inject(TokenStore);

  readonly ready = signal(false);
  readonly user = signal<UserProfile | null>(null);
  readonly isAuthenticated = computed(() => !!this.store.tokens()?.accessToken);
  private refreshing?: Promise<boolean>;

  async init(): Promise<void> {
    await this.store.load();
    this.ready.set(true);
    if (this.isAuthenticated()) {
      void this.loadMe().catch(() => undefined);
    }
  }

  /** POST /auth/signin {email, password} → `{ accessToken, … }`. Primary sign-in flow. */
  async signIn(req: EmailSignInRequest): Promise<void> {
    const body = await this.api.post<unknown>('auth/signin', { email: req.email.trim().toLowerCase(), password: req.password }, { skipAuth: true, noRefresh: true });
    const tokens = parseTokens(body);
    if (!tokens) throw new ApiError('unknown', 'No access token in sign-in response', undefined, body);
    await this.store.set(tokens);
    this.applyEmbeddedUser(body);
    await this.loadMe().catch(() => undefined);
  }

  /** POST /auth/signup {name, email, password, phone} → `{ user, accessToken }` (confirmed live). */
  async signUp(req: SignUpRequest): Promise<void> {
    const body = await this.api.post<unknown>('auth/signup', { ...req, email: req.email.trim().toLowerCase() }, { skipAuth: true, noRefresh: true });
    const tokens = parseTokens(body);
    if (!tokens) {
      // Some deployments return the user only; fall back to a regular sign-in.
      await this.signIn({ email: req.email, password: req.password });
      return;
    }
    await this.store.set(tokens);
    this.applyEmbeddedUser(body);
    await this.loadMe().catch(() => undefined);
  }

  private applyEmbeddedUser(body: unknown): void {
    if (isRec(body) && isRec(body['user'])) this.user.set(normalizeProfile(body['user']));
  }

  /** POST /auth/phone-signin → sends an OTP to the phone. (Kept for the backend's OTP flow; not used by the UI.) */
  async requestCode(req: PhoneSignInRequest): Promise<void> {
    await this.api.post('auth/phone-signin', req, { skipAuth: true, noRefresh: true });
    await this.store.setPhone(req);
  }

  /** POST /auth/phone-verify → returns `accessToken` (+ `refreshToken` when issued). */
  async verifyCode(req: PhoneVerifyRequest): Promise<void> {
    const body = await this.api.post<unknown>('auth/phone-verify', req, { skipAuth: true, noRefresh: true });
    const tokens = parseTokens(body);
    if (!tokens) throw new ApiError('unknown', 'No access token in verify response', undefined, body);
    await this.store.set(tokens);
    await this.loadMe().catch(() => undefined);
  }

  /** POST /auth/refresh-token — single-flight. Returns false when the session cannot be restored. */
  refresh(fcm?: string): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = (async () => {
        const refreshToken = this.store.tokens()?.refreshToken;
        if (!refreshToken) return false;
        try {
          const body = await this.api.post<unknown>('auth/refresh-token', { refreshToken, fcm }, { skipAuth: true, noRefresh: true });
          const tokens = parseTokens(body);
          if (!tokens) return false;
          await this.store.set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? refreshToken });
          return true;
        } catch {
          await this.signOut();
          return false;
        } finally {
          this.refreshing = undefined;
        }
      })();
    }
    return this.refreshing;
  }

  /** GET /account/me */
  async loadMe(): Promise<UserProfile> {
    const body = await this.api.get<unknown>('account/me');
    const me = normalizeProfile(body);
    this.user.set(me);
    return me;
  }

  async signOut(): Promise<void> {
    await this.store.set(null);
    this.user.set(null);
  }

  get phoneHint(): string | undefined {
    const p = this.store.phone();
    return p ? `+${p.countryCode} ${p.phone}` : undefined;
  }
}

function parseTokens(body: unknown): AuthTokens | null {
  const candidates = [body, unwrap(body)];
  for (const c of candidates) {
    if (!isRec(c)) continue;
    const accessToken = str(c['accessToken']) ?? str(c['access_token']) ?? str(c['token']);
    if (accessToken) {
      return { accessToken, refreshToken: str(c['refreshToken']) ?? str(c['refresh_token']), raw: body };
    }
    if (isRec(c['tokens'])) {
      const t = c['tokens'] as Record<string, unknown>;
      const at = str(t['accessToken']) ?? str(t['access_token']);
      if (at) return { accessToken: at, refreshToken: str(t['refreshToken']) ?? str(t['refresh_token']), raw: body };
    }
  }
  return null;
}
