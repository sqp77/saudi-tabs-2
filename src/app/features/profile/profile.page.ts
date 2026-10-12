import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { AccountApi } from '../../core/api/account-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { APP_VERSION } from '../../core/config/app-config';
import { I18nService, Lang } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { OrdersStore } from '../../core/services/orders.store';
import { PushService } from '../../core/services/push.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeMode, ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-profile',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, TPipe],
  template: `
    <ion-header class="ion-no-border" [translucent]="true">
      <ion-toolbar><ion-title>{{ 'profile.title' | t }}</ion-title></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="eayni-page">
        <!-- identity -->
        <section class="id eayni-card eayni-fade-up">
          <div class="avatar">
            @if (auth.user()?.avatar) { <img [src]="auth.user()!.avatar" alt="" /> } @else { <ion-icon name="person"></ion-icon> }
          </div>
          <div class="id__body">
            <strong>{{ auth.user()?.name || (auth.isAuthenticated() ? ('profile.name' | t) : ('profile.guest' | t)) }}</strong>
            @if (auth.user()?.email) { <span class="eayni-small eayni-muted" dir="ltr">{{ auth.user()!.email }}</span> }
            @if (auth.user()?.phone) { <span class="eayni-small eayni-muted" dir="ltr">{{ auth.user()!.phone }}</span> }
            @if (auth.user()?.createdAt) { <span class="eayni-small eayni-muted">{{ 'profile.memberSince' | t: { date: i18n.formatDate(auth.user()!.createdAt, { dateStyle: 'medium' }) } }}</span> }
          </div>
          @if (auth.isAuthenticated()) {
            <button type="button" class="edit" (click)="go('/profile/edit')" [attr.aria-label]="'profile.edit' | t"><ion-icon name="create-outline"></ion-icon></button>
          } @else {
            <button type="button" class="edit edit--primary" (click)="go('/auth/welcome')">{{ 'auth.required.cta' | t }}</button>
          }
        </section>

        <!-- preferences -->
        <section class="group">
          <div class="row">
            <ion-icon name="language-outline"></ion-icon><span class="row__label">{{ 'profile.language' | t }}</span>
            <div class="seg">
              @for (l of langs; track l.v) { <button type="button" [class.on]="i18n.lang() === l.v" (click)="i18n.setLang(l.v)">{{ l.label }}</button> }
            </div>
          </div>
          <div class="row">
            <ion-icon name="contrast-outline"></ion-icon><span class="row__label">{{ 'profile.theme' | t }}</span>
            <div class="seg">
              @for (m of modes; track m) { <button type="button" [class.on]="theme.mode() === m" (click)="theme.setMode(m)">{{ ('profile.theme.' + m) | t }}</button> }
            </div>
          </div>
        </section>

        @if (auth.isAuthenticated()) {
          <section class="group">
            <button type="button" class="row" (click)="go('/profile/places')"><ion-icon name="bookmark-outline"></ion-icon><span class="row__label">{{ 'profile.places' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button>
            <button type="button" class="row" (click)="go('/notifications')"><ion-icon name="notifications-outline"></ion-icon><span class="row__label">{{ 'profile.notifications' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button>
            @if (features.rewards) { <button type="button" class="row" (click)="go('/rewards')"><ion-icon name="gift-outline"></ion-icon><span class="row__label">{{ 'rewards.title' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button> }
            @if (push.supported) { <button type="button" class="row" (click)="enablePush()"><ion-icon name="phone-portrait-outline"></ion-icon><span class="row__label">{{ 'push.enable' | t }}</span><ion-icon class="chev" [name]="push.token() ? 'checkmark-circle' : chev"></ion-icon></button> }
          </section>
        }

        <section class="group">
          <button type="button" class="row" (click)="go('/info/about')"><ion-icon name="information-circle-outline"></ion-icon><span class="row__label">{{ 'profile.about' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button>
          <button type="button" class="row" (click)="go('/info/partners')"><ion-icon name="people-outline"></ion-icon><span class="row__label">{{ 'profile.partners' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button>
          <button type="button" class="row" (click)="go('/info/contact')"><ion-icon name="chatbox-ellipses-outline"></ion-icon><span class="row__label">{{ 'profile.contact' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button>
          <button type="button" class="row" (click)="go('/info/privacy')"><ion-icon name="shield-checkmark-outline"></ion-icon><span class="row__label">{{ 'profile.privacy' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button>
          <button type="button" class="row" (click)="go('/info/terms')"><ion-icon name="document-text-outline"></ion-icon><span class="row__label">{{ 'profile.terms' | t }}</span><ion-icon class="chev" [name]="chev"></ion-icon></button>
        </section>

        @if (auth.isAuthenticated()) {
          <section class="group">
            <button type="button" class="row" (click)="signOut()"><ion-icon name="log-out-outline"></ion-icon><span class="row__label">{{ 'auth.signOut' | t }}</span></button>
            <button type="button" class="row danger" (click)="deleteAccount()"><ion-icon name="trash-outline"></ion-icon><span class="row__label">{{ 'profile.deleteAccount' | t }}</span></button>
          </section>
        }

        <p class="version eayni-small eayni-muted">{{ 'profile.version' | t: { version: version } }}</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .id { display: flex; align-items: center; gap: 14px; margin-top: 6px; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: linear-gradient(135deg, var(--ion-color-secondary), var(--ion-color-primary)); color: #fff; font-size: 30px; flex: none; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .id__body { flex: 1; display: flex; flex-direction: column; min-width: 0; } .id__body strong { font-size: 17px; }
    .edit { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--eayni-border); background: var(--eayni-surface-2); color: var(--ion-color-primary); display: grid; place-items: center; font-size: 20px; }
    .edit--primary { width: auto; padding: 0 16px; border-radius: 999px; background: var(--ion-color-primary); color: #fff; font: inherit; font-weight: 700; font-size: 13px; }
    .group { margin-top: 14px; background: var(--eayni-surface); border: 1px solid var(--eayni-border); border-radius: var(--eayni-radius); overflow: hidden; }
    .row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: none; border: 0; border-bottom: 1px solid var(--eayni-border); font: inherit; color: var(--eayni-text); text-align: start; }
    .row:last-child { border-bottom: 0; }
    .row > ion-icon:first-child { font-size: 21px; color: var(--ion-color-primary); }
    .row__label { flex: 1; font-weight: 600; font-size: 14.5px; }
    .chev { color: var(--eayni-text-3); }
    .danger, .danger ion-icon:first-child { color: var(--ion-color-danger); }
    .seg { display: inline-flex; background: var(--eayni-surface-2); border-radius: 999px; padding: 3px; }
    .seg button { border: 0; background: none; font: inherit; font-size: 12.5px; font-weight: 700; padding: 6px 10px; border-radius: 999px; color: var(--eayni-text-2); }
    .seg button.on { background: var(--eayni-surface); color: var(--ion-color-primary); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .version { text-align: center; margin-top: 22px; }
  `],
})
export class ProfilePage implements ViewWillEnter {
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly push = inject(PushService);
  private readonly account = inject(AccountApi);
  private readonly orders = inject(OrdersStore);
  private readonly alerts = inject(AlertController);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly features = environment.features;
  readonly version = APP_VERSION;
  readonly langs: { v: Lang; label: string }[] = [{ v: 'ar', label: 'العربية' }, { v: 'en', label: 'English' }];
  readonly modes: ThemeMode[] = ['system', 'light', 'dark'];
  get chev(): string { return this.i18n.isRtl() ? 'chevron-back' : 'chevron-forward'; }

