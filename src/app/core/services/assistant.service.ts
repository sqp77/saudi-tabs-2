import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { PublicApi } from '../api/public-api.service';
import { OrdersStore } from './orders.store';
import { stageOf } from '../utils/order-status';

export interface AssistantReply {
  text: string;
  actions?: { labelKey: string; route: string }[];
}

interface Rule { match: RegExp; reply: (lang: 'ar' | 'en', ctx: Ctx) => AssistantReply }
interface Ctx { categories: string[]; activeStatus?: string; activeId?: string }

/**
 * On-device, rule-based assistant. It only states policies that are visible
 * in the app itself (the real category list from /public/items and the
 * verified order status). No invented acceptance rules.
 *
 * `environment.assistant.proxyUrl` is reserved for a future backend proxy to
 * an LLM; it is empty by default and the app never ships API keys.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly i18n = inject(I18nService);
  private readonly publicApi = inject(PublicApi);
  private readonly orders = inject(OrdersStore);

  readonly remoteEnabled = !!environment.assistant.proxyUrl;

  async ask(question: string): Promise<AssistantReply> {
    const lang = this.i18n.lang();
    const q = question.trim().toLowerCase();
    let categories: string[] = [];
    try {
      categories = (await this.publicApi.categories()).map((c) => {
        const name = (lang === 'ar' ? c.nameAr : c.nameEn) || c.name;
        const subs = c.items.map((o) => (lang === 'ar' ? o.nameAr : o.nameEn) || o.name).slice(0, 6);
        return subs.length ? `${name} (${subs.join(lang === 'ar' ? '، ' : ', ')}${c.items.length > 6 ? '…' : ''})` : name;
      }).filter(Boolean);
    } catch { /* offline */ }
    const active = this.orders.currentActive();
    const ctx: Ctx = { categories, activeStatus: active?.status, activeId: active?.id };
    for (const rule of RULES) if (rule.match.test(q)) return rule.reply(lang, ctx);
    return FALLBACK(lang);
  }
}

const list = (arr: string[], lang: 'ar' | 'en'): string => arr.length ? arr.join(lang === 'ar' ? '، ' : ', ') : '';

