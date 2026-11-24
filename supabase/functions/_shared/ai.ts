// One place that decides which AI provider the edge functions use.
//
// Default: Lovable's AI gateway (billed to the Lovable account), unchanged
// behaviour. To stop paying Lovable, set these Supabase function secrets:
//
//   AI_PROVIDER = gemini
//   AI_API_KEY  = <Google AI Studio key, aistudio.google.com/apikey>
//
// Chat calls then go to Google's OpenAI-compatible Gemini endpoint, and the
// model names the functions ask for are mapped to Gemini models by tier:
//   *lite*                      -> AI_MODEL_LITE (default gemini-2.5-flash-lite)
//   *pro*, gpt-5.6-sol / -terra -> AI_MODEL_DEEP (default gemini-2.5-pro)
//   everything else             -> AI_MODEL_FAST (default gemini-2.5-flash)
// Override any of the three with a secret of the same name if Google renames
// models. Audio (speech/transcription) and image generation have no Gemini
// equivalent on this endpoint, so those features only work on Lovable.

const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_CHAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export function aiProvider(): "lovable" | "gemini" {
  return (Deno.env.get("AI_PROVIDER") ?? "").toLowerCase() === "gemini" ? "gemini" : "lovable";
}

function apiKey(): string | undefined {
  return aiProvider() === "gemini"
    ? Deno.env.get("AI_API_KEY") ?? undefined
    : Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_API_KEY") ?? undefined;
}

export function aiConfigured(): boolean {
  return Boolean(apiKey());
}

/** Map a Lovable-style model id ("google/gemini-2.5-flash", "openai/gpt-5.6") to the active provider. */
export function resolveModel(model: unknown): unknown {
  if (aiProvider() !== "gemini" || typeof model !== "string") return model;
  const m = model.toLowerCase();
  if (m.includes("lite")) return Deno.env.get("AI_MODEL_LITE") ?? "gemini-2.5-flash-lite";
  if (m.includes("pro") || m.includes("-sol") || m.includes("-terra")) return Deno.env.get("AI_MODEL_DEEP") ?? "gemini-2.5-pro";
  return Deno.env.get("AI_MODEL_FAST") ?? "gemini-2.5-flash";
}

/** POST an OpenAI-style chat-completions body to the configured provider. */
export function aiChat(body: Record<string, unknown>): Promise<Response> {
  const key = apiKey();
  if (!key) {
    throw new Error(aiProvider() === "gemini" ? "AI_API_KEY is not configured" : "LOVABLE_API_KEY is not configured");
  }
  const url = aiProvider() === "gemini" ? GEMINI_CHAT_URL : LOVABLE_CHAT_URL;
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model: resolveModel(body.model) }),
  });
}
