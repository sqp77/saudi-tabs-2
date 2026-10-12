import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-empty-state',
  imports: [IonButton, IonIcon],
  template: `
    <div class="empty">
      <div class="empty__art"><ion-icon [name]="icon()"></ion-icon></div>
      <h3>{{ title() }}</h3>
      @if (subtitle()) { <p>{{ subtitle() }}</p> }
      @if (cta()) {
        <ion-button (click)="action.emit()" shape="round" class="eayni-btn">{{ cta() }}</ion-button>
      }
    </div>
  `,
  styles: [`
    .empty { text-align: center; padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .empty__art { width: 88px; height: 88px; border-radius: 28px; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-primary) 10%, transparent); color: var(--ion-color-primary); font-size: 40px; margin-bottom: 8px; }
    h3 { margin: 0; font-size: 18px; font-weight: 700; }
    p { margin: 0; color: var(--eayni-text-2); max-width: 300px; line-height: 1.5; }
    ion-button { margin-top: 10px; }
  `],
})
export class EmptyStateComponent {
  readonly icon = input('leaf-outline');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly cta = input<string>('');
  readonly action = output<void>();
}
