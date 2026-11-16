import { LIMITS } from "@ielts/contract.ts";

/** Size in bytes of a data URL as it will be sent (the whole string). */
export function dataUrlBytes(dataUrl: string): number {
  return typeof dataUrl === "string" ? dataUrl.length : 0;
}

export const MAX_SOURCE_BYTES = 25_000_000;
const MAX_SIDE_START = 1600;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });
}

/**
 * Re-draw an uploaded image as a JPEG whose data URL is under LIMITS.maxImageBytes.
 * Shrinks the size first, then the quality, until it fits.
 */
export async function compressImageToJpeg(file: File, maxBytes: number = LIMITS.maxImageBytes): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That image is too large. Choose one under 25 MB.");

  const img = await loadImage(file);
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error("That file could not be read as an image.");

  let side = MAX_SIDE_START;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, side / Math.max(w0, h0));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process that image.");
    ctx.fillStyle = "#ffffff"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.7, 0.55]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrlBytes(dataUrl) <= maxBytes) return dataUrl;
    }
    side = Math.round(side * 0.75);
  }
  throw new Error("We could not make that image small enough. Try a smaller screenshot.");
}
