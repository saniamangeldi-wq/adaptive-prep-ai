import { useState, useEffect, lazy, Suspense } from "react";
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
  UserPlus,
  BookOpen,
  Trophy,
  Download,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { TierBadge } from "./TierBadge";
import { TrialBanner } from "./TrialBanner";
import { RoleSwitcher } from "./RoleSwitcher";
import { useSchoolStudent } from "@/hooks/useSchoolStudent";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
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

  // Get navigation based on role
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
        return studentNav.filter(item => !item.schoolOnly || isSchoolStudent);
    }
  };

  const navigation = getNavigation();

  const getRoleLabel = () => {
    switch (profile?.role) {
      case "tutor":
        return "Tutor";
      case "teacher":
        return "Teacher";
      case "school_admin":
        return "School Admin";
      case "student":
      default:
        return profile?.tier?.replace("_", " ").toUpperCase() || "Tier 1";
    }
  };

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[48px] md:min-h-0",
              isActive 
                ? "bg-sidebar-accent text-sidebar-primary" 
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            onClick={onClick}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background dark">
      {/* Mobile sidebar backdrop (for hamburger menu on tablet portrait) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop & Tablet Landscape Sidebar (hidden on mobile & tablet portrait) */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full bg-sidebar border-r border-sidebar-border transform transition-transform duration-300",
        // Desktop: always visible, 256px
        "xl:translate-x-0 xl:w-64",
        // Tablet landscape (1024-1199): narrow sidebar 220px, always visible
        "lg:translate-x-0 lg:w-[220px]",
        // Below lg: slide-in overlay
        sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
        // Hide completely on mobile (< 768px) — use bottom sheet instead
        "hidden md:block"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground lg:text-base xl:text-lg">AdaptivePrep</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <RoleSwitcher />
            <div className="pt-2 border-t border-sidebar-border/50 mt-2" />
            <NavItems onClick={() => setSidebarOpen(false)} />
          </nav>

          {/* Install App */}
          {showInstallButton && (
            <div className="px-3 pb-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Install App
              </button>
            </div>
          )}

          {/* Tier Badge */}
          <TierBadge />

          {/* User profile */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-medium text-primary-foreground">
                {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {getRoleLabel()}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Sheet (< 768px only) */}
      <div className="md:hidden">
        {/* Bottom sheet backdrop */}
        {bottomSheetOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setBottomSheetOpen(false)}
          />
        )}

        {/* Bottom sheet */}
        <div className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border rounded-t-2xl transition-transform duration-300 ease-out",
          bottomSheetOpen 
            ? "translate-y-0" 
            : "translate-y-[calc(100%-3.5rem)]"
        )} style={{ maxHeight: "80dvh" }}>
          {/* Handle */}
          <button 
            onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 min-h-[56px]"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-sidebar-foreground">Sessions</span>
            <div className="w-8 h-1 bg-sidebar-foreground/30 rounded-full ml-2" />
          </button>

          {/* Sheet content — lazy rendered */}
          {bottomSheetOpen && (
            <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ maxHeight: "calc(80dvh - 3.5rem)" }}>
              <nav className="space-y-1 pb-4">
                <RoleSwitcher />
                <div className="pt-2 border-t border-sidebar-border/50 mt-2" />
                <NavItems onClick={() => setBottomSheetOpen(false)} />
              </nav>

              {/* User info */}
              <div className="border-t border-sidebar-border pt-3 pb-2">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-medium text-primary-foreground">
                    {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">
                      {getRoleLabel()}
                    </p>
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

      {/* Main content */}
      <div className="xl:pl-64 lg:pl-[220px] md:pl-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 md:h-16 bg-background/80 backdrop-blur-lg border-b border-border flex items-center px-4 lg:px-6">
          {/* Mobile: Logo only on left */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          {/* Tablet portrait: hamburger menu */}
          <button
            className="hidden md:block lg:hidden p-2 -ml-2 text-foreground min-w-[48px] min-h-[48px] flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1" />

          {/* Upgrade button for non-tier-3 students */}
          {profile?.role === "student" && profile?.tier !== "tier_3" && (
            <Button variant="hero" size="sm" asChild className="text-xs md:text-sm">
              <Link to="/dashboard/billing">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Upgrade</span>
              </Link>
            </Button>
          )}

          {/* Mobile: Avatar/profile on right */}
          <button
            className="md:hidden ml-2 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-medium text-primary-foreground min-w-[48px] min-h-[48px]"
            onClick={() => setBottomSheetOpen(true)}
          >
            {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || "?"}
          </button>
        </header>

        {/* Trial Banner */}
        <TrialBanner />

        {/* Page content — add bottom padding on mobile for bottom sheet handle */}
        <main className="p-4 lg:p-6 pb-16 md:pb-4 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}