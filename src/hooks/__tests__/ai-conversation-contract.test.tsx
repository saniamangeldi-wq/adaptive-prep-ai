import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockGetSession, mockRefreshProfile } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
  mockRefreshProfile: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    refreshProfile: mockRefreshProfile,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: mockFrom,
  },
}));

vi.mock("@/lib/award-xp", () => ({ awardXP: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/gamification-config", () => ({ XP_REWARDS: { ai_chat_message: 1 } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useAIChat } from "@/hooks/useAIChat";

function chain(result: { data?: unknown; error?: unknown }) {
  const q = {
    select: vi.fn(() => q),
    insert: vi.fn(() => q),
    update: vi.fn(() => q),
    eq: vi.fn(() => q),
    single: vi.fn(async () => result),
  };
  return q;
}

function streamResponse(content = "assistant answer") {
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`,
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

describe("AI conversation contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    mockRefreshProfile.mockResolvedValue(undefined);
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse()));
  });

  it("sends selected subject to student-chat server context", async () => {
    const { result } = renderHook(() => useAIChat("conversation-1"));

    await act(async () => {
      await result.current.streamChat("Solve this", {
        endpoint: "student-chat",
        modelOverride: "perplexity-pro",
        subject: "Math",
        spaceId: "space-1",
      } as never);
    });

    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ subject: "Math", spaceId: "space-1" });
  });

  it("preserves visible text, hidden payload flag, and attachment metadata", async () => {
    const update = chain({ data: null, error: null });
    mockFrom.mockReturnValue(update);
    const { result } = renderHook(() => useAIChat("conversation-1"));

    await act(async () => {
      await result.current.streamChat(
        "hidden attachment context",
        { endpoint: "student-chat" },
        "Visible question",
        [{ type: "pdf", name: "sat.pdf" }],
        true,
      );
    });

    await waitFor(() => expect(update.update).toHaveBeenCalled());
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: "hidden attachment context",
          visibleText: "Visible question",
          hidden: true,
          attachmentMeta: [{ type: "pdf", name: "sat.pdf" }],
        }),
      ]),
    }));
  });

  it("does not issue duplicate AI request while first message is in flight", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { resolvers.push(resolve); })));
    const { result } = renderHook(() => useAIChat("conversation-1"));

    const first = result.current.streamChat("one", { endpoint: "student-chat" });
    await Promise.resolve();
    const second = result.current.streamChat("one", { endpoint: "student-chat" });
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    resolvers.forEach((resolve) => resolve(streamResponse()));
    await act(async () => { await Promise.all([first, second]); });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("persists first user and assistant messages for reload", async () => {
    const update = chain({ data: null, error: null });
    mockFrom.mockReturnValue(update);
    const { result } = renderHook(() => useAIChat("conversation-1"));
    await waitFor(() => expect(result.current).not.toBeNull());

    await act(async () => {
      await result.current.streamChat("first visible message", { endpoint: "student-chat" });
    });

    await waitFor(() => expect(update.update).toHaveBeenCalled());
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: "first visible message" }),
        expect.objectContaining({ role: "assistant", content: "assistant answer" }),
      ]),
    }));
  });

  it("removes a failed send before retry so retry has one message and one request", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "No credits" }), { status: 402 }))
      .mockResolvedValueOnce(streamResponse("retry answer")));
    const { result } = renderHook(() => useAIChat("conversation-1"));

    await act(async () => {
      await result.current.streamChat("retry me", { endpoint: "student-chat" });
    });
    expect(result.current.messages).toHaveLength(0);

    await act(async () => {
      await result.current.streamChat("retry me", { endpoint: "student-chat" });
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(result.current.messages.filter(message => message.role === "user")).toHaveLength(1);
  });
});
