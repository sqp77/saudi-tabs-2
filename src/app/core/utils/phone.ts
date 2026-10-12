/** Normalizes a locally typed mobile number: strips spaces, converts Arabic-Indic digits, removes leading 0 / dial code. */
export function normalizeLocalPhone(input: string, dialCode: string): string {
  let s = (input ?? '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (dialCode && s.startsWith(dialCode) && s.length > dialCode.length + 6) s = s.slice(dialCode.length);
  if (s.startsWith('00' + dialCode)) s = s.slice(2 + dialCode.length);
  return s;
}

/** The API samples send phones with a leading 0 ("0555930749"); keep that shape. */
export function toApiPhone(local: string): string {
  const digits = local.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? digits : `0${digits}`;
}

export function isValidMobile(local: string): boolean {
  const d = local.replace(/\D/g, '');
  return d.length >= 8 && d.length <= 12;
}

export function maskPhone(dialCode: string, local: string): string {
  const d = toApiPhone(local);
  return `+${dialCode} ${d.slice(0, 3)} ${'•'.repeat(Math.max(0, d.length - 5))}${d.slice(-2)}`;
}
