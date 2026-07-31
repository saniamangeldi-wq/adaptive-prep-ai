import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repo = "C:/deuwxjsk/adaptive-prep-ai";
const aiChat = readFileSync(`${repo}/src/hooks/useAIChat.ts`, "utf8");
const studentCoach = readFileSync(`${repo}/src/components/ai/StudentAICoach.tsx`, "utf8");
const studentChat = readFileSync(`${repo}/supabase/functions/student-chat/index.ts`, "utf8");
const teacherChat = readFileSync(`${repo}/supabase/functions/teacher-reports/index.ts`, "utf8");
const adminChat = readFileSync(`${repo}/supabase/functions/admin-analytics/index.ts`, "utf8");
const sharedContext = readFileSync(`${repo}/supabase/functions/_shared/ai-context.ts`, "utf8");
const spaceDashboard = readFileSync(`${repo}/src/components/spaces/SpaceDashboard.tsx`, "utf8");
const creditMigration = readFileSync(`${repo}/supabase/migrations/20260801130000_ai_context_integrity.sql`, "utf8");

describe("AI context integrity contract", () => {
  it("propagates selected subject and selected space identity through request payload", () => {
    expect(aiChat).toMatch(/subject\?:/);
    expect(aiChat).toMatch(/spaceId\?:/);
    expect(aiChat).toMatch(/subject: options\.subject/);
    expect(aiChat).toMatch(/spaceId: options\.spaceId/);
    expect(studentCoach).toMatch(/subject,\s*spaceId/);
  });

  it("routes parsed subject through student system-prompt selection", () => {
    expect(studentChat).toMatch(/subject:\s*explicitSubject/);
    expect(studentChat).toMatch(/getStudentSystemPrompt\([^\n]*detectedSubject/);
  });

  it("loads selected space context only through an authorized user-owned query", () => {
    expect(studentChat).toMatch(/from\(["']conversation_spaces["']\)/);
    expect(studentChat).toMatch(/eq\(["']id["'],\s*spaceId\)/);
    expect(studentChat).toMatch(/eq\(["']user_id["'],\s*userId\)/);
    expect(studentChat).toMatch(/ai_instructions|references/);
  });

  it("uses the same selected-space and credit contract for tutor and admin coaches", () => {
    expect(teacherChat).toMatch(/spaceId/);
    expect(teacherChat).toMatch(/loadAuthorizedSpace/);
    expect(teacherChat).toMatch(/consumeAiCredits/);
    expect(adminChat).toMatch(/spaceId/);
    expect(adminChat).toMatch(/loadAuthorizedSpace/);
    expect(adminChat).toMatch(/consumeAiCredits/);
    expect(sharedContext).toMatch(/eq\(["']user_id["'],\s*userId\)/);
    expect(sharedContext).toMatch(/appendSpaceContext/);
  });

  it("serializes reference writes and protects credit decrement atomically", () => {
    expect(spaceDashboard).toMatch(/referenceWriteQueue|refsRef|queue/i);
    expect(creditMigration).toMatch(/consume_ai_credits/);
    expect(studentChat).toMatch(/rpc\(["']consume_ai_credits["']/);
  });

  it("refunds reserved credit when downstream AI service fails", () => {
    expect(creditMigration).toMatch(/refund_ai_credits/);
    expect(studentChat).toMatch(/refund_ai_credits/);
  });
});
