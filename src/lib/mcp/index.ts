import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listTestAttempts from "./tools/list-test-attempts";
import listFlashcardDecks from "./tools/list-flashcard-decks";
import listConversations from "./tools/list-conversations";

// Build the Supabase OAuth issuer from the project ref (import-safe: Vite inlines
// this literal at build time). Fallback sentinel keeps the URL well-formed for
// the throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "adaptiveprep-mcp",
  title: "AdaptivePrep MCP",
  version: "0.1.0",
  instructions:
    "Tools for AdaptivePrep, an AI-powered SAT prep platform. Use these tools to read the signed-in student/tutor/teacher/admin's profile, practice test attempts, flashcard decks, and AI coach conversation metadata.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listTestAttempts, listFlashcardDecks, listConversations],
});
