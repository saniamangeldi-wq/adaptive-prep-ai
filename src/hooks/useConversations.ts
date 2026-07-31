import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { CONVERSATION_UPDATED_EVENT, emitConversationUpdated } from "@/lib/conversationEvents";
import { DEFAULT_CONVERSATION_TITLE, normalizeConversationTitle } from "@/lib/conversationTitle";

export interface ConversationSpace {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  conversation_count: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  title_source: "automatic" | "manual";
  messages: Array<{
    role: string;
    content: string;
    visibleText?: string | null;
    hidden?: boolean;
    attachmentMeta?: Array<{ type: string; name: string; preview?: string }>;
  }>;
  space_id: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to transform database messages to typed format
function transformMessages(messages: Json): Conversation["messages"] {
  if (Array.isArray(messages)) {
    return messages.map(m => {
      const message = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
      const attachmentMeta = Array.isArray(message.attachmentMeta)
        ? message.attachmentMeta.filter((item): item is { type: string; name: string; preview?: string } => (
            Boolean(item) && typeof item === "object" &&
            typeof (item as Record<string, unknown>).type === "string" &&
            typeof (item as Record<string, unknown>).name === "string"
          )).map(item => ({
            type: item.type,
            name: item.name,
            ...(typeof item.preview === "string" ? { preview: item.preview } : {}),
          }))
        : undefined;

      return {
        role: String(message.role || "user"),
        content: String(message.content || ""),
        visibleText: typeof message.visibleText === "string" ? message.visibleText : null,
        hidden: Boolean(message.hidden),
        ...(attachmentMeta ? { attachmentMeta } : {}),
      };
    });
  }
  return [];
}

// Helper to transform database conversation to Conversation type
function transformConversation(data: Record<string, unknown>): Conversation {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    title: data.title ? String(data.title) : null,
    title_source: data.title_source === "manual" ? "manual" : "automatic",
    messages: transformMessages(data.messages as Json),
    space_id: data.space_id ? String(data.space_id) : null,
    is_archived: Boolean(data.is_archived),
    is_pinned: Boolean(data.is_pinned),
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export function useConversations(coachType: "student" | "tutor" = "student") {
  const [spaces, setSpaces] = useState<ConversationSpace[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadSpaces = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("conversation_spaces")
      .select("*")
      .eq("user_id", user.id)
      .eq("coach_type", coachType)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSpaces(data);
    }
  }, [user, coachType]);

  const loadConversations = useCallback(async (spaceId: string | null = null) => {
    if (!user) return;

    let query = supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .eq("coach_type", coachType)
      .order("updated_at", { ascending: false });

    if (spaceId) {
      query = query.eq("space_id", spaceId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setConversations(data.map(d => transformConversation(d as unknown as Record<string, unknown>)));
    }
    setLoading(false);
  }, [user, coachType]);

  useEffect(() => {
    if (user) {
      loadSpaces();
      loadConversations(selectedSpaceId);
    }
  }, [user, loadSpaces, loadConversations, selectedSpaceId]);

  useEffect(() => {
    const handleConversationUpdated = (event: Event) => {
      const { conversationId, updates } = (event as CustomEvent<{
        conversationId: string;
        updates: Partial<Conversation>;
      }>).detail;
      setConversations(prev => prev.map(conversation => (
        conversation.id === conversationId
          ? { ...conversation, ...updates }
          : conversation
      )));
    };

    window.addEventListener(CONVERSATION_UPDATED_EVENT, handleConversationUpdated);
    return () => window.removeEventListener(CONVERSATION_UPDATED_EVENT, handleConversationUpdated);
  }, []);

  const createSpace = useCallback(async (
    name: string,
    description?: string,
    icon: string = "📁",
    color: string = "#3b82f6"
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("conversation_spaces")
      .insert({
        user_id: user.id,
        name,
        description,
        icon,
        color,
        coach_type: coachType,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create space");
      return null;
    }

    setSpaces(prev => [data, ...prev]);
    toast.success("Space created!");
    return data;
  }, [user]);

  const deleteSpace = useCallback(async (spaceId: string) => {
    const { error } = await supabase
      .from("conversation_spaces")
      .delete()
      .eq("id", spaceId);

    if (error) {
      toast.error("Failed to delete space");
      return;
    }

    setSpaces(prev => prev.filter(s => s.id !== spaceId));
    if (selectedSpaceId === spaceId) {
      setSelectedSpaceId(null);
    }
    toast.success("Space deleted");
  }, [selectedSpaceId]);

  const createConversation = useCallback(async (title?: string, spaceId?: string | null) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title: title ? normalizeConversationTitle(title) : DEFAULT_CONVERSATION_TITLE,
        title_source: title ? "manual" : "automatic",
        messages: [],
        space_id: spaceId || selectedSpaceId,
        coach_type: coachType,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create conversation");
      return null;
    }

    const transformed = transformConversation(data as unknown as Record<string, unknown>);
    setConversations(prev => [transformed, ...prev]);
    return transformed;
  }, [user, selectedSpaceId]);

  const updateConversation = useCallback(async (
    conversationId: string,
    updates: Partial<Pick<Conversation, "title" | "messages" | "space_id" | "is_archived" | "is_pinned">>
  ): Promise<boolean> => {
    const persistedUpdates = updates.title === undefined
      ? updates
      : {
          ...updates,
          title: normalizeConversationTitle(updates.title),
          title_source: "manual" as const,
        };
    const { error } = await supabase
      .from("ai_conversations")
      .update({ ...persistedUpdates, updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to update conversation");
      return false;
    }

    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, ...persistedUpdates } : c))
    );
    emitConversationUpdated(conversationId, persistedUpdates);
    return true;
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }

    setConversations(prev => prev.filter(c => c.id !== conversationId));
    toast.success("Conversation deleted");
  }, []);

  const togglePin = useCallback(async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    await updateConversation(conversationId, { is_pinned: !conv.is_pinned });
  }, [conversations, updateConversation]);

  const archiveConversation = useCallback(async (conversationId: string) => {
    await updateConversation(conversationId, { is_archived: true });
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    toast.success("Conversation archived");
  }, [updateConversation]);

  const moveToSpace = useCallback(async (conversationId: string, spaceId: string | null) => {
    await updateConversation(conversationId, { space_id: spaceId });
    toast.success("Conversation moved");
  }, [updateConversation]);

  return {
    spaces,
    conversations,
    selectedSpaceId,
    setSelectedSpaceId,
    loading,
    loadSpaces,
    loadConversations,
    createSpace,
    deleteSpace,
    createConversation,
    updateConversation,
    deleteConversation,
    togglePin,
    archiveConversation,
    moveToSpace,
  };
}
