import { Component, computed, inject, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { TPipe } from '../../../core/i18n/t.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { JOURNEY, Stage, stageIcon, stageOf } from '../../../core/utils/order-status';
import type { OrderStatusHistoryEntry } from '../../../core/models';

@Component({
  selector: 'app-stage-timeline',
  imports: [IonIcon, TPipe],
  template: `
    <ol class="tl" [class.tl--compact]="compact()">
      @for (s of stages(); track s.stage) {
        <li class="tl__item" [class.done]="s.done" [class.current]="s.current" [class.cancelled]="s.cancelled">
          <div class="tl__marker">
            <ion-icon [name]="s.icon"></ion-icon>
          </div>
          <div class="tl__body">
            <div class="tl__title">{{ ('track.stage.' + s.stage) | t }}</div>
            @if (!compact()) {
              <div class="tl__desc">
                @if (s.current && info().inferred && info().stage === 'unknown') {
                  {{ 'track.stage.unknown.desc' | t: { status: status() } }}
                } @else if (s.current || s.done) {
                  {{ ('track.stage.' + s.stage + '.desc') | t }}
                }
              </div>
              @if (s.at) { <div class="tl__time">{{ i18n.formatDate(s.at) }}</div> }
            }
          </div>
        </li>
      }
    </ol>
  `,
  styles: [`
    .tl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
    .tl__item { display: grid; grid-template-columns: 36px 1fr; gap: 12px; position: relative; padding-bottom: 18px; }
    .tl__item:not(:last-child)::before { content: ''; position: absolute; inset-inline-start: 17px; top: 36px; bottom: 0; width: 2px; background: var(--eayni-border); border-radius: 2px; }
    .tl__item.done:not(:last-child)::before { background: var(--ion-color-primary); }
    .tl__marker { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--eayni-surface-2); color: var(--eayni-text-3); border: 2px solid var(--eayni-border); font-size: 18px; transition: all .25s ease; }
    .done .tl__marker { background: var(--ion-color-primary); color: #fff; border-color: var(--ion-color-primary); }
    .current .tl__marker { background: var(--ion-color-primary-tint); color: var(--ion-color-primary-contrast); border-color: var(--ion-color-primary); box-shadow: 0 0 0 6px color-mix(in srgb, var(--ion-color-primary) 18%, transparent); animation: pulse 1.8s ease-in-out infinite; }
    .cancelled .tl__marker { background: var(--ion-color-danger); border-color: var(--ion-color-danger); color: #fff; }
    .tl__title { font-weight: 600; color: var(--eayni-text-3); padding-top: 7px; }
    .done .tl__title, .current .tl__title { color: var(--eayni-text); }
    .tl__desc { font-size: 13px; color: var(--eayni-text-2); margin-top: 2px; line-height: 1.45; }
    .tl__time { font-size: 12px; color: var(--eayni-text-3); margin-top: 4px; }
    .tl--compact .tl__item { padding-bottom: 10px; grid-template-columns: 28px 1fr; gap: 10px; }
    .tl--compact .tl__marker { width: 28px; height: 28px; font-size: 14px; }
    .tl--compact .tl__item:not(:last-child)::before { inset-inline-start: 13px; top: 28px; }
    .tl--compact .tl__title { font-size: 14px; padding-top: 4px; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--ion-color-primary) 22%, transparent); } 50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--ion-color-primary) 6%, transparent); } }
  `],
})
export class StageTimelineComponent {
  readonly i18n = inject(I18nService);
  readonly status = input<string>('');
  readonly history = input<OrderStatusHistoryEntry[]>([]);
  readonly compact = input(false);

  readonly info = computed(() => stageOf(this.status()));

  readonly stages = computed(() => {
    const info = this.info();
    const hist = this.history();
    const atFor = (stage: Stage): string | undefined => hist.find((h) => stageOf(h.status).stage === stage)?.at;
    if (info.stage === 'cancelled') {
      const submittedAt = atFor('submitted');
      return [
        { stage: 'submitted' as Stage, icon: stageIcon('submitted'), done: true, current: false, cancelled: false, at: submittedAt },
        { stage: 'cancelled' as Stage, icon: stageIcon('cancelled'), done: false, current: true, cancelled: true, at: atFor('cancelled') },
      ];
    }
    const currentStep = info.stage === 'unknown' ? 1 : info.step;
    return JOURNEY.map((stage, i) => ({
      stage,
      icon: stageIcon(stage),
      done: i + 1 < currentStep || (info.stage === 'completed' && i + 1 <= currentStep),
      current: i + 1 === currentStep && info.stage !== 'completed',
      cancelled: false,
      at: atFor(stage),
    }));
  });
}
