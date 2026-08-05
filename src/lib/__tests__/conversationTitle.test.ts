import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONVERSATION_TITLE,
  getAutomaticConversationTitle,
  normalizeConversationTitle,
} from "@/lib/conversationTitle";

describe("conversation title contract", () => {
  it("keeps empty visible text at the default title", () => {
    expect(getAutomaticConversationTitle("   ")).toBeNull();
    expect(normalizeConversationTitle("")).toBe(DEFAULT_CONVERSATION_TITLE);
  });

  it("normalizes whitespace and caps title at 60 Unicode code points", () => {
    expect(normalizeConversationTitle("  Solve\n this\tproblem  ")).toBe("Solve this problem");
    expect(normalizeConversationTitle("a".repeat(80))).toHaveLength(60);
    expect(normalizeConversationTitle("🙂".repeat(80))).toBe("🙂".repeat(60));
  });

  it("preserves Unicode text without splitting surrogate pairs", () => {
    expect(normalizeConversationTitle("數學　問題 🙂")).toBe("數學 問題 🙂");
  });

  it("does not title attachment-only messages", () => {
    expect(getAutomaticConversationTitle(null)).toBeNull();
    expect(getAutomaticConversationTitle("\n\t")).toBeNull();
  });
});
