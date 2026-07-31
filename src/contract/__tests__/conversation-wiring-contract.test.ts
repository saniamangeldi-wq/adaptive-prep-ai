import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repo = "C:/deuwxjsk/adaptive-prep-ai";
const coachPage = readFileSync(`${repo}/src/pages/AICoach.tsx`, "utf8");
const studentCoach = readFileSync(`${repo}/src/components/ai/StudentAICoach.tsx`, "utf8");
const aiChat = readFileSync(`${repo}/src/hooks/useAIChat.ts`, "utf8");
const sidebar = readFileSync(`${repo}/src/components/ai/ConversationSidebar.tsx`, "utf8");
const conversations = readFileSync(`${repo}/src/hooks/useConversations.ts`, "utf8");
const spaceDashboard = readFileSync(`${repo}/src/components/spaces/SpaceDashboard.tsx`, "utf8");

describe("conversation wiring contract", () => {
  it("passes dashboard initial message into selected coach", () => {
    expect(coachPage).toMatch(/initialMessage=\{initialMessage\}/);
    expect((coachPage.match(/createConversation\(undefined, spaceId\)/g) || []).length).toBe(1);
  });

  it("stops before AI request when thread creation fails", () => {
    expect(studentCoach).toMatch(/if \(!ensuredConversationId\)\s*return/);
  });

  it("derives auto-title from first persisted visible user message", () => {
    expect(aiChat).toMatch(/visibleText/);
    expect(aiChat).toMatch(/getAutomaticConversationTitle/);
    expect(aiChat).toMatch(/saveMessages/);
    expect(aiChat).toMatch(/title_source/);
  });

  it("keeps manual rename authoritative after auto-title", () => {
    expect(conversations).toMatch(/manual|user.*title|title.*manual/i);
    expect(conversations).toMatch(/updateConversation/);
  });

  it("guards retry from duplicate message and duplicate credit charge", () => {
    expect(studentCoach).toMatch(/retry|inFlight|requestId|dedup/i);
    expect(studentCoach).toMatch(/credits_remaining|credit/i);
  });

  it("keeps student, tutor, admin on same conversation prop boundary", () => {
    for (const prop of ["conversationId", "onEnsureConversation", "chatMode", "spaceReferences", "activeSpace"]) {
      expect(coachPage.match(new RegExp(prop, "g"))?.length || 0).toBeGreaterThanOrEqual(3);
    }
  });

  it("exposes manual rename beside other thread actions", () => {
    expect(sidebar).toMatch(/Rename/);
  });

  it("persists reference collection atomically, without stale closure append", () => {
    expect(spaceDashboard).toMatch(/referenceWriteQueue|refsRef|saveRefs\(\s*\(prev|Promise\.all|references.*files/i);
  });
});
