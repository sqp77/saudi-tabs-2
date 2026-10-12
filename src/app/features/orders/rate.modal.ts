import { Component, inject, input, signal } from '@angular/core';
import { IonButton, IonContent, IonIcon, IonSpinner, ModalController } from '@ionic/angular';
import { OrderApi } from '../../core/api/order-api.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { Order } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-rate-modal',
  imports: [IonContent, IonButton, IonIcon, IonSpinner, TPipe],
  template: `
    <ion-content class="ion-padding">
      <h2>{{ 'orders.rate.title' | t }}</h2>
      <p class="eayni-muted">{{ 'orders.rate.subtitle' | t }}</p>
      <div class="stars" role="radiogroup">
        @for (s of [1,2,3,4,5]; track s) {
          <button type="button" role="radio" [attr.aria-checked]="stars() === s" (click)="stars.set(s)" [class.on]="s <= stars()"><ion-icon [name]="s <= stars() ? 'star' : 'star-outline'"></ion-icon></button>
        }
      </div>
      <textarea class="eayni-input" [placeholder]="'orders.rate.review' | t" [value]="review()" (input)="review.set($any($event.target).value)" maxlength="400"></textarea>
      <ion-button expand="block" class="eayni-btn" [disabled]="!stars() || busy()" (click)="submit()">
        @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ 'orders.rate.submit' | t }} }
      </ion-button>
      <ion-button expand="block" fill="clear" class="eayni-btn" (click)="close()">{{ 'common.cancel' | t }}</ion-button>
    </ion-content>
  `,
  styles: [`
    h2 { margin: 6px 0 4px; font-weight: 900; }
    p { margin: 0 0 16px; }
    .stars { display: flex; justify-content: center; gap: 8px; margin: 10px 0 18px; }
    .stars button { background: none; border: 0; font-size: 38px; color: var(--eayni-border); transition: transform .15s ease, color .15s ease; }
    .stars button.on { color: var(--ion-color-warning); transform: scale(1.1); }
    textarea { margin-bottom: 16px; }
  `],
})
export class RateModalComponent {
  readonly order = input.required<Order>();
  private readonly api = inject(OrderApi);
  private readonly modal = inject(ModalController);
  private readonly toast = inject(ToastService);
  readonly stars = signal(0);
  readonly review = signal('');
  readonly busy = signal(false);

  async submit(): Promise<void> {
    if (!this.stars()) return;
    this.busy.set(true);
    try {
      await this.api.rate(this.order().id, this.stars(), this.review());
      await this.modal.dismiss({ stars: this.stars(), review: this.review() });
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  close(): void { void this.modal.dismiss(); }
}
