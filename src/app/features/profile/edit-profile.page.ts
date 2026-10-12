import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { AccountApi } from '../../core/api/account-api.service';
import { UploadApi } from '../../core/api/upload-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { APP_VERSION } from '../../core/config/app-config';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { ToastService } from '../../core/services/toast.service';
import { compressImage } from '../../core/utils/image';

/** PUT /account/profile */
@Component({
  selector: 'app-edit-profile',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonSpinner, TPipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'profile.edit' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="eayni-page">
        <div class="avatar-wrap">
          <button type="button" class="avatar" (click)="pickAvatar(file)" [attr.aria-label]="'profile.avatar' | t">
            @if (avatar()) { <img [src]="avatar()" alt="" /> } @else { <ion-icon name="person"></ion-icon> }
            <span class="cam">@if (uploading()) { <ion-spinner name="crescent"></ion-spinner> } @else { <ion-icon name="camera"></ion-icon> }</span>
          </button>
          <input #file type="file" accept="image/*" hidden (change)="onFile($event)" />
        </div>
        <div class="eayni-field"><label for="name">{{ 'profile.name' | t }}</label><input id="name" class="eayni-input" [value]="name()" (input)="name.set($any($event.target).value)" maxlength="80" autocomplete="name" /></div>
        <div class="eayni-field"><label for="email">{{ 'profile.email' | t }}</label><input id="email" class="eayni-input" type="email" dir="ltr" [value]="email()" (input)="email.set($any($event.target).value)" autocomplete="email" /></div>
        <div class="eayni-field"><label>{{ 'profile.phone' | t }}</label><input class="eayni-input" dir="ltr" [value]="auth.user()?.phone || ''" disabled /></div>
        <ion-button expand="block" class="eayni-btn" (click)="save()" [disabled]="busy() || uploading() > 0">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ 'common.save' | t }} }
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .avatar-wrap { display: grid; place-items: center; margin: 12px 0 22px; }
    .avatar { position: relative; width: 104px; height: 104px; border-radius: 50%; border: 0; overflow: visible; background: linear-gradient(135deg, var(--ion-color-secondary), var(--ion-color-primary)); color: #fff; display: grid; place-items: center; font-size: 48px; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .cam { position: absolute; bottom: 0; inset-inline-end: 0; width: 34px; height: 34px; border-radius: 50%; background: var(--eayni-surface); color: var(--ion-color-primary); display: grid; place-items: center; font-size: 17px; box-shadow: var(--eayni-shadow); }
  `],
})
export class EditProfilePage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(AccountApi);
  private readonly upload = inject(UploadApi);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly name = signal('');
  readonly email = signal('');
  readonly avatar = signal('');
  readonly busy = signal(false);
  readonly uploading = signal(0);

  ngOnInit(): void {
    const u = this.auth.user();
    this.name.set(u?.name ?? ''); this.email.set(u?.email ?? ''); this.avatar.set(u?.avatar ?? '');
  }

  async pickAvatar(input: HTMLInputElement): Promise<void> {
    if (!this.upload.available) { await this.toast.show(this.i18n.t('common.apiNotConfigured'), 'warning'); return; }
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.Uri, source: CameraSource.Prompt, correctOrientation: true });
        if (photo.webPath) await this.uploadBlob(await (await fetch(photo.webPath)).blob());
      } catch { /* cancelled */ }
    } else input.click();
  }

  async onFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0]; input.value = '';
    if (f) await this.uploadBlob(f);
  }

  private async uploadBlob(b: Blob): Promise<void> {
    this.uploading.update((n) => n + 1);
    try { this.avatar.set(await this.upload.upload(await compressImage(b, 512), `avatar-${Date.now()}.jpg`)); }
    catch (e) { await this.toast.error(e); }
    finally { this.uploading.update((n) => n - 1); }
  }

  async save(): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.updateProfile({ name: this.name().trim(), email: this.email().trim() || undefined, avatar: this.avatar() || undefined, language: this.i18n.lang(), os: Capacitor.getPlatform(), app_version: APP_VERSION });
      await this.auth.loadMe().catch(() => undefined);
      await this.toast.success('profile.saved');
      void this.router.navigateByUrl('/tabs/profile');
    } catch (e) { await this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
