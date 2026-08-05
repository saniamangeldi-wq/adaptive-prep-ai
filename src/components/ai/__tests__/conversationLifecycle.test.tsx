import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConversationLifecycle } from "@/components/ai/conversationLifecycle";

describe("conversation lifecycle", () => {
  it("does not return an AI-capable conversation when creation fails", async () => {
    const createConversation = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const { result } = renderHook(() => useConversationLifecycle({ onEnsureConversation: createConversation }));

    let conversationId: string | null = "sentinel";
    await act(async () => {
      conversationId = await result.current.ensureConversationId();
    });

    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(conversationId).toBeNull();
    expect(result.current.activeConvId).toBeNull();
  });

  it("shares one pending creation across concurrent first sends", async () => {
    let resolveCreation!: (id: string) => void;
    const createConversation = vi.fn(() => new Promise<string>((resolve) => {
      resolveCreation = resolve;
    }));
    const { result } = renderHook(() => useConversationLifecycle({ onEnsureConversation: createConversation }));

    const first = result.current.ensureConversationId();
    const second = result.current.ensureConversationId();
    expect(createConversation).toHaveBeenCalledTimes(1);

    resolveCreation("conversation-1");
    await act(async () => {
      await expect(Promise.all([first, second])).resolves.toEqual(["conversation-1", "conversation-1"]);
    });
    expect(result.current.activeConvId).toBe("conversation-1");
  });
});
