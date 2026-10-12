import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    @for (i of rows(); track i) {
      <div class="sk" [style.height.px]="height()"></div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 12px; }
    .sk { border-radius: var(--eayni-radius); background: linear-gradient(90deg, var(--eayni-surface-2) 25%, color-mix(in srgb, var(--eayni-surface-2) 60%, var(--eayni-surface)) 50%, var(--eayni-surface-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `],
})
export class SkeletonComponent {
  readonly count = input(3);
  readonly height = input(84);
  rows(): number[] { return Array.from({ length: this.count() }, (_, i) => i); }
}
