import { useState } from "react";
import { ChevronDown, CheckCircle2, XCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideItem {
  text: string;
  type: "do" | "dont";
}

interface GuideSectionProps {
  title: string;
  icon: LucideIcon;
  description: string;
  items: GuideItem[];
  defaultOpen?: boolean;
}

export function GuideSection({ title, icon: Icon, description, items, defaultOpen = false }: GuideSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              {item.type === "do" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              )}
              <span className="text-sm text-foreground/90">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
