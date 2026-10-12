import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';

@Component({
  selector: 'app-welcome',
  imports: [IonContent, IonButton, IonIcon, TPipe],
  template: `
    <ion-content [fullscreen]="true" class="welcome">
      <div class="hero">
        <button type="button" class="lang" (click)="i18n.toggle()" [attr.aria-label]="'profile.language' | t">
          <ion-icon name="language-outline"></ion-icon>
          {{ i18n.lang() === 'ar' ? 'English' : 'العربية' }}
        </button>
        <div class="art" aria-hidden="true">
          <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
          <svg viewBox="0 0 200 200" class="leaf">
            <path d="M150 40c-45 0-78 26-86 72 20-26 42-39 72-42-26 13-45 32-55 61 7 3 15 5 24 5 46 0 68-36 68-85 0-5-2-11-7-11h-16z" fill="#fff"/>
            <path d="M62 150c6-30 26-52 54-66" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85"/>
          </svg>
        </div>
      </div>
      <div class="sheet eayni-fade-up">
        <div class="brand">{{ 'app.name' | t }}</div>
        <h1>{{ 'auth.welcome.title' | t }}</h1>
        <p>{{ 'auth.welcome.subtitle' | t }}</p>
        <ul class="feats">
          <li><ion-icon name="car-outline"></ion-icon><span>{{ 'home.hero.subtitle' | t }}</span></li>
          <li><ion-icon name="call-outline"></ion-icon><span>{{ 'auth.welcome.contact48' | t }}</span></li>
          <li><ion-icon name="leaf-outline"></ion-icon><span>{{ 'home.impact.points' | t }}</span></li>
        </ul>
        <ion-button expand="block" class="eayni-btn" (click)="go('/auth/register')">{{ 'auth.welcome.cta' | t }}</ion-button>
        <ion-button expand="block" fill="outline" class="eayni-btn" (click)="go('/auth/login')">{{ 'auth.login.cta' | t }}</ion-button>
        <ion-button expand="block" fill="clear" class="eayni-btn" (click)="go('/tabs/home')">{{ 'auth.welcome.browse' | t }}</ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .welcome { --background: linear-gradient(170deg, #0e7a4f 0%, #1db47a 55%, #c9a35b 140%); }
    .hero { position: relative; height: 46vh; min-height: 300px; display: grid; place-items: center; overflow: hidden; }
    .lang { position: absolute; top: calc(env(safe-area-inset-top) + 14px); inset-inline-end: 16px; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,.18); color: #fff; border: 0; font: inherit; font-size: 13px; font-weight: 700; backdrop-filter: blur(8px); }
    .art { position: relative; width: 240px; height: 240px; display: grid; place-items: center; }
    .leaf { width: 180px; height: 180px; filter: drop-shadow(0 16px 30px rgba(0,0,0,.25)); animation: float 5s ease-in-out infinite; }
    .blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,.12); animation: float 7s ease-in-out infinite; }
    .b1 { width: 240px; height: 240px; }
    .b2 { width: 170px; height: 170px; animation-delay: -2s; background: rgba(255,255,255,.1); }
    .b3 { width: 300px; height: 300px; animation-delay: -4s; background: rgba(255,255,255,.06); }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .sheet { background: var(--eayni-bg); border-radius: 32px 32px 0 0; margin-top: -24px; padding: 28px 24px calc(28px + env(safe-area-inset-bottom)); min-height: 54vh; box-shadow: 0 -20px 60px rgba(0,0,0,.18); }
    .brand { font-weight: 900; letter-spacing: .12em; font-size: 12px; color: var(--ion-color-primary); text-transform: uppercase; }
    h1 { margin: 8px 0 8px; font-size: 30px; font-weight: 900; letter-spacing: -0.02em; }
    p { margin: 0 0 18px; color: var(--eayni-text-2); line-height: 1.6; font-size: 15px; }
    .feats { list-style: none; padding: 0; margin: 0 0 22px; display: flex; flex-direction: column; gap: 10px; }
    .feats li { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; }
    .feats ion-icon { width: 36px; height: 36px; border-radius: 12px; background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent); color: var(--ion-color-primary); padding: 8px; box-sizing: border-box; font-size: 20px; }
  `],
})
export class WelcomePage {
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  go(url: string): void { void this.router.navigateByUrl(url); }
}
