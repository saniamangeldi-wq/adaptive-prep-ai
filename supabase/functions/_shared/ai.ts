// One place for the AI provider, model choice and credit handling.
//
// The endpoint is OpenAI-compatible. By default it is Lovable's AI gateway.
// To move off Lovable, set AI_GATEWAY_URL and AI_API_KEY in the Supabase
// function secrets (for example OpenRouter, or Google's OpenAI-compatible
// Gemini endpoint) and, if that provider names models differently, update
// AI_MODELS below. No function needs to change.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const AI_MODELS = {
  /** Cheapest; free plan and short utility calls. */
  lite: "google/gemini-2.5-flash-lite",
  /** Default for paid plans, reports and analysis. */
  fast: "google/gemini-2.5-flash",
  /** Highest quality; only on explicit request by top-tier users. */
  deep: "google/gemini-2.5-pro",
} as const;

export function aiConfigured(): boolean {
  return Boolean(Deno.env.get("AI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
}

/** POST a chat-completions body to the configured provider. */
export function aiChat(body: Record<string, unknown>): Promise<Response> {
  const url = Deno.env.get("AI_GATEWAY_URL") ?? DEFAULT_GATEWAY;
  const key = Deno.env.get("AI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("AI_API_KEY (or LOVABLE_API_KEY) is not configured");
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type CreditResult =
  | { ok: true; left: number }
  | { ok: false; status: 402 | 500; error: string };

/**
 * Deduct `cost` credits for the signed-in user (atomic, includes the daily
 * reset). `userClient` must carry the user's JWT.
 */
export async function consumeCredits(userClient: SupabaseClient, cost: number): Promise<CreditResult> {
  const { data, error } = await userClient.rpc("consume_ai_credits", { p_cost: cost });
  if (error) {
    console.error("consume_ai_credits failed:", error);
    return { ok: false, status: 500, error: "Could not check your credits. Please try again." };
  }
  if (data === -1) {
    return {
      ok: false,
      status: 402,
      error: cost > 1
        ? `Not enough credits. This action needs ${cost} credits.`
        : "No credits remaining. Please upgrade your plan for more credits.",
    };
  }
  return { ok: true, left: data as number };
}

/** Give credits back after a failed AI call. Uses the service role. */
export async function refundCredits(userId: string, amount: number): Promise<void> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { error } = await admin.rpc("refund_ai_credits", { p_user_id: userId, p_amount: amount });
  if (error) console.error("refund_ai_credits failed:", error);
}

export const SKILL_LABELS: Record<string, string> = {
  information_ideas: "Information and Ideas",
  craft_structure: "Craft and Structure",
  expression_ideas: "Expression of Ideas",
  standard_english: "Standard English Conventions",
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  data_analysis: "Problem-Solving and Data Analysis",
  geometry_trig: "Geometry and Trigonometry",
};

export interface MasteryRow {
  skill: string;
  section: string;
  rating: number;
  attempts: number;
  correct: number;
}

/** Chance of answering a medium-difficulty question in this skill correctly. */
export function masteryPct(rating: number): number {
  return Math.round(100 / (1 + Math.exp(-rating)));
}

/** Plain-text summary of a student's skill mastery for prompts. */
export function describeMastery(rows: MasteryRow[]): string {
  const usable = rows.filter((r) => r.attempts >= 3);
  if (usable.length === 0) return "";
  const sorted = [...usable].sort((a, b) => a.rating - b.rating);
  return sorted
    .map((r) => `- ${SKILL_LABELS[r.skill] ?? r.skill}: ${masteryPct(r.rating)}% mastery (${r.correct}/${r.attempts} correct)`)
    .join("\n");
}