  ionViewWillEnter(): void {
    if (this.auth.isAuthenticated() && !this.auth.user()) void this.auth.loadMe().catch(() => undefined);
  }

  go(url: string): void { void this.router.navigateByUrl(url); }

  async enablePush(): Promise<void> {
    const ok = await this.push.register();
    if (!ok) await this.toast.show(this.i18n.t('push.unsupported'), 'warning');
  }

  async signOut(): Promise<void> {
    const a = await this.alerts.create({ header: this.i18n.t('auth.signOut.confirm'), buttons: [{ text: this.i18n.t('common.cancel'), role: 'cancel' }, { text: this.i18n.t('auth.signOut'), role: 'confirm' }] });
    await a.present();
    if ((await a.onWillDismiss()).role !== 'confirm') return;
    await this.auth.signOut();
    this.orders.clear();
    void this.router.navigateByUrl('/auth/welcome', { replaceUrl: true });
  }

  async deleteAccount(): Promise<void> {
    const a = await this.alerts.create({ header: this.i18n.t('profile.deleteAccount'), message: this.i18n.t('profile.deleteAccount.confirm'), buttons: [{ text: this.i18n.t('common.cancel'), role: 'cancel' }, { text: this.i18n.t('common.delete'), role: 'destructive' }] });
    await a.present();
    if ((await a.onWillDismiss()).role !== 'destructive') return;
    try {
      await this.account.deleteAccount();
      await this.auth.signOut();
      this.orders.clear();
      void this.router.navigateByUrl('/auth/welcome', { replaceUrl: true });
    } catch (e) { await this.toast.error(e); }
  }
}
