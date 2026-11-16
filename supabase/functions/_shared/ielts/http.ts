/**
 * Tiny HTTP helpers for the edge functions. Web-standard Response only (no Deno APIs).
 */

import type { ApiError } from "./contract.ts";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

export function fail(status: number, error: string, code?: ApiError["code"]): Response {
  const body: ApiError = code ? { error, code } : { error };
  return json(body, status);
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return fail(405, "Method not allowed.", "bad_request");
  return null;
}

/** Read a JSON body with a size cap; null if it is not JSON or too large. */
export async function readJson(req: Request, maxBytes = 3_000_000): Promise<unknown | null> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
