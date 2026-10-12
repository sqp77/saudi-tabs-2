/** Best-effort Ionicon for a donation category based on its (localized) name. Purely cosmetic. */
export function categoryIcon(c: { name?: string; nameEn?: string; nameAr?: string; icon?: string }): string {
  if (c.icon && /^[a-z0-9-]+$/.test(c.icon)) return c.icon;
  const n = `${c.nameEn ?? ''} ${c.nameAr ?? ''} ${c.name ?? ''}`.toLowerCase();
  if (/shoe|sneaker|حذاء|أحذية|احذية/.test(n)) return 'footsteps-outline';
  if (/bag|حقيب|شنط/.test(n)) return 'bag-handle-outline';
  if (/curtain|ستائر|ستار/.test(n)) return 'albums-outline';
  if (/textile|fabric|linen|قماش|منسوج|أقمشة|مفارش/.test(n)) return 'layers-outline';
  if (/toy|لعب/.test(n)) return 'game-controller-outline';
  if (/book|كتب/.test(n)) return 'book-outline';
  return 'shirt-outline';
}
