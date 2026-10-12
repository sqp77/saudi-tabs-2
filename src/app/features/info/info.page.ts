import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { PublicApi } from '../../core/api/public-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { ContactInfo, Partner, StaticPage } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { markdownToHtml } from '../../core/utils/markdown';

/**
 * Static/CMS content: GET /public/page?page=<slug>, GET /public/contacts,
 * GET /public/partners, GET /public/sponsors, POST /public/contact/submit.
 */
@Component({
  selector: 'app-info',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonSpinner, TPipe, SkeletonComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ title() }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="eayni-page">
        @if (loading()) { <app-skeleton [count]="3" [height]="110"></app-skeleton> }
        @else if (slug() === 'contact') {
          @if (contacts(); as c) {
            <div class="eayni-card contacts">
              @if (c.phone) { <a [href]="'tel:' + c.phone"><ion-icon name="call-outline"></ion-icon><span dir="ltr">{{ c.phone }}</span></a> }
              @if (c.whatsapp) { <a [href]="'https://wa.me/' + c.whatsapp.replace('+', '')" target="_blank" rel="noopener"><ion-icon name="logo-whatsapp"></ion-icon><span dir="ltr">{{ c.whatsapp }}</span></a> }
              @if (c.email) { <a [href]="'mailto:' + c.email"><ion-icon name="mail-outline"></ion-icon><span dir="ltr">{{ c.email }}</span></a> }
              @if (c.address) { <div><ion-icon name="location-outline"></ion-icon><span>{{ c.address }}</span></div> }
              @if (c.social.length) { <div class="social">@for (s of c.social; track s.url) { <a [href]="s.url" target="_blank" rel="noopener" [attr.aria-label]="s.name"><ion-icon [name]="socialIcon(s.name)"></ion-icon></a> }</div> }
            </div>
          }
          <form class="eayni-card form" (submit)="sendContact($event)">
            <div class="eayni-field"><label>{{ 'info.contact.name' | t }}</label><input class="eayni-input" [value]="form().name" (input)="patch('name', $any($event.target).value)" required /></div>
            <div class="eayni-field"><label>{{ 'profile.email' | t }}</label><input class="eayni-input" type="email" dir="ltr" [value]="form().email" (input)="patch('email', $any($event.target).value)" /></div>
            <div class="eayni-field"><label>{{ 'info.contact.message' | t }}</label><textarea class="eayni-input" [value]="form().message" (input)="patch('message', $any($event.target).value)" required></textarea></div>
            <ion-button expand="block" type="submit" class="eayni-btn" [disabled]="sending() || !form().name || !form().message">@if (sending()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ 'common.send' | t }} }</ion-button>
          </form>
        }
        @else if (slug() === 'partners') {
          @if (!partners().length) { <p class="eayni-muted">{{ 'info.notLoaded' | t }}</p> }
          <div class="partners eayni-stagger">
            @for (p of partners(); track p.id) {
              <a class="partner eayni-card" [href]="p.url || null" [target]="p.url ? '_blank' : null" rel="noopener">
                @if (p.image) { <img [src]="p.image" [alt]="p.name" loading="lazy" /> } @else { <ion-icon name="business-outline"></ion-icon> }
                <strong>{{ p.name }}</strong>
              </a>
            }
          </div>
        }
        @else {
          @if (page()?.content) {
            @if (page()?.image) { <img class="hero" [src]="page()!.image" alt="" /> }
            <article class="eayni-card prose" [innerHTML]="html()"></article>
          } @else {
            <p class="eayni-muted">{{ 'info.notLoaded' | t }}</p>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .contacts { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
    .contacts a, .contacts > div { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; font-weight: 600; }
    .contacts ion-icon { font-size: 20px; color: var(--ion-color-primary); }
    .social { display: flex; gap: 8px; } .social a { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--eayni-surface-2); }
    .partners { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .partner { display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; color: inherit; text-align: center; }
    .partner img { width: 72px; height: 72px; object-fit: contain; } .partner ion-icon { font-size: 40px; color: var(--eayni-text-3); }
    .hero { width: 96px; height: 96px; object-fit: contain; display: block; margin: 6px auto 14px; }
    .prose { line-height: 1.75; font-size: 15px; } .prose :is(h2,h3,h4) { margin: 14px 0 6px; font-size: 16px; } .prose p { margin: 0 0 10px; } .prose ul, .prose ol { padding-inline-start: 20px; margin: 0 0 10px; } .prose :is(img) { max-width: 100%; border-radius: 12px; }
  `],
})
export class InfoPage implements OnInit {
  readonly slug = input.required<string>();
  private readonly i18n = inject(I18nService);
  private readonly api = inject(PublicApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly page = signal<StaticPage | null>(null);
  readonly contacts = signal<ContactInfo | null>(null);
  readonly partners = signal<Partner[]>([]);
  readonly form = signal({ name: '', email: '', message: '' });
  readonly sending = signal(false);
  readonly html = computed<SafeHtml>(() => {
    const content = this.page()?.content ?? '';
    const looksHtml = /<\/?[a-z][\s\S]*>/i.test(content);
    return this.sanitizer.sanitize(1, looksHtml ? content : markdownToHtml(content)) ?? '';
  });
  readonly title = computed(() => {
    const key: Record<string, string> = { about: 'info.about', contact: 'info.contact', partners: 'info.partners', privacy: 'profile.privacy', terms: 'profile.terms' };
    return this.page()?.title || this.i18n.t(key[this.slug()] ?? 'info.about');
  });

  async ngOnInit(): Promise<void> {
    const u = this.auth.user();
    this.form.set({ name: u?.name ?? '', email: u?.email ?? '', message: '' });
    try {
      if (this.slug() === 'contact') this.contacts.set(await this.api.contacts());
      else if (this.slug() === 'partners') {
        const [p, s] = await Promise.allSettled([this.api.partners(), this.api.sponsors()]);
        this.partners.set([...(s.status === 'fulfilled' ? s.value : []), ...(p.status === 'fulfilled' ? p.value.items : [])]);
      } else this.page.set(await this.api.page(this.slug()));
    } catch { /* content may be unavailable offline */ }
    this.loading.set(false);
  }

  patch(k: 'name' | 'email' | 'message', v: string): void { this.form.update((f) => ({ ...f, [k]: v })); }

  socialIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('insta')) return 'logo-instagram'; if (n.includes('twitter') || n === 'x') return 'logo-twitter'; if (n.includes('face')) return 'logo-facebook';
    if (n.includes('linked')) return 'logo-linkedin'; if (n.includes('tiktok')) return 'logo-tiktok'; if (n.includes('you')) return 'logo-youtube'; if (n.includes('snap')) return 'logo-snapchat';
    return 'link-outline';
  }

  async sendContact(ev: Event): Promise<void> {
    ev.preventDefault();
    this.sending.set(true);
    try {
      const f = this.form();
      await this.api.submitContact({ name: f.name, email: f.email || undefined, phone: this.auth.user()?.phone, message: f.message });
      this.form.update((x) => ({ ...x, message: '' }));
      await this.toast.success('info.contact.sent');
    } catch (e) { await this.toast.error(e); }
    finally { this.sending.set(false); }
  }
}
