import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { TPipe } from '../../../core/i18n/t.pipe';
import { stageColor, stageIcon, stageOf } from '../../../core/utils/order-status';

@Component({
  selector: 'app-status-chip',
  imports: [IonIcon, TPipe],
  template: `
    <span class="chip" [attr.data-color]="color()" [title]="status()">
      <ion-icon [name]="icon()"></ion-icon>
      <span>{{ ('track.stage.' + info().stage) | t }}</span>
    </span>
  `,
  styles: [`
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 600; line-height: 1; background: color-mix(in srgb, var(--c) 14%, transparent); color: var(--c); white-space: nowrap; }
    .chip ion-icon { font-size: 14px; }
    .chip[data-color="primary"] { --c: var(--ion-color-primary); }
    .chip[data-color="success"] { --c: var(--ion-color-success); }
    .chip[data-color="warning"] { --c: var(--ion-color-warning-shade); }
    .chip[data-color="danger"] { --c: var(--ion-color-danger); }
    .chip[data-color="medium"] { --c: var(--eayni-text-2); }
  `],
})
export class StatusChipComponent {
  readonly status = input<string>('');
  readonly info = computed(() => stageOf(this.status()));
  readonly color = computed(() => stageColor(this.info().stage));
  readonly icon = computed(() => stageIcon(this.info().stage));
}
