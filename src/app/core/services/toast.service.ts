import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ApiError } from '../api/api-error';
import { I18nService } from '../i18n/i18n.service';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toast = inject(ToastController);
  private readonly i18n = inject(I18nService);

  async show(message: string, color: 'success' | 'danger' | 'warning' | 'medium' | 'primary' = 'primary', duration = 2600): Promise<void> {
    const t = await this.toast.create({ message, duration, color, position: 'top', mode: 'ios', cssClass: 'eayni-toast' });
    await t.present();
  }

  success(key: string, params?: Record<string, string | number>): Promise<void> {
    return this.show(this.i18n.t(key, params), 'success');
  }

  error(err: unknown): Promise<void> {
    return this.show(this.messageFor(err), 'danger', 3500);
  }

  messageFor(err: unknown): string {
    const e = ApiError.from(err);
    switch (e.kind) {
      case 'network': return this.i18n.t('common.error.network');
      case 'unauthorized': return hasServerMessage(e) ? e.message : this.i18n.t('common.error.unauthorized');
      case 'notConfigured': return this.i18n.t('common.apiNotConfigured');
      case 'validation': return e.message && e.message !== 'Validation error' ? e.message : this.i18n.t('common.error.validation');
      default: return e.message && !/^Http failure/i.test(e.message) ? e.message : this.i18n.t('common.error.generic');
    }
  }
}

/** True when the backend supplied its own human-readable message (e.g. "Sorry user or password incorrect"). */
function hasServerMessage(e: ApiError): boolean {
  const d = e.details;
  return !!d && typeof d === 'object' && typeof (d as Record<string, unknown>)['message'] === 'string' && e.message === (d as Record<string, unknown>)['message'];
}
