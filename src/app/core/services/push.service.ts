import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { AccountApi } from '../api/account-api.service';
import { APP_VERSION } from '../config/app-config';

/**
 * Push registration. The backend accepts an `fcm` token through
 * PUT /account/profile and POST /auth/refresh-token; delivery itself is done
 * server-side ({{SERVICE_URL}}/fcm is a server-to-server relay and is NOT
 * called from the app). Enabled only on native builds with the feature flag.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly account = inject(AccountApi);
  readonly token = signal<string | null>(null);
  readonly supported = Capacitor.isNativePlatform() && environment.features.pushNotifications;

  async register(): Promise<boolean> {
    if (!this.supported) return false;
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return false;
      await PushNotifications.addListener('registration', (t) => {
        this.token.set(t.value);
        void this.account.updateProfile({ fcm: t.value, os: Capacitor.getPlatform(), app_version: APP_VERSION }).catch(() => undefined);
      });
      await PushNotifications.register();
      return true;
    } catch {
      return false;
    }
  }
}
