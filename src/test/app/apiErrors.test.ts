import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LIMITS } from "@ielts/contract.ts";
import { describeApiError, errorFromResponse, IeltsApiError, networkError, toApiError } from "@/lib/ielts/apiErrors";

describe("errorFromResponse", () => {
  it("keeps a known code and message from the body", () => {
    const e = errorFromResponse(422, { error: "Too short", code: "too_short" });
    expect(e).toBeInstanceOf(IeltsApiError);
    expect(e).toMatchObject({ error: "Too short", code: "too_short", status: 422, network: false });
  });
  it("derives a code from the status when the body has none or an unknown one", () => {
    expect(errorFromResponse(402, {}).code).toBe("no_credits");
    expect(errorFromResponse(429, null).code).toBe("rate_limited");
    expect(errorFromResponse(401, { code: "weird" }).code).toBe("unauthorized");
    expect(errorFromResponse(404, "text").code).toBe("not_found");
    expect(errorFromResponse(400, {}).code).toBe("bad_request");
    expect(errorFromResponse(502, undefined).code).toBe("upstream_error");
  });
  it("always gives a message", () => {
    expect(errorFromResponse(500, {}).error).toBe("Request failed (500)");
  });
});

describe("toApiError", () => {
  it("normalises anything thrown", () => {
    expect(toApiError(new TypeError("Failed to fetch")).network).toBe(true);
    expect(toApiError(Object.assign(new Error("x"), { name: "AbortError" })).network).toBe(true);
    expect(toApiError(new Error("boom"))).toMatchObject({ error: "boom", code: "upstream_error", network: false });
    expect(toApiError("odd").error).toBe("Something went wrong.");
    const original = networkError();
    expect(toApiError(original)).toBe(original);
  });
});

describe("describeApiError", () => {
  it("maps the codes to plain messages", () => {
    const m = (code: string) => describeApiError(new IeltsApiError({ error: "raw", code: code as never }), "grade");
    expect(m("grader_invalid_output")).toBe("We couldn't grade this one. You weren't charged for it. Try again.");
    expect(m("too_long")).toContain(String(LIMITS.maxScriptWords));
    expect(m("no_credits")).toMatch(/credits/);
    expect(m("too_short")).toMatch(/too short/);
    expect(m("rate_limited")).toMatch(/wait/i);
    expect(m("unauthorized")).toMatch(/sign in/i);
    expect(m("upstream_error")).toMatch(/trouble/);
  });
  it("says the text is safe when offline during grading", () => {
    expect(describeApiError(networkError(), "grade")).toMatch(/saved on this device/);
    expect(describeApiError(networkError(), "draft")).not.toMatch(/saved on this device/);
  });
  it("falls back to the server message", () => {
    expect(describeApiError(new IeltsApiError({ error: "Bad thing", code: "bad_request" }))).toBe("Bad thing");
  });
});

describe("api wrappers", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) } },
    }));
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.doUnmock("@/integrations/supabase/client");
  });

  it("posts JSON with the user's token and returns the typed body", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ action: "save", sessionId: "s1", updatedAt: "2026-01-01T00:00:00Z" }), { status: 200 }));
    globalThis.fetch = fetchMock as never;
    const api = await import("@/lib/ielts/api");
    const { taskTask2 } = await import("../fixtures/ielts");
    const out = await api.saveDraft({ task: taskTask2, script: "x", secondsUsed: 3 });
    expect(out).toEqual({ sessionId: "s1", updatedAt: "2026-01-01T00:00:00Z" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/functions\/v1\/ielts-draft$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toMatchObject({ action: "save", script: "x", secondsUsed: 3 });
  });

  it("turns a non-2xx reply into an ApiError with its code", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: "nope", code: "grader_invalid_output" }), { status: 502 })) as never;
    const api = await import("@/lib/ielts/api");
    const { taskTask2 } = await import("../fixtures/ielts");
    await expect(api.gradeWriting({ task: taskTask2, script: "x" })).rejects.toMatchObject({ code: "grader_invalid_output", status: 502 });
  });

  it("maps a network failure and an unusable body", async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError("Failed to fetch"); }) as never;
    const api = await import("@/lib/ielts/api");
    await expect(api.listDrafts()).rejects.toMatchObject({ network: true });
    globalThis.fetch = vi.fn(async () => new Response("<html>", { status: 200 })) as never;
    await expect(api.listDrafts()).rejects.toMatchObject({ code: "upstream_error" });
  });

  it("returns empty results safely", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ action: "get", draft: null }), { status: 200 })) as never;
    const api = await import("@/lib/ielts/api");
    expect(await api.getDraft("s")).toBeNull();
  });
});
