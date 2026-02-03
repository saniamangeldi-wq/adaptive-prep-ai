import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface StreamChatOptions {
  endpoint: "student-chat" | "teacher-reports" | "admin-analytics";
  isReport?: boolean;
  reportContext?: {
    type: string;
    instructions?: string;
  };
  analysisType?: "general" | "projection" | "comprehensive";
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshProfile } = useAuth();

  const streamChat = useCallback(async (
    userInput: string,
    options: StreamChatOptions
  ) => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userInput.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 402) {
          toast.error(errorData.error || "Insufficient credits");
          setIsLoading(false);
          return;
        }
        
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
          setIsLoading(false);
          return;
        }

        if (response.status === 403) {
          toast.error(errorData.error || "Access denied");
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
      let assistantContent = "";
      let streamDone = false;

      // Create initial assistant message
      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantId,
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

    } catch (error) {
      console.error("AI chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get AI response");
      // Remove the user message if it failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, refreshProfile]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    streamChat,
    clearMessages,
    setMessages,
  };
}
