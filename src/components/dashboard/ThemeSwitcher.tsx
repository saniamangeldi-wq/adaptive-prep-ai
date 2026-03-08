import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type AppTheme = "dark" | "light" | "midnight" | "sepia";

const themes: { id: AppTheme; label: string; color: string; preview: string }[] = [
  { id: "dark", label: "Dark", color: "bg-[#0f0f0f]", preview: "border-emerald-500" },
  { id: "light", label: "Light", color: "bg-[#f5f5f5]", preview: "border-teal-600" },
  { id: "midnight", label: "Midnight", color: "bg-[#0a0f1e]", preview: "border-indigo-500" },
  { id: "sepia", label: "Sepia", color: "bg-[#1c1713]", preview: "border-amber-500" },
];

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  // Remove all theme classes
  root.classList.remove("dark", "light", "theme-midnight", "theme-sepia");

  switch (theme) {
    case "light":
      root.classList.add("light");
      break;
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
      <PopoverContent side="right" align="end" className="w-48 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Choose theme</p>
        <div className="flex items-center gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSetTheme(t.id)}
              className={cn(
                "w-9 h-9 rounded-full border-2 transition-transform",
                t.color,
                currentTheme === t.id
                  ? cn("ring-2 ring-offset-2 ring-offset-popover scale-110", t.preview)
                  : "border-transparent hover:scale-105"
              )}
              title={t.label}
            />
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
