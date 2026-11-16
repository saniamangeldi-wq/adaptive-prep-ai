import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquarePlus, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, Conversation } from "@/hooks/useConversations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (conversation: Conversation | null) => void;
  onNewConversation: () => void;
}

const getPreviewText = (messages: Array<{ role: string; content: string }>) => {
  const firstUserMsg = messages.find(m => m.role === "user");
  if (!firstUserMsg) return "No messages yet";
  return firstUserMsg.content.length > 50
    ? firstUserMsg.content.substring(0, 50) + "..."
    : firstUserMsg.content;
};

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const { conversations, loading, deleteConversation } = useConversations();

  const handleDelete = async (conv: Conversation) => {
    const deleted = await deleteConversation(conv.id);
    if (deleted && conv.id === currentConversationId) {
      onNewConversation();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Chat button */}
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-sm"
          onClick={onNewConversation}
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Recent</p>
          <div className="space-y-0.5">
            {loading ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No conversations</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                    currentConversationId === conv.id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  onClick={() => onSelectConversation(conv)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                      {getPreviewText(conv.messages)}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0"
                        aria-label="Conversation options"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(conv)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
