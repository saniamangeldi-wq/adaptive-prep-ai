import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowRight, MoreHorizontal, Settings, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ConversationSpace } from "@/hooks/useConversations";
import { SpaceIconDisplay, isImageIcon } from "./IconPicker";

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
  const { t, i18n } = useTranslation();
  const gradient = SPACE_GRADIENTS[space.icon] || "from-primary/8 to-teal-500/4";
  const iconIsImage = isImageIcon(space.icon);
  const dateLocale = i18n.language?.startsWith("ru") ? ru : undefined;
  const count = space.conversation_count || 0;

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
      <div className={cn("mb-3", iconIsImage ? "w-10 h-10 rounded-lg overflow-hidden" : "text-3xl")}>
        <SpaceIconDisplay icon={space.icon} />
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1 truncate">
        {space.name}
      </h3>

      <p className="text-[13px] text-muted-foreground truncate mb-3">
        {space.description || t("spaces.noDescription")}
      </p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <span>{t("spaces.conversations", { count })}</span>
        <span>•</span>
        <span>{t("spaces.updatedAgo", { time: formatDistanceToNow(new Date(space.created_at), { addSuffix: true, locale: dateLocale }) })}</span>
      </div>

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
              {t("spaces.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(space.id); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-primary" />
      </div>
    </div>
  );
}
