import { Component, EnvironmentInjector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { TPipe } from '../../core/i18n/t.pipe';

/**
 * Tab shell. The centre "new request" action is rendered as a floating button
 * positioned over the tab bar (ion-tab-bar uses `contain: strict`, so anything
 * placed inside it is clipped); the matching tab button only carries the label.
 */
@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TPipe],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon aria-hidden="true" name="home-outline"></ion-icon>
          <ion-label>{{ 'tabs.home' | t }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="orders" href="/tabs/orders">
          <ion-icon aria-hidden="true" name="cube-outline"></ion-icon>
          <ion-label>{{ 'tabs.orders' | t }}</ion-label>
        </ion-tab-button>
        <ion-tab-button class="center" (click)="donate()" [attr.aria-label]="'tabs.donate' | t">
          <span class="center__space" aria-hidden="true"></span>
          <ion-label>{{ 'tabs.donate' | t }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="impact" href="/tabs/impact">
          <ion-icon aria-hidden="true" name="leaf-outline"></ion-icon>
          <ion-label>{{ 'tabs.impact' | t }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon aria-hidden="true" name="person-outline"></ion-icon>
          <ion-label>{{ 'tabs.profile' | t }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
      <button slot="bottom" type="button" class="fab" (click)="donate()" [attr.aria-label]="'tabs.donate' | t">
        <ion-icon name="add" aria-hidden="true"></ion-icon>
      </button>
    </ion-tabs>
  `,
  styles: [`
    ion-tabs { position: relative; }
    .center { --color: var(--ion-color-primary); --color-selected: var(--ion-color-primary); }
    .center__space { display: block; height: 26px; }
    .fab {
      position: absolute; left: 50%; bottom: calc(64px + env(safe-area-inset-bottom) - 26px); transform: translateX(-50%);
      width: 58px; height: 58px; border-radius: 50%; border: 4px solid var(--eayni-bg); padding: 0; z-index: 11;
      background: linear-gradient(135deg, var(--ion-color-secondary), var(--ion-color-primary)); color: #fff;
      display: grid; place-items: center; font-size: 30px; box-shadow: 0 10px 24px rgba(14, 122, 79, .35); cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .fab:active { transform: translateX(-50%) scale(.94); }
    .fab ion-icon { pointer-events: none; }
  `],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  private readonly router = inject(Router);

  donate(): void {
    void this.router.navigateByUrl('/donate');
  }
}
