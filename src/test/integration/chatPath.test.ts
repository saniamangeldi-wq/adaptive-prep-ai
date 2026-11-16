/**
 * The chat path end to end without a network: useAIChat (as StudentAICoach calls it)
 * → the student-chat request checks (trimHistory, reportId, lang) → an
 * OpenAI-style SSE stream like the gateway's → the hook's stream parser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { bankTasksFor } from "@ielts/taskBank.ts";
import { installFakeServer, type FakeServer } from "./fakeServer";
import { OPINION_SCRIPT } from "../ielts/fixtures";

const updates: Array<Record<string, unknown>> = [];
vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: { title: "" }, error: null }),
    single: async () => ({ data: { messages: [] }, error: null }),
    update: (u: Record<string, unknown>) => {
      updates.push(u);
      return { eq: async () => ({ error: null }) };
    },
  };
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: { access_token: "test-token" } } }) },
      from: () => chain,
    },
  };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useAIChat } from "@/hooks/useAIChat";
import { gradeWriting } from "@/lib/ielts/api";
import { buildGradeRequest } from "@/lib/ielts/requestBuilders";

const sse = (content: string | null, extra: Record<string, unknown> = {}) =>
  `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", choices: content === null ? [] : [{ index: 0, delta: { content }, finish_reason: null }], ...extra })}\n\n`;

/** Split the UTF-8 bytes into chunks at awkward places: inside JSON, inside a line ending, inside a Cyrillic letter. */
function shred(s: string, sizes = [7, 1, 30, 3, 64]): Uint8Array[] {
  const bytes = new TextEncoder().encode(s);
  const out: Uint8Array[] = [];
  let i = 0;
  let k = 0;
  while (i < bytes.length) {
    const n = sizes[k++ % sizes.length];
    out.push(bytes.slice(i, i + n));
    i += n;
  }
  return out;
}

let server: FakeServer;
beforeEach(() => {
  server = installFakeServer();
  updates.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  server.restore();
  vi.restoreAllMocks();
});

/** StudentAICoach.handleSend: streamChat(text, { extraBody: { lang, reportId? } }) */
async function send(result: { current: ReturnType<typeof useAIChat> }, text: string, extraBody: Record<string, unknown>) {
  await act(async () => {
    await result.current.streamChat(text, { extraBody });
  });
}

describe("chat: web hook ↔ student-chat", () => {
  it("sends what the function reads and parses a gateway-style stream", async () => {
    const reply = "Your coherence score is 6.5 because… Связки используются механически. Try “however” less.";
    const stream =
      `data: ${JSON.stringify({ choices: [{ index: 0, delta: { role: "assistant", content: "" } }] })}\n\n` +
      ": keep-alive\n\n" +
      [...reply.match(/.{1,9}/gsu)!].map((p) => sse(p)).join("").replace(/\n\n/g, "\r\n\r\n") +
      sse(null, { usage: { prompt_tokens: 10, completion_tokens: 20 } }) +
      "data: [DONE]\n\n";
    server.chatChunks = shred(stream);

    const { result } = renderHook(() => useAIChat(null));
    await send(result, "Why did I lose marks for coherence?", { lang: "ru" });

    const req = server.requests.at(-1)!;
    expect(req.fn).toBe("student-chat");
    expect(req.status).toBe(200);
    expect(req.headers.Authorization).toBe("Bearer test-token");
    expect(req.body).toMatchObject({ messages: [{ role: "user", content: "Why did I lose marks for coherence?" }], lang: "ru" });

    const last = result.current.messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.content).toBe(reply);
  });

  it("a reportId from a stored report passes the owner check", async () => {
    const task = bankTasksFor("task2", "opinion")[0];
    const { report } = await gradeWriting(buildGradeRequest({ task, script: OPINION_SCRIPT, feedbackLang: "en", includeModelAnswer: false }));
    server.chatChunks = [sse("Fine."), "data: [DONE]\n\n"];
    const { result } = renderHook(() => useAIChat(null));
    await send(result, "Explain my grammar mistakes in simple words.", { lang: "en", reportId: report.id });
    expect(server.requests.at(-1)!.status).toBe(200);
    expect((server.requests.at(-1)!.body as Record<string, unknown>).reportId).toBe(report.id);
    expect(result.current.messages.at(-1)!.content).toBe("Fine.");
  });

  it("an out-of-credits reply is shown but never sent back to the coach as its own words", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "You're out of credits for today. They reset tomorrow.", code: "no_credits", credits_remaining: 0 }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const { result } = renderHook(() => useAIChat(null));
    await send(result, "First question", { lang: "en" });
    globalThis.fetch = realFetch;
    expect(result.current.messages.at(-1)).toMatchObject({ role: "assistant", isError: true });
    expect(result.current.messages.at(-1)!.content).toContain("out of credits");

    server.chatChunks = [sse("Answer."), "data: [DONE]\n\n"];
    await send(result, "Second question", { lang: "en" });
    const sent = (server.requests.at(-1)!.body as { messages: Array<{ role: string; content: string }> }).messages;
    expect(sent.some((m) => m.content.includes("out of credits"))).toBe(false);
    // The server merges the two consecutive user turns; the model sees one clean question.
    expect(server.requests.at(-1)!.status).toBe(200);
  });

  it("saves the conversation without error notes", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "AI service error. Please try again.", code: "upstream_error" }), { status: 500 })) as typeof fetch;
    const { result } = renderHook(() => useAIChat("c0ffee00-0000-4000-8000-000000000001"));
    await send(result, "Hello", { lang: "en" });
    globalThis.fetch = realFetch;
    server.chatChunks = [sse("Hi there."), "data: [DONE]\n\n"];
    await send(result, "Hello again", { lang: "en" });
    await waitFor(() => expect(updates.length).toBeGreaterThan(0));
    const saved = updates.at(-1)!.messages as Array<{ role: string; content: string }>;
    expect(saved.map((m) => m.role)).toEqual(["user", "user", "assistant"]);
    expect(saved.some((m) => m.content.includes("Something went wrong"))).toBe(false);
  });

  it("a stream that ends without [DONE] keeps everything received", async () => {
    server.chatChunks = [sse("Part one, "), sse("part two.")];
    const { result } = renderHook(() => useAIChat(null));
    await send(result, "Q", { lang: "en" });
    expect(result.current.messages.at(-1)!.content).toBe("Part one, part two.");
  });
});
