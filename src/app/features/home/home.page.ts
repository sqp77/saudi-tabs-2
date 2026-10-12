import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, ViewWillEnter } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { PublicApi } from '../../core/api/public-api.service';
import { AccountApi } from '../../core/api/account-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { Banner, Campaign, ItemCategory } from '../../core/models';
import { ImpactService } from '../../core/services/impact.service';
import { OrdersStore } from '../../core/services/orders.store';
import { categoryIcon } from '../../core/utils/category-icon';
import { StatTileComponent } from '../../shared/components/stat-tile/stat-tile.component';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

@Component({
  selector: 'app-home',
  imports: [IonContent, IonIcon, IonRefresher, IonRefresherContent, TPipe, StatTileComponent, SectionTitleComponent, StatusChipComponent],
  template: `
    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="eayni-page">
        <header class="top">
          <div>
            <div class="greet">{{ greeting() | t }}@if (auth.user()?.name) {, {{ firstName() }}}</div>
            <div class="brand">{{ 'app.name' | t }} <span class="dot">•</span> <span class="tag">{{ 'app.tagline' | t }}</span></div>
          </div>
          <div class="top__actions">
            <button type="button" class="iconbtn" (click)="i18n.toggle()" [attr.aria-label]="'profile.language' | t">{{ i18n.lang() === 'ar' ? 'EN' : 'ع' }}</button>
            @if (auth.isAuthenticated()) {
              <button type="button" class="iconbtn" (click)="go('/notifications')" [attr.aria-label]="'notif.title' | t">
                <ion-icon name="notifications-outline"></ion-icon>
                @if (unread() > 0) { <span class="badge">{{ unread() }}</span> }
              </button>
            }
          </div>
        </header>

        @if (!apiConfigured) {
          <div class="eayni-note" role="alert"><ion-icon name="warning-outline"></ion-icon><span>{{ 'common.apiNotConfigured' | t }}</span></div>
        }

        <!-- Active request -->
        @if (active(); as o) {
          <section class="active eayni-card eayni-fade-up" (click)="go('/orders/' + o.id)">
            <div class="active__head">
              <div class="active__title"><span class="live"></span>{{ 'home.active.title' | t }}</div>
              <app-status-chip [status]="o.status"></app-status-chip>
            </div>
            <div class="active__desc">{{ 'orders.code' | t }} #{{ o.code || o.id.slice(-6).toUpperCase() }} · {{ i18n.formatDate(o.createdAt) }}</div>
            <div class="eayni-note eayni-note--info contact48"><ion-icon name="call-outline"></ion-icon><span>{{ 'orders.contact48' | t }}</span></div>
            <div class="active__cta">{{ 'home.active.view' | t }} <ion-icon [name]="i18n.isRtl() ? 'arrow-back' : 'arrow-forward'"></ion-icon></div>
          </section>
        } @else {
          <section class="hero eayni-fade-up" (click)="go('/donate')">
            <div class="hero__text">
              <h1>{{ 'home.hero.title' | t }}</h1>
              <p>{{ 'home.hero.subtitle' | t }}</p>
              <span class="hero__btn">{{ 'home.hero.cta' | t }} <ion-icon [name]="i18n.isRtl() ? 'arrow-back' : 'arrow-forward'"></ion-icon></span>
            </div>
            <div class="hero__art" aria-hidden="true"><ion-icon name="shirt"></ion-icon><ion-icon name="footsteps"></ion-icon><ion-icon name="bag-handle"></ion-icon></div>
          </section>
        }

        @if (pendingRate(); as r) {
          <section class="rate eayni-card eayni-fade-up" (click)="go('/orders/' + r.id)">
            <ion-icon name="star"></ion-icon>
            <div class="rate__text">{{ 'home.rate.title' | t }}</div>
            <span class="rate__cta">{{ 'home.rate.cta' | t }}</span>
          </section>
        }

        <!-- Quick actions -->
        <nav class="quick eayni-stagger">
          @if (features.containers) { <button type="button" (click)="go('/containers')"><ion-icon name="trash-bin-outline"></ion-icon><span>{{ 'home.quick.containers' | t }}</span></button> }
          @if (features.rewards) { <button type="button" (click)="go('/rewards')"><ion-icon name="gift-outline"></ion-icon><span>{{ 'home.quick.rewards' | t }}</span></button> }
          @if (features.assistant) { <button type="button" (click)="go('/assistant')"><ion-icon name="sparkles-outline"></ion-icon><span>{{ 'home.quick.assistant' | t }}</span></button> }
          <button type="button" (click)="go('/tabs/orders')"><ion-icon name="time-outline"></ion-icon><span>{{ 'home.quick.history' | t }}</span></button>
        </nav>

        <!-- Impact -->
        @if (auth.isAuthenticated() && orders.loaded()) {
          <app-section-title [title]="'home.impact.title' | t" [action]="'common.seeAll' | t" (actionClick)="go('/tabs/impact')"></app-section-title>
          <div class="eayni-grid-3 eayni-stagger">
            <app-stat-tile icon="checkmark-done-outline" [value]="i18n.formatNumber(impact.completedCount())" [label]="'home.impact.donations' | t" [accent]="true"></app-stat-tile>
            <app-stat-tile icon="shirt-outline" [value]="i18n.formatNumber(impact.totalItems())" [label]="'home.impact.items' | t"></app-stat-tile>
            <app-stat-tile icon="leaf-outline" [value]="points() === null ? '—' : i18n.formatNumber(points()!)" [label]="'home.impact.points' | t"></app-stat-tile>
          </div>
        }

        <!-- Categories -->
        @if (categories().length) {
          <app-section-title [title]="'home.categories.title' | t"></app-section-title>
          <div class="cats">
            @for (c of categories(); track c.id) {
              <button type="button" class="cat" (click)="go('/donate', { category: c.id })">
                @if (c.image) { <img [src]="c.image" alt="" loading="lazy" /> } @else { <ion-icon [name]="iconFor(c)"></ion-icon> }
                <span>{{ i18n.lang() === 'ar' ? (c.nameAr || c.name) : (c.nameEn || c.name) }}</span>
              </button>
            }
          </div>
        }

        <!-- Campaign banners -->
        @if (banners().length) {
          <app-section-title [title]="'home.campaigns.title' | t"></app-section-title>
          <div class="banners">
            @for (b of banners(); track b.id) {
              <a class="banner" [href]="b.url || null" [target]="b.url ? '_blank' : null" rel="noopener">
                <img [src]="b.image" [alt]="b.title || ''" loading="lazy" />
                @if (b.title) { <span>{{ b.title }}</span> }
              </a>
            }
          </div>
        }

        <!-- Initiatives (social services) -->
        @if (campaigns().length) {
          <app-section-title [title]="'home.initiatives.title' | t"></app-section-title>
          <div class="banners">
            @for (c of campaigns(); track c.id) {
              <article class="campaign">
                @if (c.image) { <img [src]="c.image" alt="" loading="lazy" /> }
                <div class="campaign__body"><strong>{{ c.title }}</strong>@if (c.content) { <p>{{ c.content }}</p> }</div>
              </article>
            }
          </div>
        }

        <!-- Tip -->
        <section class="tip eayni-card">
          <ion-icon name="bulb-outline"></ion-icon>
          <div><strong>{{ 'home.tips.title' | t }}</strong><p>{{ 'home.tips.body' | t }}</p></div>
        </section>
      </div>

      @if (ad() && !adDismissed()) {
        <div class="ad" role="dialog" aria-modal="true" (click)="dismissAd()">
          <div class="ad__card" (click)="$event.stopPropagation()">
            <button type="button" class="ad__close" (click)="dismissAd()" [attr.aria-label]="'common.close' | t"><ion-icon name="close"></ion-icon></button>
            <img [src]="ad()!.image" alt="" />
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .top { display: flex; justify-content: space-between; align-items: center; padding: calc(env(safe-area-inset-top) + 16px) 0 16px; }
    .greet { font-size: 20px; font-weight: 900; letter-spacing: -0.01em; }
    .brand { font-size: 12.5px; color: var(--eayni-text-2); margin-top: 2px; }
    .brand .dot { opacity: .5; margin: 0 4px; }
    .top__actions { display: flex; gap: 8px; }
    .iconbtn { position: relative; width: 42px; height: 42px; border-radius: 14px; border: 1px solid var(--eayni-border); background: var(--eayni-surface); color: var(--eayni-text); font: inherit; font-weight: 800; font-size: 14px; display: grid; place-items: center; }
    .iconbtn ion-icon { font-size: 20px; }
    .badge { position: absolute; top: -4px; inset-inline-end: -4px; min-width: 18px; height: 18px; border-radius: 9px; background: var(--ion-color-danger); color: #fff; font-size: 11px; display: grid; place-items: center; padding: 0 4px; }

    .hero { position: relative; overflow: hidden; border-radius: 24px; padding: 22px; background: linear-gradient(135deg, #0e7a4f 0%, #1db47a 100%); color: #fff; display: flex; justify-content: space-between; align-items: center; gap: 12px; cursor: pointer; box-shadow: var(--eayni-shadow-lg); }
    .hero h1 { margin: 0 0 4px; font-size: 24px; font-weight: 900; }
    .hero p { margin: 0 0 14px; opacity: .9; font-size: 14px; }
    .hero__btn { display: inline-flex; align-items: center; gap: 6px; background: #fff; color: #0e7a4f; font-weight: 800; padding: 10px 16px; border-radius: 999px; font-size: 14px; }
    .hero__art { display: grid; gap: 8px; font-size: 26px; opacity: .9; }
    .hero__art ion-icon { background: rgba(255,255,255,.16); border-radius: 14px; padding: 10px; }
    .hero__art ion-icon:nth-child(2) { transform: translateX(-10px); }

    .active { cursor: pointer; border-color: color-mix(in srgb, var(--ion-color-primary) 35%, var(--eayni-border)); }
    .active__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .active__title { display: flex; align-items: center; gap: 8px; font-weight: 800; }
    .live { width: 9px; height: 9px; border-radius: 50%; background: var(--ion-color-success); box-shadow: 0 0 0 0 color-mix(in srgb, var(--ion-color-success) 50%, transparent); animation: live 1.6s infinite; }
    @keyframes live { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ion-color-success) 50%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
    .active__desc { color: var(--eayni-text-2); font-size: 13.5px; margin-bottom: 12px; }
    .contact48 { margin-bottom: 10px; }
    .active__cta { display: flex; align-items: center; gap: 6px; font-weight: 800; color: var(--ion-color-primary); margin-top: 4px; }

    .rate { margin-top: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .rate ion-icon { font-size: 24px; color: var(--ion-color-warning); }
    .rate__text { flex: 1; font-weight: 700; font-size: 14px; }
    .rate__cta { color: var(--ion-color-primary); font-weight: 800; font-size: 13px; }

    .quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
    .quick button { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 6px; border-radius: var(--eayni-radius); background: var(--eayni-surface); border: 1px solid var(--eayni-border); font: inherit; font-size: 11.5px; font-weight: 700; color: var(--eayni-text); }
    .quick ion-icon { font-size: 24px; color: var(--ion-color-primary); }

    .cats { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; -ms-overflow-style: none; scrollbar-width: none; }
    .cats::-webkit-scrollbar { display: none; }
    .cat { flex: none; width: 104px; scroll-snap-align: start; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px; border-radius: var(--eayni-radius); background: var(--eayni-surface); border: 1px solid var(--eayni-border); font: inherit; font-size: 12.5px; font-weight: 700; color: var(--eayni-text); }
    .cat ion-icon { font-size: 28px; color: var(--ion-color-primary); }
    .cat img { width: 44px; height: 44px; object-fit: contain; }
    .cat span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

    .banners { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .banners::-webkit-scrollbar { display: none; }
    .banner { flex: none; width: 84%; max-width: 420px; aspect-ratio: 21 / 9; border-radius: var(--eayni-radius); overflow: hidden; position: relative; scroll-snap-align: start; background: var(--eayni-surface-2); }
    .banner img { width: 100%; height: 100%; object-fit: cover; }
    .banner span { position: absolute; inset-inline: 0; bottom: 0; padding: 12px; color: #fff; font-weight: 800; background: linear-gradient(transparent, rgba(0,0,0,.6)); }

    .campaign { flex: none; width: 84%; max-width: 420px; border-radius: var(--eayni-radius); overflow: hidden; background: var(--eayni-surface); border: 1px solid var(--eayni-border); scroll-snap-align: start; }
    .campaign img { width: 100%; aspect-ratio: 21 / 10; object-fit: cover; }
    .campaign__body { padding: 12px 14px; } .campaign__body strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .campaign__body p { margin: 0; font-size: 12.5px; color: var(--eayni-text-2); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .ad { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,.6); display: grid; place-items: center; padding: 24px; backdrop-filter: blur(4px); }
    .ad__card { position: relative; max-width: 420px; width: 100%; border-radius: 22px; overflow: hidden; background: var(--eayni-surface); box-shadow: var(--eayni-shadow-lg); animation: eayni-fade-up .3s ease both; }
    .ad__card img { width: 100%; display: block; max-height: 70vh; object-fit: contain; }
    .ad__close { position: absolute; top: 10px; inset-inline-end: 10px; width: 36px; height: 36px; border-radius: 50%; border: 0; background: rgba(0,0,0,.55); color: #fff; display: grid; place-items: center; font-size: 20px; z-index: 1; }
    .tip { margin-top: 18px; display: flex; gap: 12px; align-items: flex-start; background: var(--eayni-sand); border-color: transparent; }
    .tip ion-icon { font-size: 22px; color: var(--ion-color-tertiary-shade); flex: none; }
    .tip p { margin: 4px 0 0; font-size: 13.5px; color: var(--eayni-text-2); line-height: 1.5; }
  `],
})
export class HomePage implements ViewWillEnter {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly orders = inject(OrdersStore);
  readonly impact = inject(ImpactService);
  private readonly publicApi = inject(PublicApi);
  private readonly account = inject(AccountApi);
  private readonly router = inject(Router);

