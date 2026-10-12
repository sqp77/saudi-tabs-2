import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { OrdersStore } from '../../core/services/orders.store';
import { ToastService } from '../../core/services/toast.service';
import { isValidEmail } from '../../core/utils/validation';

/** Email + password sign-in on POST /auth/signin. */
@Component({
  selector: 'app-login',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonSpinner, TPipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/welcome" text=""></ion-back-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="eayni-page eayni-fade-up">
        <div class="icon"><ion-icon name="mail-outline"></ion-icon></div>
        <h1>{{ 'auth.login.title' | t }}</h1>
        <p class="eayni-muted">{{ 'auth.login.subtitle' | t }}</p>

        <form (submit)="submit($event)" novalidate>
          <div class="eayni-field">
            <label for="email">{{ 'profile.email' | t }}</label>
            <input id="email" class="eayni-input" type="email" inputmode="email" autocomplete="email" dir="ltr" [value]="email()" (input)="email.set($any($event.target).value)" (blur)="touched.set(true)" [class.eayni-input--error]="touched() && !emailValid()" placeholder="name@example.com" />
            @if (touched() && !emailValid()) { <span class="eayni-error">{{ 'auth.email.invalid' | t }}</span> }
          </div>
          <div class="eayni-field">
            <label for="password">{{ 'auth.password' | t }}</label>
            <div class="pw">
              <input id="password" class="eayni-input" [type]="show() ? 'text' : 'password'" autocomplete="current-password" dir="ltr" [value]="password()" (input)="password.set($any($event.target).value)" (blur)="touched.set(true)" [class.eayni-input--error]="touched() && !passwordValid()" />
              <button type="button" class="eye" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide' : 'Show'"><ion-icon [name]="show() ? 'eye-off-outline' : 'eye-outline'"></ion-icon></button>
            </div>
            @if (touched() && !passwordValid()) { <span class="eayni-error">{{ 'auth.password.short' | t }}</span> }
          </div>
          <ion-button expand="block" type="submit" class="eayni-btn" [disabled]="busy() || !valid()">
            @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ 'auth.login.cta' | t }} }
          </ion-button>
        </form>
        <p class="switch eayni-small">{{ 'auth.login.noAccount' | t }} <button type="button" class="link" (click)="go('/auth/register')">{{ 'auth.register.cta' | t }}</button></p>
      </div>
    </ion-content>
  `,
  styles: [`
    .icon { width: 60px; height: 60px; border-radius: 20px; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent); color: var(--ion-color-primary); font-size: 28px; margin: 8px 0 18px; }
    h1 { font-size: 26px; font-weight: 900; margin: 0 0 6px; }
    p { margin: 0 0 22px; line-height: 1.55; }
    .pw { position: relative; } .pw input { padding-inline-end: 48px; }
    .eye { position: absolute; top: 50%; inset-inline-end: 8px; transform: translateY(-50%); width: 36px; height: 36px; border: 0; background: none; color: var(--eayni-text-3); font-size: 20px; display: grid; place-items: center; }
    .switch { text-align: center; margin-top: 18px; color: var(--eayni-text-2); }
    .link { background: none; border: 0; font: inherit; font-weight: 800; color: var(--ion-color-primary); cursor: pointer; }
  `],
})
export class LoginPage {
  readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrdersStore);

  readonly email = signal('');
  readonly password = signal('');
  readonly show = signal(false);
  readonly busy = signal(false);
  readonly touched = signal(false);
  readonly emailValid = computed(() => isValidEmail(this.email()));
  readonly passwordValid = computed(() => this.password().length >= 6);
  readonly valid = computed(() => this.emailValid() && this.passwordValid());

  go(url: string): void { void this.router.navigateByUrl(url); }

  async submit(ev: Event): Promise<void> {
    ev.preventDefault();
    this.touched.set(true);
    if (!this.valid() || this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.signIn({ email: this.email(), password: this.password() });
      this.orders.clear();
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      await this.router.navigateByUrl(redirect && redirect.startsWith('/') ? redirect : '/tabs/home', { replaceUrl: true });
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
