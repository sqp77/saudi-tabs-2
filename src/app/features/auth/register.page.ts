import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { PublicApi } from '../../core/api/public-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { Country } from '../../core/models';
import { OrdersStore } from '../../core/services/orders.store';
import { ToastService } from '../../core/services/toast.service';
import { isValidMobile, normalizeLocalPhone, toApiPhone } from '../../core/utils/phone';
import { isValidEmail } from '../../core/utils/validation';

/** Account creation on POST /auth/signup (name, email, password, phone — phone is required by the backend schema). */
@Component({
  selector: 'app-register',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonSpinner, TPipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/welcome" text=""></ion-back-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="eayni-page eayni-fade-up">
        <div class="icon"><ion-icon name="person-add-outline"></ion-icon></div>
        <h1>{{ 'auth.register.title' | t }}</h1>
        <p class="eayni-muted">{{ 'auth.register.subtitle' | t }}</p>

        <form (submit)="submit($event)" novalidate>
          <div class="eayni-field">
            <label for="name">{{ 'profile.name' | t }}</label>
            <input id="name" class="eayni-input" autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)" (blur)="touched.set(true)" [class.eayni-input--error]="touched() && !nameValid()" maxlength="80" />
          </div>
          <div class="eayni-field">
            <label for="email">{{ 'profile.email' | t }}</label>
            <input id="email" class="eayni-input" type="email" inputmode="email" autocomplete="email" dir="ltr" [value]="email()" (input)="email.set($any($event.target).value)" (blur)="touched.set(true)" [class.eayni-input--error]="touched() && !emailValid()" placeholder="name@example.com" />
            @if (touched() && !emailValid()) { <span class="eayni-error">{{ 'auth.email.invalid' | t }}</span> }
          </div>
          <div class="eayni-field">
            <label for="phone">{{ 'profile.phone' | t }}</label>
            <div class="phone-row">
              <select class="eayni-input cc" [value]="countryCode()" (change)="countryCode.set($any($event.target).value)" [attr.aria-label]="'auth.phone.country' | t">
                @for (c of countries(); track c.code + c.id) { <option [value]="c.code">+{{ c.code }} {{ c.iso || c.name }}</option> }
              </select>
              <input id="phone" class="eayni-input" type="tel" inputmode="tel" autocomplete="tel-national" dir="ltr" [placeholder]="'auth.phone.placeholder' | t" [value]="phone()" (input)="phone.set($any($event.target).value)" (blur)="touched.set(true)" [class.eayni-input--error]="touched() && !phoneValid()" />
            </div>
            @if (touched() && !phoneValid()) { <span class="eayni-error">{{ 'auth.phone.invalid' | t }}</span> }
            <span class="eayni-small eayni-muted">{{ 'auth.register.phoneHint' | t }}</span>
          </div>
          <div class="eayni-field">
            <label for="password">{{ 'auth.password' | t }}</label>
            <div class="pw">
              <input id="password" class="eayni-input" [type]="show() ? 'text' : 'password'" autocomplete="new-password" dir="ltr" [value]="password()" (input)="password.set($any($event.target).value)" (blur)="touched.set(true)" [class.eayni-input--error]="touched() && !passwordValid()" />
              <button type="button" class="eye" (click)="show.set(!show())"><ion-icon [name]="show() ? 'eye-off-outline' : 'eye-outline'"></ion-icon></button>
            </div>
            @if (touched() && !passwordValid()) { <span class="eayni-error">{{ 'auth.password.short' | t }}</span> }
          </div>
          <ion-button expand="block" type="submit" class="eayni-btn" [disabled]="busy() || !valid()">
            @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ 'auth.register.cta' | t }} }
          </ion-button>
          <p class="terms eayni-small eayni-muted">{{ 'auth.phone.terms' | t }}</p>
        </form>
        <p class="switch eayni-small">{{ 'auth.register.haveAccount' | t }} <button type="button" class="link" (click)="go('/auth/login')">{{ 'auth.login.cta' | t }}</button></p>
      </div>
    </ion-content>
  `,
  styles: [`
    .icon { width: 60px; height: 60px; border-radius: 20px; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent); color: var(--ion-color-primary); font-size: 28px; margin: 8px 0 18px; }
    h1 { font-size: 26px; font-weight: 900; margin: 0 0 6px; }
    p { margin: 0 0 22px; line-height: 1.55; }
    .phone-row { display: flex; gap: 8px; } .cc { width: 128px; flex: none; direction: ltr; }
    .pw { position: relative; } .pw input { padding-inline-end: 48px; }
    .eye { position: absolute; top: 50%; inset-inline-end: 8px; transform: translateY(-50%); width: 36px; height: 36px; border: 0; background: none; color: var(--eayni-text-3); font-size: 20px; display: grid; place-items: center; }
    .terms { text-align: center; margin-top: 14px; }
    .switch { text-align: center; margin-top: 8px; color: var(--eayni-text-2); }
    .link { background: none; border: 0; font: inherit; font-weight: 800; color: var(--ion-color-primary); cursor: pointer; }
  `],
})
export class RegisterPage {
  readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly publicApi = inject(PublicApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly orders = inject(OrdersStore);

  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly password = signal('');
  readonly countryCode = signal(environment.defaultCountryCode);
  readonly countries = signal<Country[]>([{ id: 'KSA', name: 'Saudi Arabia', code: '966', iso: 'KSA', raw: null }]);
  readonly show = signal(false);
  readonly busy = signal(false);
  readonly touched = signal(false);
  readonly nameValid = computed(() => this.name().trim().length >= 2);
  readonly emailValid = computed(() => isValidEmail(this.email()));
  readonly phoneValid = computed(() => isValidMobile(normalizeLocalPhone(this.phone(), this.countryCode())));
  readonly passwordValid = computed(() => this.password().length >= 6);
  readonly valid = computed(() => this.nameValid() && this.emailValid() && this.phoneValid() && this.passwordValid());

  constructor() {
    void this.publicApi.countries().then((list) => {
      if (list.length) { this.countries.set(list); if (!list.some((c) => c.code === this.countryCode())) this.countryCode.set(list[0].code); }
    }).catch(() => undefined);
  }

  go(url: string): void { void this.router.navigateByUrl(url); }

  async submit(ev: Event): Promise<void> {
    ev.preventDefault();
    this.touched.set(true);
    if (!this.valid() || this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.signUp({
        name: this.name().trim(), email: this.email(), password: this.password(),
        phone: toApiPhone(normalizeLocalPhone(this.phone(), this.countryCode())), countryCode: this.countryCode(),
      });
      this.orders.clear();
      await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
