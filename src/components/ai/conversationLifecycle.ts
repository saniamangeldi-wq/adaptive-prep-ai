import { useCallback, useEffect, useRef, useState } from "react";

export interface ConversationLifecycleProps {
  conversationId?: string | null;
  onEnsureConversation?: () => Promise<string | null>;
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
}

interface UseConversationLifecycleOptions extends ConversationLifecycleProps {}

export function useConversationLifecycle({
  conversationId,
  onEnsureConversation,
}: UseConversationLifecycleOptions) {
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const skipNextLoad = useRef(false);
  const ensurePromise = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    setActiveConvId(conversationId || null);
  }, [conversationId]);

  const ensureConversationId = useCallback(async () => {
    if (activeConvId) return activeConvId;
    if (!onEnsureConversation) return null;

    if (!ensurePromise.current) {
      ensurePromise.current = onEnsureConversation().finally(() => {
        ensurePromise.current = null;
      });
    }

    const newId = await ensurePromise.current;
    if (!newId) return null;

    skipNextLoad.current = true;
    setActiveConvId(newId);
    return newId;
  }, [activeConvId, onEnsureConversation]);

  return { activeConvId, setActiveConvId, skipNextLoad, ensureConversationId };
}
