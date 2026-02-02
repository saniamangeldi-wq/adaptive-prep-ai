import { useState } from "react";
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
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { TierBadge } from "./TierBadge";
import { TrialBanner } from "./TrialBanner";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

const studentNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Practice Tests", href: "/dashboard/tests", icon: FileText },
  { name: "AI Coach", href: "/dashboard/coach", icon: MessageSquare },
  { name: "University Match", href: "/dashboard/university-match", icon: GraduationCap },
  { name: "Progress", href: "/dashboard/progress", icon: LineChart },
  { name: "Flashcards", href: "/dashboard/flashcards", icon: Layers },
  { name: "Billing", href: "/dashboard/settings", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const tutorNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Students", href: "/dashboard/students", icon: Users },
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
  { name: "AI Coach", href: "/dashboard/coach", icon: MessageSquare },
  { name: "Assignments", href: "/dashboard/assignments", icon: ClipboardList },
  { name: "Class Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Resources", href: "/dashboard/resources", icon: Layers },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "School Overview", href: "/dashboard/school", icon: Building2 },
  { name: "AI Insights", href: "/dashboard/coach", icon: MessageSquare },
  { name: "Teachers", href: "/dashboard/school/teachers", icon: Users },
  { name: "Students", href: "/dashboard/school/students", icon: GraduationCap },
  { name: "Analytics", href: "/dashboard/school/analytics", icon: BarChart3 },
  { name: "Billing", href: "/dashboard/school/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
        return studentNav;
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

  return (
    <div className="min-h-screen bg-background dark">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">AdaptivePrep</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-primary" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

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

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-lg border-b border-border flex items-center px-4 lg:px-6">
          <button
            className="lg:hidden p-2 -ml-2 text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1" />

          {/* Upgrade button for non-tier-3 students */}
          {profile?.role === "student" && profile?.tier !== "tier_3" && (
            <Button variant="hero" size="sm" asChild>
              <Link to="/dashboard/settings">
                <Sparkles className="w-4 h-4" />
                Upgrade
              </Link>
            </Button>
          )}

        </header>

        {/* Trial Banner */}
        <TrialBanner />

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
