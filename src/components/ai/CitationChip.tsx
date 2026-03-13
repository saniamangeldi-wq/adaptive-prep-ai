import { cn } from "@/lib/utils";

interface CitationChipProps {
  name: string;
  type: "document" | "url" | "text";
  onClick?: () => void;
}

export function CitationChip({ name, type, onClick }: CitationChipProps) {
  const icon = type === "document" ? "📄" : type === "url" ? "🔗" : "📝";

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "text-[10px] font-medium text-muted-foreground/70",
        "bg-muted/30 border border-border/20",
        "hover:bg-muted/50 hover:text-foreground transition-colors",
        "mt-1 mr-1"
      )}
    >
      <span className="text-[10px]">{icon}</span>
      <span className="truncate max-w-[150px]">{name}</span>
    </button>
  );
}
