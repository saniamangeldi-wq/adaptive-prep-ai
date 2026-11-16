import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap, MessageSquare, PenLine, History, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { SIDEBAR } from "@/lib/design-system";

type NavItem = {
  nameKey: string;
  href: string;
  icon: React.ElementType;
  /** Extra path prefixes that should also highlight this item. */
  matchPrefix?: string;
};

const navigation: NavItem[] = [
  { nameKey: "nav.chat", href: "/dashboard", icon: MessageSquare },
  { nameKey: "nav.writing", href: "/dashboard/writing", icon: PenLine, matchPrefix: "/dashboard/writing" },
  { nameKey: "nav.history", href: "/dashboard/history", icon: History, matchPrefix: "/dashboard/history" },
  { nameKey: "nav.settings", href: "/dashboard/settings", icon: Settings, matchPrefix: "/dashboard/settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  /**
   * Full-bleed content that fills the viewport below the header (used by the chat
   * page, which manages its own scrolling). Default pages scroll normally.
   */
  flush?: boolean;
}

export function DashboardLayout({ children, flush = false }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (item: NavItem) => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (item.href === "/dashboard") {
      // Chat is the home of the dashboard; /dashboard/coach is the same page.
      return path === "/dashboard" || path === "/dashboard/coach";
    }
    return item.matchPrefix ? path === item.matchPrefix || path.startsWith(`${item.matchPrefix}/`) : path === item.href;
  };

  const iconStyle = { width: SIDEBAR.icon_size, height: SIDEBAR.icon_size };
  const initial = profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || "?";
  const displayName = profile?.full_name || t("dashboard.user");

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className="dashboard-sidebar-locked fixed top-0 left-0 z-50 h-full border-r border-sidebar-border hidden md:flex flex-col bg-sidebar"
        style={{ width: SIDEBAR.width_collapsed }}
      >
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/dashboard"
              aria-label="AdaptivePrep"
              className="h-14 w-full flex items-center justify-center border-b border-sidebar-border"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="text-sidebar-primary" style={iconStyle} />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">AdaptivePrep</TooltipContent>
        </Tooltip>

        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const label = t(item.nameKey);
            return (
              <Tooltip key={item.nameKey} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    aria-label={label}
                    className={cn(
                      "flex items-center h-10 w-10 mx-auto justify-center rounded-lg transition-colors",
                      isActive(item)
                        ? "bg-sidebar-accent/70 text-sidebar-primary"
                        : "text-[hsl(var(--sidebar-icon-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                  >
                    <item.icon style={iconStyle} className="flex-shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-1.5">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                aria-label={t("dashboard.sign_out")}
                className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors text-[hsl(var(--sidebar-icon-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              >
                <LogOut style={iconStyle} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {displayName} · {t("dashboard.sign_out")}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      <div className="md:pl-[var(--sidebar-offset)]" style={{ ["--sidebar-offset" as string]: SIDEBAR.width_collapsed }}>
        <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-lg border-b border-border flex items-center px-4 lg:px-6">
          <Link to="/dashboard" className="md:hidden flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground truncate">AdaptivePrep</span>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0"
              title={displayName}
            >
              {initial}
            </div>
            <button
              onClick={handleSignOut}
              aria-label={t("dashboard.sign_out")}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main
          className={cn(
            flush
              ? "h-[calc(100dvh-3.5rem)] pb-14 md:pb-0 flex flex-col"
              : "p-4 lg:p-6 pb-20 md:pb-6"
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile: bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <ul className="grid grid-cols-4">
          {navigation.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.nameKey} className="min-w-0">
                <Link
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 h-14 px-1 text-[11px] font-medium transition-colors",
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate max-w-full">{t(item.nameKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
