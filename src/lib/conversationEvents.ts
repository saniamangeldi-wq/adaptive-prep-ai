export type ConversationListUpdate = {
  title?: string | null;
  title_source?: "automatic" | "manual";
  messages?: Array<{ role: string; content: string }>;
  space_id?: string | null;
  is_archived?: boolean;
  is_pinned?: boolean;
};

export const CONVERSATION_UPDATED_EVENT = "adaptiveprep:conversation-updated";

export function emitConversationUpdated(conversationId: string, updates: ConversationListUpdate) {
  window.dispatchEvent(new CustomEvent(CONVERSATION_UPDATED_EVENT, {
    detail: { conversationId, updates },
  }));
}
