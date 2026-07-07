import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type AppTheme = "dark" | "midnight" | "sepia";

const themes: { id: AppTheme; label: string; swatch: string; ring: string }[] = [
  { id: "dark", label: "Dark", swatch: "bg-gradient-to-br from-slate-700 to-slate-950", ring: "ring-emerald-400" },
  { id: "midnight", label: "Midnight", swatch: "bg-gradient-to-br from-indigo-500 to-indigo-950", ring: "ring-indigo-300" },
  { id: "sepia", label: "Sepia", swatch: "bg-gradient-to-br from-amber-400 to-amber-900", ring: "ring-amber-300" },
];

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  // Remove all theme classes
  root.classList.remove("dark", "theme-midnight", "theme-sepia");

  switch (theme) {
    case "midnight":
      root.classList.add("dark", "theme-midnight");
      break;
    case "sepia":
      root.classList.add("dark", "theme-sepia");
      break;
    case "dark":
    default:
      root.classList.add("dark");
      break;
  }
}

export function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem("app-theme") as AppTheme) || "dark";
  });

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleSetTheme = (theme: AppTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem("app-theme", theme);
    applyTheme(theme);
  };

  const trigger = (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-lg text-sm font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
            collapsed ? "px-0 py-2 justify-center" : "px-3 py-2"
          )}
        >
          <Palette className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Theme</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-56 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Choose theme</p>
        <div className="flex items-center gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSetTheme(t.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 group focus:outline-none"
              )}
              title={t.label}
            >
              <span
                className={cn(
                  "w-10 h-10 rounded-full border border-white/20 shadow-md transition-transform",
                  t.swatch,
                  currentTheme === t.id
                    ? cn("ring-2 ring-offset-2 ring-offset-popover scale-110", t.ring)
                    : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  currentTheme === t.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div>{trigger}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Theme</TooltipContent>
      </Tooltip>
    );
  }

  return trigger;
}
