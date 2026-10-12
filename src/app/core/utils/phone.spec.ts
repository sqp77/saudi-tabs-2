import { describe, expect, it } from 'vitest';
import { isValidMobile, maskPhone, normalizeLocalPhone, toApiPhone } from './phone';

describe('phone utils', () => {
  it('normalizes Arabic-Indic digits, spaces and dial codes', () => {
    expect(normalizeLocalPhone('٠٥٥ ٥٩٣ ٠٧٤٩', '966')).toBe('0555930749');
    expect(normalizeLocalPhone('+966 555930749', '966')).toBe('555930749');
    expect(normalizeLocalPhone('00966555930749', '966')).toBe('555930749');
  });

  it('formats for the API with a leading zero', () => {
    expect(toApiPhone('555930749')).toBe('0555930749');
    expect(toApiPhone('0555930749')).toBe('0555930749');
    expect(toApiPhone('')).toBe('');
  });

  it('validates plausible mobile lengths', () => {
    expect(isValidMobile('0555930749')).toBe(true);
    expect(isValidMobile('123')).toBe(false);
  });

  it('masks the number for display', () => {
    expect(maskPhone('966', '555930749')).toMatch(/^\+966 055.*49$/);
  });
});
