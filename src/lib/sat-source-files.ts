/**
 * Helpers for persistent SAT source-file storage.
 *
 * Every uploaded PDF and every extracted figure lives in the private
 * `sat-source-files` bucket under a deterministic path, so reprocessing the
 * same document never creates duplicate objects.
 */

export const SAT_SOURCE_BUCKET = "sat-source-files";
export const PDF_MAX_BYTES = 25 * 1024 * 1024;
export const PDF_MIME = "application/pdf";

export interface FileValidation {
  valid: boolean;
  error?: string;
}

/** Validates a browser File before anything is uploaded. */
export function validatePdfFile(file: { name: string; type: string; size: number }): FileValidation {
  const looksPdf = file.type === PDF_MIME || /\.pdf$/i.test(file.name);
  if (!looksPdf) return { valid: false, error: "Only PDF files are supported." };
  if (file.size <= 0) return { valid: false, error: "File is empty." };
  if (file.size > PDF_MAX_BYTES) {
    return { valid: false, error: `File is larger than ${Math.round(PDF_MAX_BYTES / 1024 / 1024)} MB.` };
  }
  return { valid: true };
}

/** Strips path separators and unsafe characters from an upload filename. */
export function sanitizeFilename(name: string): string {
  return (name || "file.pdf")
    .replace(/[\\/]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-120);
}

/** Deterministic path for the archived original PDF. */
export function sourcePdfPath(sourcePdfId: string, filename: string): string {
  return `tests/${sourcePdfId}/source/${sanitizeFilename(filename)}`;
}

/** Deterministic path for an extracted figure. */
export function figurePath(sourcePdfId: string, figureId: string, ext = "png"): string {
  return `tests/${sourcePdfId}/figures/${figureId}.${ext.replace(/^\./, "")}`;
}

/** Hex SHA-256 of arbitrary bytes, using the Web Crypto API. */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = data instanceof Uint8Array ? new Uint8Array(data).buffer : data;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ExtractionStatus = "pending" | "uploaded" | "verified" | "failed";

export interface FigureRecordLike {
  storage_path?: string | null;
  checksum_sha256?: string | null;
  extraction_status?: ExtractionStatus | string | null;
}

/** A figure may only back a live question once its object is verified in Storage. */
export function isFigureUsable(figure: FigureRecordLike | null | undefined): boolean {
  if (!figure) return false;
  if (!figure.storage_path || !figure.checksum_sha256) return false;
  return figure.extraction_status === "verified";
}

/**
 * A question that needs a visual is quarantined unless it has a verified
 * asset or usable structured data to fall back to.
 */
export function shouldQuarantineQuestion(input: {
  visualRequired: boolean;
  figure?: FigureRecordLike | null;
  hasStructuredData?: boolean;
  hasTextEquivalent?: boolean;
}): boolean {
  if (!input.visualRequired) return false;
  if (isFigureUsable(input.figure)) return false;
  return !input.hasStructuredData && !input.hasTextEquivalent;
}

/**
 * Idempotency check used before uploading: an identical checksum under the
 * same source PDF means the asset already exists and must be reused.
 */
export function findExistingFigure<T extends FigureRecordLike>(
  existing: T[],
  checksum: string
): T | undefined {
  return existing.find((f) => f.checksum_sha256 === checksum);
}
