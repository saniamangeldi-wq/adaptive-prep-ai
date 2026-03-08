import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface IconCardOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface IconCardSelectorProps {
  options: IconCardOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: 2 | 3;
}

export function IconCardSelector({
  options,
  value,
  onChange,
  columns = 2,
}: IconCardSelectorProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 3 ? "grid-cols-3" : "grid-cols-2"
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-center group max-h-[120px]",
              isSelected
                ? "border-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                isSelected ? "bg-primary/20" : "bg-muted/50 group-hover:bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
            </div>
            <span
              className={cn(
                "text-sm font-bold leading-tight transition-colors",
                isSelected ? "text-primary" : "text-foreground"
              )}
            >
              {option.label}
            </span>
            <span className="text-xs text-muted-foreground leading-tight">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
