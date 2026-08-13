import { Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EliteModel = "gemini-pro" | "perplexity-pro" | "gpt-5";

interface ModelSelectorProps {
  value: EliteModel;
  onChange: (model: EliteModel) => void;
  className?: string;
}

const models: { value: EliteModel; label: string; disabled?: boolean; badge?: string }[] = [
  { value: "gemini-pro", label: "Gemini 3.1 Pro" },
  { value: "perplexity-pro", label: "Perplexity Sonar Pro" },
  { value: "gpt-5", label: "GPT-5.6 Sol" },
];

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Crown className="w-3.5 h-3.5 text-warning flex-shrink-0" />
      <Select value={value} onValueChange={(v) => onChange(v as EliteModel)}>
        <SelectTrigger className="h-7 w-[170px] text-xs border-warning/30 bg-warning/5 hover:bg-warning/10 focus:ring-warning/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.value} value={m.value} disabled={m.disabled}>
              <span className="flex items-center gap-2">
                {m.label}
                {m.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {m.badge}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
