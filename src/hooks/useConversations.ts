import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  messages: Array<{ role: string; content: string }>;
  created_at: string;
  updated_at: string;
}

// Chats live in `ai_conversations`; every chat here belongs to the student coach.
const COACH_TYPE = "student";

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
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .eq("coach_type", COACH_TYPE)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setConversations(data.map(d => transformConversation(d as unknown as Record<string, unknown>)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Keep every mounted instance of this hook in sync (sidebar + chat page)
  useEffect(() => {
    const onChanged = () => {
      loadConversations();
    };
    window.addEventListener("adaptiveprep:conversations-changed", onChanged);
    return () => window.removeEventListener("adaptiveprep:conversations-changed", onChanged);
  }, [loadConversations]);

  // Remove conversations that were created but never used
  const deleteEmptyConversations = useCallback(async (exceptId?: string | null) => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("user_id", user.id)
      .eq("coach_type", COACH_TYPE);

    const emptyIds = (data || [])
      .filter(c => {
        const msgs = c.messages as unknown;
        return (!Array.isArray(msgs) || msgs.length === 0) && c.id !== exceptId;
      })
      .map(c => c.id);

    if (emptyIds.length === 0) return;

    await supabase.from("ai_conversations").delete().in("id", emptyIds);
    setConversations(prev => prev.filter(c => !emptyIds.includes(c.id)));
  }, [user]);

  const createConversation = useCallback(async (title?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title: title || "New Conversation",
        messages: [],
        coach_type: COACH_TYPE,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create conversation");
      return null;
    }

    const transformed = transformConversation(data as unknown as Record<string, unknown>);
    setConversations(prev => [transformed, ...prev]);
    window.dispatchEvent(new CustomEvent("adaptiveprep:conversations-changed"));
    return transformed;
  }, [user]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to delete conversation");
      return false;
    }

    setConversations(prev => prev.filter(c => c.id !== conversationId));
    window.dispatchEvent(new CustomEvent("adaptiveprep:conversations-changed"));
    toast.success("Conversation deleted");
    return true;
  }, []);

  return {
    conversations,
    loading,
    loadConversations,
    createConversation,
    deleteConversation,
    deleteEmptyConversations,
  };
}
