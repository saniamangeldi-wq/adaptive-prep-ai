import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

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
  messages: Array<{ role: string; content: string }>;
  space_id: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to transform database messages to typed format
function transformMessages(messages: Json): Array<{ role: string; content: string }> {
  if (Array.isArray(messages)) {
    return messages.map(m => ({
      role: String((m as Record<string, unknown>)?.role || "user"),
      content: String((m as Record<string, unknown>)?.content || ""),
    }));
  }
  return [];
}

// Helper to transform database conversation to Conversation type
function transformConversation(data: Record<string, unknown>): Conversation {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    title: data.title ? String(data.title) : null,
    messages: transformMessages(data.messages as Json),
    space_id: data.space_id ? String(data.space_id) : null,
    is_archived: Boolean(data.is_archived),
    is_pinned: Boolean(data.is_pinned),
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export function useConversations() {
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
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSpaces(data);
    }
  }, [user]);

  const loadConversations = useCallback(async (spaceId: string | null = null) => {
    if (!user) return;

    let query = supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    if (spaceId) {
      query = query.eq("space_id", spaceId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setConversations(data.map(d => transformConversation(d as unknown as Record<string, unknown>)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSpaces();
      loadConversations(selectedSpaceId);
    }
  }, [user, loadSpaces, loadConversations, selectedSpaceId]);

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
        title: title || "New Conversation",
        messages: [],
        space_id: spaceId || selectedSpaceId,
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
  ) => {
    const { error } = await supabase
      .from("ai_conversations")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to update conversation");
      return;
    }

    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, ...updates } : c))
    );
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
