import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const TAGS = [
  { emoji: "🏙️", label: "City Life" },
  { emoji: "🔬", label: "Research-Focused" },
  { emoji: "🎭", label: "Arts & Culture" },
  { emoji: "🏆", label: "Prestige" },
  { emoji: "💰", label: "Scholarship Priority" },
  { emoji: "🌍", label: "Diverse Community" },
  { emoji: "🏄", label: "Student Life" },
  { emoji: "🤝", label: "Small Classes" },
  { emoji: "🚀", label: "Entrepreneurship" },
  { emoji: "🌿", label: "Campus Nature" },
  { emoji: "💻", label: "Tech Hub" },
  { emoji: "🎵", label: "Music Scene" },
];

interface PersonalityTagsProps {
  selected: string[];
  onToggle: (tag: string) => void;
  max?: number;
}

export function PersonalityTags({
  selected,
  onToggle,
  max = 5,
}: PersonalityTagsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">
          What defines your ideal university life?
        </h4>
        <span className="text-xs text-muted-foreground">
          {selected.length}/{max} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const isSelected = selected.includes(tag.label);
          const isDisabled = !isSelected && selected.length >= max;

          return (
            <button
              key={tag.label}
              onClick={() => !isDisabled && onToggle(tag.label)}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all duration-200",
                isSelected
                  ? "bg-primary/15 border-primary/40 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.1)]"
                  : isDisabled
                  ? "bg-muted/20 border-border/30 text-muted-foreground/50 cursor-not-allowed"
                  : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground cursor-pointer"
              )}
            >
              <span>{tag.emoji}</span>
              <span>{tag.label}</span>
              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
