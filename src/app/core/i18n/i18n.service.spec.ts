import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nService } from './i18n.service';
import { AR } from './translations/ar';
import { EN } from './translations/en';

describe('I18nService', () => {
  let svc: I18nService;
  beforeEach(() => {
    try { globalThis.localStorage?.clear(); } catch { /* jsdom without storage */ }
    svc = TestBed.inject(I18nService);
  });

  it('defaults to Arabic / RTL', () => {
    TestBed.tick();
    expect(svc.lang()).toBe('ar');
    expect(svc.dir()).toBe('rtl');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('switches to English and updates the document direction', () => {
    svc.setLang('en');
    TestBed.tick();
    expect(svc.dir()).toBe('ltr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('interpolates params and falls back to the key', () => {
    svc.setLang('en');
    expect(svc.t('donate.step.of', { current: 2, total: 4 })).toBe('Step 2 of 4');
    expect(svc.t('missing.key')).toBe('missing.key');
  });

  it('has identical key sets in both dictionaries', () => {
    const ar = Object.keys(AR).sort();
    const en = Object.keys(EN).sort();
    expect(ar).toEqual(en);
  });

  it('picks localized fields from backend objects', () => {
    expect(svc.pick({ name_ar: 'ملابس', name_en: 'Clothes' }, 'name')).toBe('ملابس');
    svc.setLang('en');
    expect(svc.pick({ name_ar: 'ملابس', name_en: 'Clothes' }, 'name')).toBe('Clothes');
  });
});
