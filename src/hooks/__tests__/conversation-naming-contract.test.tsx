import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockGetSession, mockRefreshProfile, mockToastError, mockUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
  mockRefreshProfile: vi.fn(),
  mockToastError: vi.fn(),
  mockUser: { id: "user-1" },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, refreshProfile: mockRefreshProfile }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mockGetSession }, from: mockFrom },
}));
vi.mock("@/lib/award-xp", () => ({ awardXP: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/gamification-config", () => ({ XP_REWARDS: { ai_chat_message: 1 } }));
vi.mock("sonner", () => ({ toast: { error: mockToastError, success: vi.fn() } }));

import { useAIChat } from "@/hooks/useAIChat";
import { useConversations } from "@/hooks/useConversations";

function chain(error: unknown = null) {
  const q = {
    update: vi.fn(() => q),
    eq: vi.fn(() => q),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: null, error })),
  };
  return q;
}

function streamResponse() {
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: "answer" } }] })}\n\ndata: [DONE]\n\n`,
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

describe("deterministic conversation naming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    mockRefreshProfile.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse()));
  });

  it("updates title only after message persistence and never calls an LLM for naming", async () => {
    const query = chain();
    mockFrom.mockReturnValue(query);
    const { result } = renderHook(() => useAIChat("conversation-1"));

    await act(async () => {
      await result.current.streamChat("hidden prompt", { endpoint: "student-chat" }, "  First   visible question  ");
    });

    await waitFor(() => expect(query.update).toHaveBeenCalledTimes(2));
    expect(query.update.mock.calls[0][0]).toMatchObject({ messages: expect.any(Array) });
    expect(query.update.mock.calls[1][0]).toMatchObject({ title: "First visible question" });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("leaves default title for attachment-only input", async () => {
    const query = chain();
    mockFrom.mockReturnValue(query);
    const { result } = renderHook(() => useAIChat("conversation-1"));

    await act(async () => {
      await result.current.streamChat("[attachment]", { endpoint: "student-chat" }, "   ", [{ type: "pdf", name: "sat.pdf" }]);
    });

    await waitFor(() => expect(query.update).toHaveBeenCalledTimes(1));
    expect(query.update.mock.calls[0][0]).toMatchObject({ messages: expect.any(Array) });
  });

  it("reports title persistence failure without losing recoverable chat state", async () => {
    const messageQuery = chain();
    const titleQuery = chain(new Error("title write failed"));
    mockFrom.mockReturnValueOnce(messageQuery).mockReturnValueOnce(titleQuery);
    const { result } = renderHook(() => useAIChat("conversation-1"));

    await act(async () => {
      await result.current.streamChat("hidden prompt", { endpoint: "student-chat" }, "Rename me");
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Failed to name conversation"));
    expect(result.current.messages.some((message) => message.role === "user")).toBe(true);
  });

  it("does not issue duplicate title writes when concurrent first sends race", async () => {
    const query = chain();
    mockFrom.mockReturnValue(query);
    const resolvers: Array<(response: Response) => void> = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => resolvers.push(resolve))));
    const { result } = renderHook(() => useAIChat("conversation-1"));

    let first: Promise<void>;
    let second: Promise<void>;
    await act(async () => {
      first = result.current.streamChat("one", { endpoint: "student-chat" }, "One");
      await Promise.resolve();
      second = result.current.streamChat("two", { endpoint: "student-chat" }, "Two");
    });
    resolvers.forEach((resolve) => resolve(streamResponse()));
    await act(async () => { await Promise.all([first, second]); });

    await waitFor(() => expect(query.update).toHaveBeenCalled());
    expect(query.update.mock.calls.filter((call: unknown[]) => "title" in (call[0] as object))).toHaveLength(1);
  });

  it("marks manual rename so later automatic title cannot overwrite it", async () => {
    const conversation = {
      id: "conversation-1",
      user_id: "user-1",
      title: "New Conversation",
      title_source: "automatic",
      messages: [],
      space_id: null,
      is_archived: false,
      is_pinned: false,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      update: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [conversation], error: null })),
    };
    mockFrom.mockReturnValue(query);
    const { result } = renderHook(() => useConversations());

    await act(async () => {
      await result.current.updateConversation("conversation-1", { title: "My notes" });
    });

    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      title: "My notes",
      title_source: "manual",
    }));
  });
});
