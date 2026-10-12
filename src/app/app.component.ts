import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { registerIcons } from './core/config/icons';
import { I18nService } from './core/i18n/i18n.service';
import { ThemeService } from './core/theme/theme.service';
import { AuthService } from './core/auth/auth.service';
import { NetworkService } from './core/services/network.service';
import { TPipe } from './core/i18n/t.pipe';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, TPipe],
  template: `
    <ion-app>
      @if (!network.online()) {
        <div class="offline" role="status">{{ 'common.offline' | t }}</div>
      }
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  styles: [`
    .offline { position: fixed; top: env(safe-area-inset-top); inset-inline: 0; z-index: 9999; background: var(--ion-color-warning); color: var(--ion-color-warning-contrast); font-size: 12.5px; font-weight: 600; text-align: center; padding: 6px 12px; }
  `],
})
export class AppComponent {
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);
  readonly network = inject(NetworkService);
  private readonly auth = inject(AuthService);

  constructor() {
    registerIcons();
    void this.auth.init();
  }
}
