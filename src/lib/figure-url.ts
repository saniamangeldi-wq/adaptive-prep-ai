import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a durable figure record id into a short-lived signed URL.
 * URLs are cached in-memory for slightly less than their lifetime so a test
 * session does not re-sign the same asset on every render.
 */
const TTL_MS = 4 * 60 * 1000;
const cache = new Map<string, { url: string; expires: number }>();

export async function resolveFigureUrl(figureId: string): Promise<string | null> {
  if (!figureId) return null;
  const hit = cache.get(figureId);
  if (hit && hit.expires > Date.now()) return hit.url;

  try {
    const { data, error } = await supabase.functions.invoke("sign-question-figure", {
      body: { figureId },
    });
    if (error) return null;
    const url = (data as { url?: string } | null)?.url;
    if (!url) return null;
    cache.set(figureId, { url, expires: Date.now() + TTL_MS });
    return url;
  } catch {
    return null;
  }
}

/** Test seam: clears the signed-URL cache. */
export function clearFigureUrlCache() {
  cache.clear();
}
