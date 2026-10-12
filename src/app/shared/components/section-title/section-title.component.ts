import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-section-title',
  template: `
    <div class="st">
      <h2>{{ title() }}</h2>
      @if (action()) { <button type="button" class="st__action" (click)="actionClick.emit()">{{ action() }}</button> }
    </div>
  `,
  styles: [`
    .st { display: flex; align-items: baseline; justify-content: space-between; margin: 22px 0 10px; }
    h2 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; }
    .st__action { background: none; border: 0; font: inherit; font-size: 13px; font-weight: 600; color: var(--ion-color-primary); cursor: pointer; padding: 4px 0; }
  `],
})
export class SectionTitleComponent {
  readonly title = input.required<string>();
  readonly action = input<string>('');
  readonly actionClick = output<void>();
}