  readonly features = environment.features;
  readonly apiConfigured = !!environment.clientApiUrl;
  readonly categories = signal<ItemCategory[]>([]);
  readonly banners = signal<Banner[]>([]);
  readonly campaigns = signal<Campaign[]>([]);
  readonly ad = signal<Banner | null>(null);
  readonly adDismissed = signal(readAdDismissed());
  readonly points = signal<number | null>(null);
  readonly unread = signal(0);
  readonly active = this.orders.currentActive;
  readonly pendingRate = this.orders.pendingRate;

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'home.greeting.morning' : h < 17 ? 'home.greeting.afternoon' : 'home.greeting.evening';
  });
  readonly firstName = computed(() => (this.auth.user()?.name ?? '').trim().split(/\s+/)[0] ?? '');

  ionViewWillEnter(): void {
    void this.loadPublic();
    if (this.auth.isAuthenticated()) void this.loadPrivate();
  }

  private async loadPublic(): Promise<void> {
    const [cats, banners, campaigns, ad] = await Promise.allSettled([this.publicApi.categories(), this.publicApi.banners(), this.publicApi.campaigns(), this.publicApi.ad()]);
    if (cats.status === 'fulfilled') this.categories.set(cats.value);
    if (banners.status === 'fulfilled') this.banners.set(banners.value);
    if (campaigns.status === 'fulfilled') this.campaigns.set(campaigns.value.items);
    if (ad.status === 'fulfilled') this.ad.set(ad.value);
  }

  private async loadPrivate(): Promise<void> {
    await Promise.allSettled([
      this.orders.refresh({ silent: this.orders.loaded() }),
      this.orders.refreshCheck(),
      this.account.points().then((p) => this.points.set(p.balance)),
      this.account.notifications().then((n) => this.unread.set(n.items.filter((x) => x.read === false).length)),
    ]);
  }

  async refresh(ev: CustomEvent): Promise<void> {
    this.publicApi.clearCache();
    await Promise.allSettled([this.loadPublic(), this.auth.isAuthenticated() ? this.loadPrivate() : Promise.resolve()]);
    (ev.target as HTMLIonRefresherElement).complete();
  }

  dismissAd(): void {
    this.adDismissed.set(true);
    try { localStorage.setItem('eayni.ad.dismissed', new Date().toDateString()); } catch { /* ignore */ }
  }

  go(url: string, query?: Record<string, string>): void {
    void this.router.navigate([url], { queryParams: query });
  }

  iconFor(c: ItemCategory): string { return categoryIcon(c); }
}

function readAdDismissed(): boolean {
  try { return localStorage.getItem('eayni.ad.dismissed') === new Date().toDateString(); } catch { return false; }
}
