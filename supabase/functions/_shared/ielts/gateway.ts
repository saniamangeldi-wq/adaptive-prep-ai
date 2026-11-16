/**
 * Lovable AI Gateway helpers (OpenAI-compatible chat completions).
 * No Deno APIs: uses only web-standard fetch/AbortController, injectable for tests.
 *
 * Structured output follows the pattern that already works in the old
 * codebase (generate-flashcards, analyze-performance, generate-lesson-content):
 * `tools` + `tool_choice: {type:"function", function:{name}}`, reading
 * `choices[0].message.tool_calls[0].function.arguments`. Fallback: the same
 * schema pasted into the prompt with `response_format: {type:"json_object"}`
 * (the pattern the old IELTS functions used).
 *
 * Auth header: the old IELTS functions sent `Lovable-API-Key`, every other
 * function sent `Authorization: Bearer`. Both are sent.
 */

import { GATEWAY_URL, type GenerationSettings } from "./models.ts";
import type { ChatMessage } from "./prompt.ts";

export type StructuredMode = "tool" | "json";

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function gatewayHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "Lovable-API-Key": apiKey,
  };
}

export function buildChatBody(opts: {
  settings: GenerationSettings;
  messages: ChatMessage[];
  stream?: boolean;
  structured?: { mode: StructuredMode; tool?: ToolSpec };
}): Record<string, unknown> {
  const { settings, messages, stream, structured } = opts;
  const body: Record<string, unknown> = {
    model: settings.model,
    messages,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
  };
  if (settings.reasoningEffort) body.reasoning_effort = settings.reasoningEffort;
  if (stream) body.stream = true;
  if (structured?.mode === "tool" && structured.tool) {
    body.tools = [{ type: "function", function: structured.tool }];
    body.tool_choice = { type: "function", function: { name: structured.tool.name } };
  } else if (structured?.mode === "json") {
    body.response_format = { type: "json_object" };
  }
  return body;
}

/** Parse JSON that may be wrapped in a markdown fence or surrounded by prose. Returns undefined if impossible. */
export function parseJsonLoose(text: string): unknown {
  if (typeof text !== "string") return undefined;
  const t = text.trim();
  if (!t) return undefined;
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const direct = tryParse(t);
  if (direct !== undefined) return direct;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    const f = tryParse(fence[1].trim());
    if (f !== undefined) return f;
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last > first) return tryParse(t.slice(first, last + 1));
  return undefined;
}

export type ExtractResult =
  | { ok: true; value: unknown; via: "tool" | "content" }
  | { ok: false; error: string; finishReason?: string };

/**
 * Pull the structured payload out of a chat-completions response: the named
 * tool call's arguments first, else JSON in the message content.
 */
export function extractStructured(response: unknown, toolName?: string): ExtractResult {
  const choice = (response as { choices?: Array<Record<string, unknown>> })?.choices?.[0];
  if (!choice) return { ok: false, error: "no choices in gateway response" };
  const finishReason = typeof choice.finish_reason === "string" ? choice.finish_reason : undefined;
  const message = choice.message as Record<string, unknown> | undefined;
  const calls = (message?.tool_calls as Array<{ function?: { name?: string; arguments?: unknown } }>) ?? [];
  const call = calls.find((c) => !toolName || c?.function?.name === toolName) ?? calls[0];
  if (call?.function) {
    const args = call.function.arguments;
    if (typeof args === "object" && args !== null) return { ok: true, value: args, via: "tool" };
    if (typeof args === "string") {
      const parsed = parseJsonLoose(args);
      if (parsed !== undefined) return { ok: true, value: parsed, via: "tool" };
      return { ok: false, error: `tool arguments are not valid JSON${finishReason === "length" ? " (output truncated: max_tokens reached)" : ""}`, finishReason };
    }
  }
  const content = message?.content;
  if (typeof content === "string" && content.trim()) {
    const parsed = parseJsonLoose(content);
    if (parsed !== undefined) return { ok: true, value: parsed, via: "content" };
    return { ok: false, error: `message content is not valid JSON${finishReason === "length" ? " (output truncated: max_tokens reached)" : ""}`, finishReason };
  }
  return { ok: false, error: "response has neither a tool call nor content", finishReason };
}

export type GatewayCallResult =
  | { ok: true; json: unknown }
  | { ok: true; stream: ReadableStream<Uint8Array> }
  | { ok: false; status: number; detail: string; timedOut?: boolean };

/** One HTTP call to the gateway with a timeout. Never throws. */
export async function callGateway(
  apiKey: string,
  body: Record<string, unknown>,
  opts: { timeoutMs: number; fetchImpl?: typeof fetch; url?: string } ,
): Promise<GatewayCallResult> {
  const f = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await f(opts.url ?? GATEWAY_URL, {
      method: "POST",
      headers: gatewayHeaders(apiKey),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, detail: detail.slice(0, 2000) };
    }
    if (body.stream) {
      if (!res.body) return { ok: false, status: 502, detail: "no response body" };
      return { ok: true, stream: res.body };
    }
    const json = await res.json().catch(() => undefined);
    if (json === undefined) return { ok: false, status: 502, detail: "gateway returned non-JSON" };
    return { ok: true, json };
  } catch (e) {
    const timedOut = (e as { name?: string })?.name === "AbortError";
    return { ok: false, status: timedOut ? 504 : 502, detail: timedOut ? "timeout" : String(e), timedOut };
  } finally {
    // For streams the timer must not abort an in-progress body read after headers arrived.
    clearTimeout(timer);
  }
}

/**
 * True when a 400 from the gateway looks like "this model/route does not
 * support tools", so the caller should switch to the json_object fallback.
 */
export function looksLikeToolsUnsupported(status: number, detail: string): boolean {
  return status === 400 && /tool|function|response_format|schema/i.test(detail);
}

/** Map an upstream failure to the HTTP status + ApiError code we return. */
export function mapUpstreamFailure(status: number): { status: number; code: "rate_limited" | "upstream_error"; message: string } {
  if (status === 429) return { status: 429, code: "rate_limited", message: "The marking service is busy. Please try again in a minute." };
  if (status === 504) return { status: 504, code: "upstream_error", message: "The marking service took too long. Please try again." };
  // 402 from the gateway means the WORKSPACE ran out of AI credit, not the student; never surface it as 402.
  return { status: 502, code: "upstream_error", message: "The AI service is unavailable right now. Please try again shortly." };
}
