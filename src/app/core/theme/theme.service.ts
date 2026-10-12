import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'eayni.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(readStored());
  readonly isDark = signal(false);
  private media?: MediaQueryList;

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.media = window.matchMedia('(prefers-color-scheme: dark)');
      this.media.addEventListener?.('change', () => this.apply());
    }
    effect(() => {
      const mode = this.mode();
      try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
      this.apply();
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private apply(): void {
    const mode = this.mode();
    const dark = mode === 'dark' || (mode === 'system' && !!this.media?.matches);
    this.isDark.set(dark);
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('ion-palette-dark', dark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', dark ? '#0b1611' : '#f4f7f4');
  }
}

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* ignore */ }
  return 'system';
}
