import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { awardXP } from "@/lib/award-xp";
import { XP_REWARDS } from "@/lib/gamification-config";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  visibleText?: string;
  hidden?: boolean;
  attachmentMeta?: Array<{ type: string; name: string; preview?: string }>;
}

interface StreamChatOptions {
  endpoint: "student-chat" | "teacher-reports" | "admin-analytics";
  isReport?: boolean;
  reportContext?: {
    type: string;
    instructions?: string;
  };
  analysisType?: "general" | "projection" | "comprehensive";
  modelOverride?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useAIChat(conversationId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  // Save messages to the ai_conversations table
  const saveMessages = useCallback(async (msgs: Message[]) => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    const dbMessages = msgs.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.visibleText ? { visibleText: m.visibleText } : {}),
      ...(m.hidden ? { hidden: true } : {}),
      ...(m.attachmentMeta?.length ? { attachmentMeta: m.attachmentMeta } : {}),
    }));

    const updates: Record<string, unknown> = {
      messages: dbMessages,
      updated_at: new Date().toISOString(),
    };

    // Auto-title the conversation from the first user message
    const firstUser = msgs.find(m => m.role === "user" && !m.hidden);
    if (firstUser) {
      const { data: existing } = await supabase
        .from("ai_conversations")
        .select("title")
        .eq("id", convId)
        .maybeSingle();

      const currentTitle = (existing?.title || "").trim();
      if (!currentTitle || currentTitle === "New Conversation" || currentTitle === "Untitled") {
        const raw = (firstUser.visibleText || firstUser.content).replace(/\s+/g, " ").trim();
        if (raw) {
          updates.title = raw.length > 32 ? `${raw.slice(0, 32).trim()}...` : raw;
        }
      }
    }

    await supabase.from("ai_conversations").update(updates).eq("id", convId);
    window.dispatchEvent(new CustomEvent("adaptiveprep:conversations-changed"));
  }, []);


  const streamChat = useCallback(async (
    userInput: string,
    options: StreamChatOptions,
    visibleText?: string,
    attachmentMeta?: Array<{ type: string; name: string; preview?: string }>,
    hidden?: boolean
  ) => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userInput.trim(),
      timestamp: new Date(),
      visibleText: visibleText || undefined,
      hidden: hidden || undefined,
      attachmentMeta: attachmentMeta?.length ? attachmentMeta : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Tracked outside the try so error handling can preserve partial output
    let assistantId: string | null = null;
    let assistantContent = "";

    try {

      // Get user's session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to use AI chat");
        setIsLoading(false);
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }

      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/${options.endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          isReport: options.isReport || false,
          reportContext: options.reportContext,
          analysisType: options.analysisType,
          modelOverride: options.modelOverride,
        }),
      });

      if (!response.ok) {
        let errorData: { error?: string } = {};
        try {
          errorData = await response.json();
        } catch {
          /* non-JSON error body */
        }

        if (response.status === 402 || response.status === 429 || response.status === 403) {
          const friendly =
            response.status === 402
              ? errorData.error || "You're out of AI credits for today."
              : response.status === 429
                ? "Rate limit exceeded. Please try again in a moment."
                : errorData.error || "Access denied";
          toast.error(friendly);
          // Keep the user's message visible and explain what happened inline.
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "assistant" as const,
              content: `_${friendly}_`,
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
          return;
        }

        throw new Error(errorData.error || "Failed to get response");

      }


      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      // Create initial assistant message
      assistantId = (Date.now() + 1).toString();
      const activeAssistantId = assistantId;
      setMessages(prev => [...prev, {
        id: activeAssistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }]);


      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch {
            // Incomplete JSON, put back and wait
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch { /* ignore */ }
        }
      }

      // Refresh profile to update credits
      await refreshProfile();

      // Award XP for AI interaction (fire-and-forget)
      if (user?.id) {
        awardXP(user.id, XP_REWARDS.ai_chat_message).catch(() => {});
      }

      // Save to database
      setMessages(prev => {
        saveMessages(prev);
        return prev;
      });

    } catch (error) {
      console.error("AI chat error:", error);
      const msg = error instanceof Error ? error.message : "Failed to get AI response";
      toast.error(msg);
      // Keep the user's message and any partial answer — never reset the chat.
      setMessages(prev => {
        if (assistantId) {
          return prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: assistantContent
                    ? `${assistantContent}\n\n_Response interrupted: ${msg}_`
                    : `_Something went wrong: ${msg}. Your message is saved — try sending again._`,
                }
              : m
          );
        }
        return [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant" as const,
            content: `_Something went wrong: ${msg}. Your message is saved — try sending again._`,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }

  }, [messages, isLoading, refreshProfile, saveMessages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Load messages from a conversation
  const loadConversationMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("ai_conversations")
      .select("messages")
      .eq("id", convId)
      .single();
    if (data?.messages && Array.isArray(data.messages)) {
      const loaded = (data.messages as Array<{
        role: string;
        content: string;
        visibleText?: string;
        hidden?: boolean;
        attachmentMeta?: Message["attachmentMeta"];
      }>).map((m, i) => ({
        id: `loaded-${i}`,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(),
        visibleText: m.visibleText,
        hidden: m.hidden,
        attachmentMeta: m.attachmentMeta,
      }));
      // Never wipe an in-progress chat with an empty/stale server copy
      setMessages(prev => (loaded.length === 0 && prev.length > 0 ? prev : loaded));
    }

  }, []);

  return {
    messages,
    isLoading,
    streamChat,
    clearMessages,
    setMessages,
    loadConversationMessages,
  };
}
