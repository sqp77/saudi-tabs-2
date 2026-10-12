import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { SavedPlace } from '../../core/models';
import { SavedPlacesService } from '../../core/services/saved-places.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-places',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, TPipe, EmptyStateComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'places.title' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="eayni-page">
        <div class="eayni-note eayni-note--info"><ion-icon name="phone-portrait-outline"></ion-icon><span>{{ 'places.localNote' | t }}</span></div>
        @if (!places.places().length) {
          <app-empty-state icon="bookmark-outline" [title]="'places.empty' | t" [cta]="'home.hero.cta' | t" (action)="go('/donate')"></app-empty-state>
        } @else {
          <div class="list eayni-stagger">
            @for (p of places.places(); track p.id) {
              <div class="place eayni-card">
                <div class="icon"><ion-icon [name]="p.kind === 'home' ? 'home-outline' : p.kind === 'work' ? 'briefcase-outline' : 'bookmark-outline'"></ion-icon></div>
                <div class="body"><strong>{{ p.label }}</strong><span class="eayni-small eayni-muted">{{ [p.address, p.cityName].join(' · ') || (p.location.lat.toFixed(5) + ', ' + p.location.lng.toFixed(5)) }}</span></div>
                <button type="button" class="act" (click)="rename(p)" [attr.aria-label]="'common.edit' | t"><ion-icon name="create-outline"></ion-icon></button>
                <button type="button" class="act danger" (click)="remove(p)" [attr.aria-label]="'common.delete' | t"><ion-icon name="trash-outline"></ion-icon></button>
              </div>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .place { display: flex; align-items: center; gap: 12px; padding: 12px; }
    .icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent); color: var(--ion-color-primary); font-size: 20px; }
    .body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .act { width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--eayni-surface-2); color: var(--eayni-text-2); display: grid; place-items: center; font-size: 17px; }
    .danger { color: var(--ion-color-danger); }
  `],
})
export class PlacesPage implements OnInit {
  readonly places = inject(SavedPlacesService);
  private readonly i18n = inject(I18nService);
  private readonly alerts = inject(AlertController);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  ngOnInit(): void { void this.places.load(); }
  go(url: string): void { void this.router.navigateByUrl(url); }

  async rename(p: SavedPlace): Promise<void> {
    const a = await this.alerts.create({ header: this.i18n.t('places.label'), inputs: [{ name: 'label', value: p.label, type: 'text' }], buttons: [{ text: this.i18n.t('common.cancel'), role: 'cancel' }, { text: this.i18n.t('common.save'), handler: (v: { label: string }) => { if (v.label?.trim()) void this.places.update(p.id, { label: v.label.trim() }); } }] });
    await a.present();
  }

  async remove(p: SavedPlace): Promise<void> {
    await this.places.remove(p.id);
    await this.toast.success('places.deleted');
  }
}
