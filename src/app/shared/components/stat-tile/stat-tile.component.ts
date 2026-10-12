import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-stat-tile',
  imports: [IonIcon],
  template: `
    <div class="tile" [class.tile--accent]="accent()">
      <div class="tile__icon"><ion-icon [name]="icon()"></ion-icon></div>
      <div class="tile__value">{{ value() }}</div>
      <div class="tile__label">{{ label() }}</div>
      @if (badge()) { <span class="tile__badge">{{ badge() }}</span> }
    </div>
  `,
  styles: [`
    .tile { position: relative; background: var(--eayni-surface); border: 1px solid var(--eayni-border); border-radius: var(--eayni-radius); padding: 14px; display: flex; flex-direction: column; gap: 6px; min-height: 108px; }
    .tile--accent { background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-shade)); color: #fff; border-color: transparent; }
    .tile__icon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent); color: var(--ion-color-primary); font-size: 18px; }
    .tile--accent .tile__icon { background: rgba(255,255,255,.18); color: #fff; }
    .tile__value { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; margin-top: auto; font-variant-numeric: tabular-nums; }
    .tile__label { font-size: 12.5px; color: var(--eayni-text-2); }
    .tile--accent .tile__label { color: rgba(255,255,255,.85); }
    .tile__badge { position: absolute; top: 10px; inset-inline-end: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 7px; border-radius: 999px; background: color-mix(in srgb, var(--eayni-text) 8%, transparent); color: var(--eayni-text-2); }
    .tile--accent .tile__badge { background: rgba(255,255,255,.2); color: #fff; }
  `],
})
export class StatTileComponent {
  readonly icon = input.required<string>();
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly accent = input(false);
  readonly badge = input<string>('');
}
