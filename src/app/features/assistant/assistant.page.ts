import { Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { AssistantReply, AssistantService } from '../../core/services/assistant.service';

interface Turn { role: 'user' | 'bot'; text: string; actions?: AssistantReply['actions'] }

@Component({
  selector: 'app-assistant',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonIcon, TPipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'assistant.title' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content #content>
      <div class="eayni-page chat">
        <div class="bot-intro">
          <div class="orb"><ion-icon name="sparkles"></ion-icon></div>
          <p class="eayni-small eayni-muted">{{ 'assistant.local' | t }}</p>
        </div>
        <div class="turn bot"><div class="bubble">{{ 'assistant.hello' | t }}</div></div>
        @for (t of turns(); track $index) {
          <div class="turn" [class.user]="t.role === 'user'" [class.bot]="t.role === 'bot'">
            <div class="bubble">{{ t.text }}</div>
            @if (t.actions?.length) {
              <div class="actions">@for (a of t.actions; track a.route) { <button type="button" (click)="go(a.route)">{{ a.labelKey | t }}</button> }</div>
            }
          </div>
        }
        @if (thinking()) { <div class="turn bot"><div class="bubble typing"><span></span><span></span><span></span></div></div> }
        @if (!turns().length) {
          <div class="suggest">
            @for (k of ['assistant.suggest.1','assistant.suggest.2','assistant.suggest.3','assistant.suggest.4']; track k) { <button type="button" (click)="ask(i18n.t(k))">{{ k | t }}</button> }
          </div>
        }
      </div>
    </ion-content>
    <ion-footer class="ion-no-border">
      <form class="composer" (submit)="submit($event)">
        <input class="eayni-input" [placeholder]="'assistant.placeholder' | t" [value]="text()" (input)="text.set($any($event.target).value)" maxlength="300" autocomplete="off" />
        <button type="submit" [disabled]="!text().trim() || thinking()" [attr.aria-label]="'common.send' | t"><ion-icon name="arrow-up"></ion-icon></button>
      </form>
    </ion-footer>
  `,
  styles: [`
    .chat { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; }
    .bot-intro { text-align: center; margin-bottom: 6px; }
    .orb { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 6px; display: grid; place-items: center; background: linear-gradient(135deg, var(--ion-color-secondary), var(--ion-color-primary)); color: #fff; font-size: 28px; box-shadow: 0 12px 30px rgba(14,122,79,.3); }
    .turn { display: flex; flex-direction: column; align-items: flex-start; max-width: 86%; }
    .turn.user { align-self: flex-end; align-items: flex-end; }
    .bubble { padding: 11px 14px; border-radius: 18px; background: var(--eayni-surface); border: 1px solid var(--eayni-border); line-height: 1.55; font-size: 14.5px; white-space: pre-wrap; }
    .user .bubble { background: var(--ion-color-primary); color: #fff; border-color: transparent; }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .actions button, .suggest button { border: 1px solid color-mix(in srgb, var(--ion-color-primary) 40%, var(--eayni-border)); background: color-mix(in srgb, var(--ion-color-primary) 8%, transparent); color: var(--ion-color-primary); font: inherit; font-size: 13px; font-weight: 700; padding: 8px 12px; border-radius: 999px; }
    .suggest { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .typing { display: inline-flex; gap: 4px; } .typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--eayni-text-3); animation: b 1s infinite; } .typing span:nth-child(2) { animation-delay: .15s } .typing span:nth-child(3) { animation-delay: .3s }
    @keyframes b { 0%, 100% { opacity: .3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }
    .composer { display: flex; gap: 8px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: var(--eayni-bg); }
    .composer button { width: 50px; height: 50px; border-radius: 50%; border: 0; background: var(--ion-color-primary); color: #fff; display: grid; place-items: center; font-size: 20px; flex: none; } .composer button:disabled { opacity: .5; }
  `],
})
export class AssistantPage {
  readonly i18n = inject(I18nService);
  private readonly assistant = inject(AssistantService);
  private readonly router = inject(Router);
  private readonly content = viewChild(IonContent);
  readonly turns = signal<Turn[]>([]);
  readonly text = signal('');
  readonly thinking = signal(false);

  submit(ev: Event): void { ev.preventDefault(); const q = this.text().trim(); if (q) void this.ask(q); }

  async ask(q: string): Promise<void> {
    this.text.set('');
    this.turns.update((l) => [...l, { role: 'user', text: q }]);
    this.thinking.set(true);
    this.scroll();
    await new Promise((r) => setTimeout(r, 350));
    const reply = await this.assistant.ask(q);
    this.thinking.set(false);
    this.turns.update((l) => [...l, { role: 'bot', text: reply.text, actions: reply.actions }]);
    this.scroll();
  }

  private scroll(): void { setTimeout(() => void this.content()?.scrollToBottom(250), 40); }
  go(url: string): void { void this.router.navigateByUrl(url); }
}