const RULES: Rule[] = [
  {
    match: /(what|which|can i|accept|allowed|donate|submit|give|ماذا|بماذا|يقبل|مسموح|أتبرع|اتبرع|تبرع|أقدم|اقدم|تقديم|ايش|أي)/,
    reply: (lang, ctx) => ({
      text: lang === 'ar'
        ? (ctx.categories.length
          ? `الفئات المتاحة حاليًا في عيني هي: ${list(ctx.categories, lang)}. اختر الفئة الأقرب لأغراضك وحدد الكمية. إذا لم تجد فئة مناسبة، تواصل معنا قبل الطلب.`
          : 'تظهر الفئات المقبولة في خطوة "الأغراض" عند تقديم طلب. إذا لم تجد فئة مناسبة لأغراضك، تواصل مع فريق عيني قبل الطلب.')
        : (ctx.categories.length
          ? `The categories currently available in EAYNI are: ${list(ctx.categories, lang)}. Pick the closest one and set a quantity. If nothing fits, contact us before ordering.`
          : 'Accepted categories are shown in the "Items" step when you submit a request. If none fits your items, contact the EAYNI team before ordering.'),
      actions: [{ labelKey: 'assistant.startDonation', route: '/donate' }, { labelKey: 'profile.contact', route: '/info/contact' }],
    }),
  },
  {
    match: /(prepare|pack|bag|ready|how do i|تجهيز|أجهز|اجهز|أكياس|اكياس|تحضير|كيف)/,
    reply: (lang) => ({
      text: lang === 'ar'
        ? 'نصائح التجهيز: 1) ضع الأغراض في أكياس مغلقة. 2) افصل الأصناف حسب الفئة إن أمكن. 3) اترك الأكياس قرب المدخل. 4) أبقِ جوالك قريبًا لأن السائق قد يتصل بك. 5) أضف تعليمات واضحة عن المدخل والدور عند إنشاء الطلب.'
        : 'Preparation tips: 1) Put items in closed bags. 2) Separate by category when possible. 3) Keep bags near the entrance. 4) Keep your phone nearby, the driver may call. 5) Add clear instructions about the entrance and floor when creating the request.',
      actions: [{ labelKey: 'assistant.startDonation', route: '/donate' }],
    }),
  },
  {
    match: /(driver|where|track|status|eta|arriv|سائق|أين|وين|تتبع|حالة|يوصل|وصل)/,
    reply: (lang, ctx) => {
      if (!ctx.activeStatus) {
        return {
          text: lang === 'ar' ? 'لا يوجد طلب نشط حاليًا. عند إنشاء طلب جديد ستتمكن من متابعة حالته خطوة بخطوة من صفحة "طلباتي".' : 'You have no active request right now. Once you create one, you can follow it step by step from "Requests".',
          actions: [{ labelKey: 'assistant.startDonation', route: '/donate' }],
        };
      }
      const st = stageOf(ctx.activeStatus);
      return {
        text: lang === 'ar'
          ? `طلبك النشط في مرحلة: "${label(st.stage, lang)}". سيتواصل معك فريق عيني خلال 48 ساعة لتأكيد موعد الاستلام.`
          : `Your active request is at: "${label(st.stage, lang)}". The EAYNI team will contact you within 48 hours to confirm the pickup.`,
        actions: [{ labelKey: 'orders.detail.title', route: `/orders/${ctx.activeId}` }],
      };
    },
  },
  {
    match: /(point|reward|eco|loyal|نقاط|مكاف|نقطة)/,
    reply: (lang) => ({
      text: lang === 'ar'
        ? 'تُمنح النقاط البيئية من عيني عند اكتمال الطلب، ويمكنك استبدالها بالمكافآت المتاحة في صفحة المكافآت. رصيدك الفعلي يأتي من الخادم ولا يُحتسب محليًا.'
        : 'Eco points are granted by EAYNI when a request is completed, and can be redeemed for the rewards listed in the Rewards page. Your real balance comes from the server, not local estimates.',
      actions: [{ labelKey: 'rewards.title', route: '/rewards' }],
    }),
  },
  {
    match: /(cancel|change|edit|reschedul|إلغاء|الغاء|تعديل|غير|تغيير)/,
    reply: (lang) => ({
      text: lang === 'ar'
        ? 'يمكنك تعديل الطلب أو إلغاؤه من صفحة تفاصيل الطلب ما دام نشطًا. عند الإلغاء سنطلب منك اختيار سبب.'
        : 'You can edit or cancel a request from its details page while it is still active. Cancelling asks you for a reason.',
      actions: [{ labelKey: 'orders.title', route: '/tabs/orders' }],
    }),
  },
  {
    match: /(bin|container|drop|حاوي|حاويات|صندوق)/,
    reply: (lang) => ({
      text: lang === 'ar' ? 'يمكنك إيداع أغراضك في أقرب حاوية إعادة تدوير في أي وقت. افتح "الحاويات القريبة" لعرضها على الخريطة.' : 'You can drop items into the nearest recycling bin anytime. Open "Nearby bins" to see them on the map.',
      actions: [{ labelKey: 'home.quick.containers', route: '/containers' }],
    }),
  },
];

const FALLBACK = (lang: 'ar' | 'en'): AssistantReply => ({
  text: lang === 'ar'
    ? 'أستطيع المساعدة في: ما يمكن تقديمه، تجهيز الأغراض، حالة طلبك، النقاط والمكافآت، أو الحاويات القريبة. للأسئلة الأخرى تواصل مع فريق عيني.'
    : 'I can help with: what you can submit, preparing items, your request status, points and rewards, or nearby bins. For anything else, contact the EAYNI team.',
  actions: [{ labelKey: 'profile.contact', route: '/info/contact' }],
});

function label(stage: string, lang: 'ar' | 'en'): string {
  const ar: Record<string, string> = { submitted: 'تم إرسال الطلب', confirmed: 'تم تأكيد الطلب', assigned: 'تم تعيين سائق', onway: 'السائق في الطريق', arrived: 'وصل السائق', collected: 'تم استلام التبرع', completed: 'اكتمل الطلب', cancelled: 'تم الإلغاء', unknown: 'قيد المعالجة' };
  const en: Record<string, string> = { submitted: 'Request submitted', confirmed: 'Request confirmed', assigned: 'Driver assigned', onway: 'Driver on the way', arrived: 'Driver arrived', collected: 'Donation collected', completed: 'Completed', cancelled: 'Cancelled', unknown: 'In progress' };
  return (lang === 'ar' ? ar : en)[stage] ?? stage;
}
