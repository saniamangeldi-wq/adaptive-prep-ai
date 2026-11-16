import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { groupByRecency } from "@/components/dashboard/conversationGroups";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationSidebarProps {
  /** The conversation open in the chat, if any. */
  currentConversationId?: string | null;
  /** Called after a conversation is deleted (the shell starts a new chat if it was open). */
  onDeleted?: (conversation: Conversation) => void;
  /** Called when a conversation is opened (the phone drawer closes). */
  onOpen?: () => void;
}

export function conversationHref(id: string) {
  return `/dashboard?c=${encodeURIComponent(id)}`;
}

function titleOf(conv: Conversation) {
  const t = (conv.title || "").trim();
  if (t && t !== "New Conversation") return t;
  const first = conv.messages.find((m) => m.role === "user")?.content?.trim();
  return first ? first.slice(0, 60) : "Untitled chat";
}

/** Recent conversations, grouped by recency, each with open and delete. */
export function ConversationSidebar({ currentConversationId, onDeleted, onOpen }: ConversationSidebarProps) {
  const { conversations, loading, deleteConversation } = useConversations();
  // Chats with no messages are created lazily and swept away; never list them.
  const visible = useMemo(() => conversations.filter((c) => c.messages.length > 0 || c.id === currentConversationId), [conversations, currentConversationId]);
  const groups = useMemo(() => groupByRecency(visible), [visible]);

  const handleDelete = async (conv: Conversation) => {
    const deleted = await deleteConversation(conv.id);
    if (deleted) onDeleted?.(conv);
  };

  if (loading) {
    return (
      <div className="px-3 py-2 space-y-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 rounded bg-sidebar-accent/70" style={{ width: `${80 - i * 15}%` }} />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return <p className="px-3 py-2 text-sm text-muted-foreground">Your chats will appear here.</p>;
  }

  return (
    <nav aria-label="Recent chats" className="space-y-4">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="px-3 pb-1 text-xs font-medium text-muted-foreground">{group.label}</h3>
          <ul className="space-y-px">
            {group.items.map((conv) => {
              const active = conv.id === currentConversationId;
              const title = titleOf(conv);
              return (
                <li key={conv.id} className="group relative">
                  <Link
                    to={conversationHref(conv.id)}
                    onClick={onOpen}
                    aria-current={active ? "page" : undefined}
                    title={title}
                    className={cn(
                      "flex h-9 items-center rounded-lg pl-3 pr-9 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                    )}
                  >
                    <span className="truncate">{title}</span>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Options for “${title}”`}
                        className={cn(
                          "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/70",
                          "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100",
                          active && "md:opacity-100",
                        )}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleDelete(conv)}>
                        <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
