/** Downscale + re-encode an image blob to keep uploads small on mobile networks. */
export async function compressImage(blob: Blob, maxSide = 1280, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && blob.size < 600_000) return blob;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', quality));
  } catch {
    return blob;
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
