import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import type { AuthTokens } from '../models';

const KEY = 'eayni.auth.tokens';
const PHONE_KEY = 'eayni.auth.phone';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly storage = inject(StorageService);
  readonly tokens = signal<AuthTokens | null>(null);
  readonly phone = signal<{ phone: string; countryCode: string } | null>(null);
  private loaded?: Promise<void>;

  load(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        this.tokens.set(await this.storage.get<AuthTokens>(KEY));
        this.phone.set(await this.storage.get<{ phone: string; countryCode: string }>(PHONE_KEY));
      })();
    }
    return this.loaded;
  }

  async set(tokens: AuthTokens | null): Promise<void> {
    this.tokens.set(tokens);
    if (tokens) await this.storage.set(KEY, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    else await this.storage.remove(KEY);
  }

  async setPhone(p: { phone: string; countryCode: string } | null): Promise<void> {
    this.phone.set(p);
    if (p) await this.storage.set(PHONE_KEY, p);
    else await this.storage.remove(PHONE_KEY);
  }

  get accessToken(): string | undefined {
    return this.tokens()?.accessToken;
  }
}
