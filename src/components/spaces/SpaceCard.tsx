import { formatDistanceToNow } from "date-fns";
import { ArrowRight, MoreHorizontal, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationSpace } from "@/hooks/useConversations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SpaceCardProps {
  space: ConversationSpace;
  onOpen: (space: ConversationSpace) => void;
  onSettings: (space: ConversationSpace) => void;
  onDelete: (spaceId: string) => void;
}

const SPACE_GRADIENTS: Record<string, string> = {
  "📁": "from-blue-500/8 to-blue-600/4",
  "📚": "from-amber-500/8 to-amber-600/4",
  "🎓": "from-primary/8 to-teal-500/4",
  "💼": "from-slate-500/8 to-slate-600/4",
  "🔬": "from-purple-500/8 to-purple-600/4",
  "🎨": "from-pink-500/8 to-pink-600/4",
  "📊": "from-emerald-500/8 to-emerald-600/4",
  "🌟": "from-yellow-500/8 to-yellow-600/4",
  "💡": "from-orange-500/8 to-orange-600/4",
  "🎯": "from-red-500/8 to-red-600/4",
  "📐": "from-cyan-500/8 to-cyan-600/4",
  "📖": "from-indigo-500/8 to-indigo-600/4",
  "🧪": "from-violet-500/8 to-violet-600/4",
  "✍️": "from-rose-500/8 to-rose-600/4",
  "🌍": "from-green-500/8 to-green-600/4",
  "🚀": "from-sky-500/8 to-sky-600/4",
};

export function SpaceCard({ space, onOpen, onSettings, onDelete }: SpaceCardProps) {
  const gradient = SPACE_GRADIENTS[space.icon] || "from-primary/8 to-teal-500/4";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/20 bg-gradient-to-br p-5 cursor-pointer transition-all duration-200",
        "hover:border-primary/40 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.2)] hover:-translate-y-0.5",
        gradient
      )}
      style={{ background: "rgba(255,255,255,0.04)" }}
      onClick={() => onOpen(space)}
    >
      {/* Icon */}
      <div className="text-3xl mb-3">{space.icon}</div>

      {/* Name */}
      <h3 className="text-base font-semibold text-foreground mb-1 truncate">
        {space.name}
      </h3>

      {/* Description */}
      <p className="text-[13px] text-muted-foreground truncate mb-3">
        {space.description || "No description"}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <span>{space.conversation_count || 0} conversations</span>
        <span>•</span>
        <span>Updated {formatDistanceToNow(new Date(space.created_at), { addSuffix: true })}</span>
      </div>

      {/* Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSettings(space); }}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(space.id); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Open arrow */}
      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-primary" />
      </div>
    </div>
  );
}
