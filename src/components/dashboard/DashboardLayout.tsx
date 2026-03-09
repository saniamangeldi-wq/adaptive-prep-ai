import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  MessageSquare,
  LineChart,
  Layers,
  Settings,
  LogOut,
  Menu,
  Sparkles,
  Zap,
  Users,
  Calendar,
  BarChart3,
  ClipboardList,
  Building2,
  CreditCard,
  BookOpen,
  Trophy,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useSchoolStudent } from "@/hooks/useSchoolStudent";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { SIDEBAR } from "@/lib/design-system";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  schoolOnly?: boolean;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const studentNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Practice Tests", href: "/dashboard/tests", icon: FileText },
  { name: "AI Coach", href: "/dashboard/coach", icon: MessageSquare },
  { name: "Assignments", href: "/dashboard/assignments", icon: ClipboardList, schoolOnly: true },
  { name: "Grades", href: "/dashboard/grades", icon: BarChart3, schoolOnly: true },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar, schoolOnly: true },
  { name: "Curriculum", href: "/dashboard/curriculum", icon: BookOpen, schoolOnly: true },
  { name: "University Match", href: "/dashboard/university-match", icon: GraduationCap },
  { name: "Progress", href: "/dashboard/progress", icon: LineChart },
  { name: "Flashcards", href: "/dashboard/flashcards", icon: Layers },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const tutorNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Students", href: "/dashboard/students", icon: Users },
  { name: "Assignments", href: "/dashboard/manage-assignments", icon: ClipboardList },
  { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  { name: "AI Coach", href: "/dashboard/coach", icon: MessageSquare },
  { name: "Student Progress", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  { name: "Resources", href: "/dashboard/resources", icon: Layers },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const teacherNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Classroom", href: "/dashboard/classroom", icon: Users },
  { name: "Assignments", href: "/dashboard/manage-assignments", icon: ClipboardList },
  { name: "AI Coach", href: "/dashboard/coach", icon: MessageSquare },
  { name: "Class Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Resources", href: "/dashboard/resources", icon: Layers },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "School Overview", href: "/dashboard/school", icon: Building2 },
  { name: "AI Insights", href: "/dashboard/coach", icon: MessageSquare },
  { name: "Assignments", href: "/dashboard/manage-assignments", icon: ClipboardList },
  { name: "Teachers", href: "/dashboard/school/teachers", icon: Users },
  { name: "Students", href: "/dashboard/school/students", icon: GraduationCap },
  { name: "Analytics", href: "/dashboard/school/analytics", icon: BarChart3 },
  { name: "Billing", href: "/dashboard/school/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const { isExpanded: sidebarExpanded, toggleSidebar } = useSidebarStore();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isSchoolStudent } = useSchoolStudent();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
      return;
    }
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert("Tap the Share button in your browser, then select 'Add to Home Screen'");
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const showInstallButton = !isStandalone && (deferredPrompt || isIOS);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getNavigation = (): NavItem[] => {
    switch (profile?.role) {
      case "tutor":
        return tutorNav;
      case "teacher":
        return teacherNav;
      case "school_admin":
        return adminNav;
      case "student":
      default:
        return studentNav.filter((item) => !item.schoolOnly || isSchoolStudent);
    }
  };

  const navigation = getNavigation();
  const iconStyle = { width: SIDEBAR.icon_size, height: SIDEBAR.icon_size };

  const getTierShort = () => {
    if (profile?.is_trial) return "Trial";
    switch (profile?.tier) {
      case "tier_3":
        return "Elite";
      case "tier_2":
        return "Pro";
      case "tier_1":
        return "Basic";
      default:
        return "Free";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className="dashboard-sidebar-locked fixed top-0 left-0 z-50 h-full border-r border-sidebar-border hidden md:flex flex-col transition-[width] duration-200"
        style={{
          width: sidebarExpanded ? SIDEBAR.width_expanded : SIDEBAR.width_collapsed,
        }}
      >
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/dashboard"
              className={cn(
                "h-14 w-full flex items-center border-b border-sidebar-border",
                sidebarExpanded ? "px-3 justify-start" : "justify-center"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="text-sidebar-primary" style={iconStyle} />
              </div>
            </Link>
          </TooltipTrigger>
          {!sidebarExpanded && <TooltipContent side="right" className="text-xs">AdaptivePrep</TooltipContent>}
        </Tooltip>

        <button
          onClick={toggleSidebar}
          className={cn(
            "h-9 flex items-center text-[hsl(var(--sidebar-icon-muted))] hover:text-sidebar-foreground transition-colors",
            sidebarExpanded ? "justify-end px-3" : "justify-center"
          )}
          aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const navButton = (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-lg transition-colors",
                  sidebarExpanded ? "h-10 px-3 gap-3" : "h-10 w-10 mx-auto justify-center",
                  isActive
                    ? "bg-sidebar-accent/70 text-sidebar-primary"
                    : "text-[hsl(var(--sidebar-icon-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <item.icon style={iconStyle} className="flex-shrink-0" />
                {sidebarExpanded && <span className="truncate text-sm font-medium">{item.name}</span>}
              </Link>
            );

            if (sidebarExpanded) return <div key={item.name}>{navButton}</div>;

            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-1.5 space-y-0.5">
          <ThemeSwitcher collapsed={!sidebarExpanded} />

          {showInstallButton && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleInstall}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-lg text-sm font-medium text-[hsl(var(--sidebar-icon-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors",
                    sidebarExpanded ? "px-3 h-10" : "h-10 w-10 mx-auto justify-center"
                  )}
                >
                  <Download style={iconStyle} className="flex-shrink-0" />
                  {sidebarExpanded && <span>Install App</span>}
                </button>
              </TooltipTrigger>
              {!sidebarExpanded && <TooltipContent side="right" className="text-xs">Install App</TooltipContent>}
            </Tooltip>
          )}

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg transition-colors hover:bg-sidebar-accent/60",
                  sidebarExpanded ? "px-2 py-2" : "h-10 w-10 mx-auto justify-center"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-sidebar-primary flex-shrink-0">
                  {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || "?"}
                </div>
                {sidebarExpanded && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name || "User"}</p>
                    <p className="text-[10px] text-[hsl(var(--sidebar-icon-muted))]">{getTierShort()}</p>
                  </div>
                )}
                {sidebarExpanded && <LogOut className="w-3.5 h-3.5 text-[hsl(var(--sidebar-icon-muted))]" />}
              </button>
            </TooltipTrigger>
            {!sidebarExpanded && (
              <TooltipContent side="right" className="text-xs">
                {profile?.full_name || "User"} · {getTierShort()} · Sign out
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>

      {/* Mobile: Bottom sheet */}
      <div className="md:hidden">
        {bottomSheetOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setBottomSheetOpen(false)} />}
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border rounded-t-2xl transition-transform duration-300 ease-out",
            bottomSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-3.5rem)]"
          )}
          style={{ maxHeight: "80dvh" }}
        >
          <button onClick={() => setBottomSheetOpen(!bottomSheetOpen)} className="w-full flex items-center justify-center gap-2 py-3 px-4 min-h-[56px]">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-sidebar-foreground">Menu</span>
            <div className="w-8 h-1 bg-sidebar-foreground/30 rounded-full ml-2" />
          </button>

          {bottomSheetOpen && (
            <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ maxHeight: "calc(80dvh - 3.5rem)" }}>
              <nav className="space-y-1 pb-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[48px]",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                      onClick={() => setBottomSheetOpen(false)}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-sidebar-border pt-3 pb-2">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">{getTierShort()}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 min-w-[48px] min-h-[48px] flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="dashboard-main-shell transition-[padding] duration-200 md:pl-[var(--sidebar-offset)]"
        style={{
          ["--sidebar-offset" as string]: sidebarExpanded ? SIDEBAR.width_expanded : SIDEBAR.width_collapsed,
        }}
      >
        <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-lg border-b border-border flex items-center px-4 lg:px-6">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex-1" />
          {profile?.role === "student" && profile?.tier !== "tier_3" && (
            <Button variant="hero" size="sm" asChild className="text-xs md:text-sm">
              <Link to="/dashboard/billing">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Upgrade</span>
              </Link>
            </Button>
          )}
          <button
            className="md:hidden ml-2 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary min-w-[48px] min-h-[48px]"
            onClick={() => setBottomSheetOpen(true)}
          >
            {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || "?"}
          </button>
        </header>

        <main className="p-4 lg:p-6 pb-16 md:pb-4 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}
