import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { TPipe } from '../../core/i18n/t.pipe';

@Component({
  selector: 'app-donate-success',
  imports: [IonContent, IonButton, IonIcon, TPipe],
  template: `
    <ion-content [fullscreen]="true" class="success">
      <div class="wrap eayni-fade-up">
        <div class="check"><ion-icon name="checkmark"></ion-icon></div>
        <h1>{{ 'donate.success.title' | t }}</h1>
        <p>{{ 'donate.success.subtitle' | t }}</p>
        <div class="eayni-note eayni-note--info"><ion-icon name="call-outline"></ion-icon><span>{{ 'orders.contact48' | t }}</span></div>
        <div class="eayni-note eayni-note--info"><ion-icon name="leaf-outline"></ion-icon><span>{{ 'donate.success.points' | t }}</span></div>
        <div class="actions">
          @if (id() && id() !== 'new') {
            <ion-button expand="block" class="eayni-btn" (click)="go('/orders/' + id())">{{ 'donate.success.view' | t }}</ion-button>
          }
          <ion-button expand="block" fill="clear" class="eayni-btn" (click)="go('/tabs/home')">{{ 'donate.success.home' | t }}</ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .wrap { min-height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 32px 24px; gap: 10px; }
    .check { width: 110px; height: 110px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, var(--ion-color-secondary), var(--ion-color-primary)); color: #fff; font-size: 60px; box-shadow: 0 20px 50px rgba(14,122,79,.35); animation: pop .5s cubic-bezier(.2,1.4,.4,1) both; margin-bottom: 10px; }
    @keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    h1 { margin: 0; font-size: 26px; font-weight: 900; }
    p { margin: 0 0 10px; color: var(--eayni-text-2); line-height: 1.6; max-width: 320px; }
    .eayni-note { width: 100%; max-width: 360px; box-sizing: border-box; text-align: start; }
    .actions { width: 100%; max-width: 360px; margin-top: 20px; }
  `],
})
export class DonateSuccessPage {
  readonly id = input<string>('');
  private readonly router = inject(Router);
  go(url: string): void { void this.router.navigateByUrl(url, { replaceUrl: true }); }
}
