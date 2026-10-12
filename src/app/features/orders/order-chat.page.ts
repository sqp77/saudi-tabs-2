import { Component, OnDestroy, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { OrderApi } from '../../core/api/order-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import type { ChatMessage } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

/** Order chat on GET/POST /order/:id/chat (polled; the API exposes no socket). */
@Component({
  selector: 'app-order-chat',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonIcon, TPipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="'/orders/' + id()" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ 'orders.chat.title' | t }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content #content>
      <div class="eayni-page msgs">
        @if (!messages().length && loaded()) {
          <p class="empty eayni-muted">{{ 'orders.chat.empty' | t }}</p>
        }
        @for (m of messages(); track m.id) {
          <div class="msg" [class.mine]="m.mine">
            <div class="bubble">{{ m.text }}</div>
            <div class="time">{{ m.senderName && !m.mine ? m.senderName + ' · ' : '' }}{{ i18n.formatDate(m.createdAt, { timeStyle: 'short' }) }}</div>
          </div>
        }
      </div>
    </ion-content>
    <ion-footer class="ion-no-border">
      <form class="composer" (submit)="send($event)">
        <input class="eayni-input" [placeholder]="'orders.chat.placeholder' | t" [value]="text()" (input)="text.set($any($event.target).value)" maxlength="500" autocomplete="off" />
        <button type="submit" [disabled]="!text().trim() || sending()" [attr.aria-label]="'common.send' | t"><ion-icon [name]="i18n.isRtl() ? 'send' : 'send'" [style.transform]="i18n.isRtl() ? 'scaleX(-1)' : null"></ion-icon></button>
      </form>
    </ion-footer>
  `,
  styles: [`
    .msgs { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; }
    .empty { text-align: center; margin-top: 40px; }
    .msg { display: flex; flex-direction: column; align-items: flex-start; max-width: 80%; }
    .msg.mine { align-self: flex-end; align-items: flex-end; }
    .bubble { padding: 10px 14px; border-radius: 18px; background: var(--eayni-surface); border: 1px solid var(--eayni-border); line-height: 1.5; font-size: 14.5px; white-space: pre-wrap; word-break: break-word; }
    .mine .bubble { background: var(--ion-color-primary); color: #fff; border-color: transparent; }
    .time { font-size: 11px; color: var(--eayni-text-3); margin-top: 3px; padding: 0 6px; }
    .composer { display: flex; gap: 8px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: var(--eayni-bg); }
    .composer button { width: 50px; height: 50px; border-radius: 50%; border: 0; background: var(--ion-color-primary); color: #fff; display: grid; place-items: center; font-size: 20px; flex: none; }
    .composer button:disabled { opacity: .5; }
  `],
})
export class OrderChatPage implements OnInit, OnDestroy {
  readonly id = input.required<string>();
  readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly content = viewChild(IonContent);

  readonly messages = signal<ChatMessage[]>([]);
  readonly loaded = signal(false);
  readonly text = signal('');
  readonly sending = signal(false);
  private timer?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    await this.load();
    this.timer = setInterval(() => void this.load(), environment.polling.chatMs);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  private async load(): Promise<void> {
    try {
      const list = await this.api.chatHistory(this.id(), this.auth.user()?.id);
      const changed = list.length !== this.messages().length;
      this.messages.set(list);
      this.loaded.set(true);
      if (changed) setTimeout(() => void this.content()?.scrollToBottom(200), 50);
    } catch (e) {
      if (!this.loaded()) await this.toast.error(e);
      this.loaded.set(true);
    }
  }

  async send(ev: Event): Promise<void> {
    ev.preventDefault();
    const text = this.text().trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    try {
      await this.api.sendChat(this.id(), text);
      this.text.set('');
      await this.load();
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.sending.set(false);
    }
  }
}
