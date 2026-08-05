export const DEFAULT_CONVERSATION_TITLE = "New Conversation";
export const MAX_CONVERSATION_TITLE_LENGTH = 60;

export function normalizeConversationTitle(text: string | null | undefined): string {
  const normalized = (text || "").replace(/\s+/gu, " ").trim();
  if (!normalized) return DEFAULT_CONVERSATION_TITLE;

  return Array.from(normalized)
    .slice(0, MAX_CONVERSATION_TITLE_LENGTH)
    .join("");
}

export function getAutomaticConversationTitle(visibleText: string | null | undefined): string | null {
  if (!visibleText?.trim()) return null;
  return normalizeConversationTitle(visibleText);
}
