import { Injectable, computed, effect, signal } from '@angular/core';
import { AR } from './translations/ar';
import { EN } from './translations/en';

export type Lang = 'ar' | 'en';
export type Dictionary = Record<string, string>;

const STORAGE_KEY = 'eayni.lang';
const DICTS: Record<Lang, Dictionary> = { ar: AR, en: EN };

/**
 * Lightweight signal-based i18n. Arabic is the default language.
 * Keys are flat dot-separated strings; `{{param}}` placeholders are interpolated.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(readInitialLang());
  readonly dir = computed<'rtl' | 'ltr'>(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.dir() === 'rtl');
  readonly locale = computed(() => (this.lang() === 'ar' ? 'ar-SA' : 'en-US'));

  constructor() {
    effect(() => {
      const lang = this.lang();
      const dir = this.dir();
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dir = dir;
        document.documentElement.setAttribute('data-lang', lang);
      }
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* storage unavailable (private mode) */
      }
    });
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
  }

  toggle(): void {
    this.setLang(this.lang() === 'ar' ? 'en' : 'ar');
  }

  /** Translate a key. Falls back to English, then to the key itself. */
  t(key: string, params?: Record<string, string | number>): string {
    const lang = this.lang();
    let text = DICTS[lang][key] ?? DICTS.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
      }
    }
    return text;
  }

  /** Pick a localized field from backend objects that expose `name_ar` / `name_en` style pairs. */
  pick(obj: unknown, base: string): string {
    if (!obj || typeof obj !== 'object') return '';
    const o = obj as Record<string, unknown>;
    const lang = this.lang();
    const candidates = [
      o[`${base}_${lang}`],
      o[`${base}${lang === 'ar' ? 'Ar' : 'En'}`],
      (o[base] as Record<string, unknown> | undefined)?.[lang],
      o[base],
      o[`${base}_en`],
      o[`${base}_ar`],
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c;
    }
    return '';
  }

  formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), opts).format(n);
  }

  formatDate(value: string | number | Date | undefined | null, opts?: Intl.DateTimeFormatOptions): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale(), opts ?? { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }

  relativeTime(value: string | number | Date | undefined | null): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    const diff = d.getTime() - Date.now();
    if (Number.isNaN(diff)) return '';
    const rtf = new Intl.RelativeTimeFormat(this.locale(), { numeric: 'auto' });
    const abs = Math.abs(diff);
    const minute = 60_000, hour = 3_600_000, day = 86_400_000, week = 7 * day, month = 30 * day;
    if (abs < minute) return rtf.format(Math.round(diff / 1000), 'second');
    if (abs < hour) return rtf.format(Math.round(diff / minute), 'minute');
    if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
    if (abs < week) return rtf.format(Math.round(diff / day), 'day');
    if (abs < month) return rtf.format(Math.round(diff / week), 'week');
    return rtf.format(Math.round(diff / month), 'month');
  }
}

function readInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  return 'ar';
}
