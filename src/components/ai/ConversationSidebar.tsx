import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquarePlus, 
  Folder, 
  Pin, 
  Trash2, 
  MoreHorizontal,
  FolderPlus,
  Archive,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, Conversation, ConversationSpace } from "@/hooks/useConversations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";

interface ConversationSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (conversation: Conversation | null) => void;
  onNewConversation: () => void;
}

const ICON_OPTIONS = ["📁", "📚", "🎓", "💼", "🔬", "🎨", "📊", "🌟", "💡", "🎯"];
const COLOR_OPTIONS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const {
    spaces,
    conversations,
    selectedSpaceId,
    setSelectedSpaceId,
    loading,
    createSpace,
    deleteSpace,
    deleteConversation,
    togglePin,
    archiveConversation,
    moveToSpace,
  } = useConversations();

  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState<string | null>(null);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceDescription, setNewSpaceDescription] = useState("");
  const [newSpaceIcon, setNewSpaceIcon] = useState("📁");
  const [newSpaceColor, setNewSpaceColor] = useState("#3b82f6");
  const [expandedSpaces, setExpandedSpaces] = useState(true);

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    await createSpace(newSpaceName, newSpaceDescription, newSpaceIcon, newSpaceColor);
    setShowCreateSpace(false);
    setNewSpaceName("");
    setNewSpaceDescription("");
    setNewSpaceIcon("📁");
    setNewSpaceColor("#3b82f6");
  };

  const pinnedConversations = conversations.filter(c => c.is_pinned);
  const unpinnedConversations = conversations.filter(c => !c.is_pinned);

  const getPreviewText = (messages: Array<{ role: string; content: string }>) => {
    const firstUserMsg = messages.find(m => m.role === "user");
    if (!firstUserMsg) return "No messages yet";
    return firstUserMsg.content.length > 50
      ? firstUserMsg.content.substring(0, 50) + "..."
      : firstUserMsg.content;
  };

  // Find the space for a conversation
  const getSpaceForConv = (conv: Conversation) => spaces.find(s => s.id === conv.space_id);

  const renderConversation = (conv: Conversation, showSpaceBadge = false) => {
    const space = showSpaceBadge ? getSpaceForConv(conv) : null;
    return (
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
          <div className="flex items-center gap-1.5">
            {conv.is_pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
            {space && <span className="text-[10px] flex-shrink-0">{space.icon}</span>}
            <p className="text-sm font-medium truncate">
              {conv.title || "Untitled"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
            {getPreviewText(conv.messages)}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => togglePin(conv.id)}>
              <Pin className="h-4 w-4 mr-2" />
              {conv.is_pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowMoveDialog(conv.id)}>
              <Folder className="h-4 w-4 mr-2" />
              Move to Space
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => archiveConversation(conv.id)}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => deleteConversation(conv.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // Group conversations by space for "All" view
  const groupedBySpace = () => {
    const withSpace: Record<string, Conversation[]> = {};
    const general: Conversation[] = [];
    
    unpinnedConversations.forEach((conv) => {
      if (conv.space_id) {
        if (!withSpace[conv.space_id]) withSpace[conv.space_id] = [];
        withSpace[conv.space_id].push(conv);
      } else {
        general.push(conv);
      }
    });

    return { withSpace, general };
  };

  return (
    <>
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
          <div className="px-2 pb-2 space-y-3">
            {/* Spaces */}
            <div>
              <button
                className="flex items-center gap-2 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                onClick={() => setExpandedSpaces(!expandedSpaces)}
              >
                {expandedSpaces ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Spaces
              </button>
              
              {expandedSpaces && (
                <div className="mt-1 space-y-0.5">
                  <button
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm transition-colors",
                      !selectedSpaceId
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => setSelectedSpaceId(null)}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    All
                    <span className="ml-auto text-xs opacity-50">{conversations.length}</span>
                  </button>

                  {spaces.map(space => (
                    <button
                      key={space.id}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm transition-colors",
                        selectedSpaceId === space.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                      onClick={() => setSelectedSpaceId(space.id)}
                    >
                      <span className="text-xs">{space.icon}</span>
                      <span className="truncate">{space.name}</span>
                      <span className="ml-auto text-xs opacity-50">{space.conversation_count}</span>
                    </button>
                  ))}

                  <button
                    className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground transition-colors"
                    onClick={() => setShowCreateSpace(true)}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    New Space
                  </button>
                </div>
              )}
            </div>

            {/* Pinned */}
            {pinnedConversations.length > 0 && (
              <div>
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Pinned</p>
                <div className="space-y-0.5">{pinnedConversations.map(renderConversation)}</div>
              </div>
            )}

            {/* Recent */}
            <div>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Recent</p>
              <div className="space-y-0.5">
                {loading ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">Loading...</div>
                ) : unpinnedConversations.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">No conversations</div>
                ) : (
                  unpinnedConversations.map(renderConversation)
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Create Space Dialog */}
      <Dialog open={showCreateSpace} onOpenChange={setShowCreateSpace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} placeholder="e.g., SAT Math" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea value={newSpaceDescription} onChange={(e) => setNewSpaceDescription(e.target.value)} placeholder="Optional" rows={2} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Icon</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {ICON_OPTIONS.map(icon => (
                  <button key={icon} className={cn("w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors", newSpaceIcon === icon ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80")} onClick={() => setNewSpaceIcon(icon)}>{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Color</label>
              <div className="flex gap-2 mt-1">
                {COLOR_OPTIONS.map(color => (
                  <button key={color} className={cn("w-7 h-7 rounded-full transition-transform", newSpaceColor === color && "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110")} style={{ backgroundColor: color }} onClick={() => setNewSpaceColor(color)} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSpace(false)}>Cancel</Button>
            <Button onClick={handleCreateSpace} disabled={!newSpaceName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Space Dialog */}
      <Dialog open={!!showMoveDialog} onOpenChange={() => setShowMoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-4">
            <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left" onClick={() => { if (showMoveDialog) moveToSpace(showMoveDialog, null); setShowMoveDialog(null); }}>
              <Folder className="w-4 h-4" />
              <span>All Conversations</span>
            </button>
            {spaces.map(space => (
              <button key={space.id} className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left" onClick={() => { if (showMoveDialog) moveToSpace(showMoveDialog, space.id); setShowMoveDialog(null); }}>
                <span className="text-lg">{space.icon}</span>
                <span>{space.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
