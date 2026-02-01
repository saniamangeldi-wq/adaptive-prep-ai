import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  TrendingUp, 
  School,
  UserPlus,
  BarChart3,
  Shield,
  CreditCard,
  Building2,
  GraduationCap,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function AdminDashboard() {
  const { profile } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!profile?.user_id) return;

      // Try to get school info where user is admin
      const { data: memberData } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", profile.user_id)
        .eq("role", "school_admin")
        .maybeSingle();

      if (memberData?.school_id) {
        // Get school name
        const { data: schoolData } = await supabase
          .from("schools")
          .select("name")
          .eq("id", memberData.school_id)
          .single();

        if (schoolData) {
          setSchoolName(schoolData.name);
        }

        // Get admin's personal invite code
        const { data: codeData } = await supabase
          .from("admin_invite_codes")
          .select("invite_code")
          .eq("admin_user_id", profile.user_id)
          .eq("school_id", memberData.school_id)
          .maybeSingle();

        if (codeData) {
          setInviteCode(codeData.invite_code);
        }
      }
    };

    fetchSchoolInfo();
  }, [profile?.user_id]);

  const handleCopyCode = async () => {
    if (!inviteCode) {
      toast.error("No invite code available");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invite code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {schoolName ? `${schoolName} Dashboard` : "School Dashboard"} 🏫
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your school, teachers, and student performance
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/dashboard/school/invite">
            <UserPlus className="w-4 h-4" />
            Invite Members
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={GraduationCap}
          label="Total Students"
          value="0"
          subtext="enrolled"
          color="from-primary to-teal-400"
        />
        <StatCard
          icon={Users}
          label="Teachers"
          value="0"
          subtext="active"
          color="from-purple-500 to-pink-400"
        />
        <StatCard
          icon={TrendingUp}
          label="School Average"
          value="--"
          subtext="SAT score"
          color="from-green-500 to-emerald-400"
        />
        <StatCard
          icon={BarChart3}
          label="Improvement"
          value="--"
          subtext="avg. points"
          color="from-accent to-orange-400"
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction
          icon={Building2}
          title="School Overview"
          description="View school-wide metrics"
          href="/dashboard/school"
          color="from-primary to-teal-400"
        />
        <QuickAction
          icon={Users}
          title="Manage Teachers"
          description="Add and manage teachers"
          href="/dashboard/school/teachers"
          color="from-purple-500 to-pink-400"
        />
        <QuickAction
          icon={GraduationCap}
          title="Student Roster"
          description="View all students"
          href="/dashboard/school/students"
          color="from-blue-500 to-blue-400"
        />
        <QuickAction
          icon={BarChart3}
          title="Analytics"
          description="Performance insights"
          href="/dashboard/school/analytics"
          color="from-green-500 to-emerald-400"
        />
      </div>

      {/* School management */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">School Invite Code</h3>
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Share this code with teachers and students:</p>
            <div className="flex items-center gap-3">
              <code className="text-lg font-mono font-bold text-primary tracking-widest">
                {inviteCode || "--------"}
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyCode}
                disabled={!inviteCode}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {inviteCode 
              ? "Teachers and students can use this code to join your school"
              : "Create a school to get your invite code"}
          </p>
          {!inviteCode && (
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/dashboard/school/create">
                <Building2 className="w-4 h-4" />
                Create School
              </Link>
            </Button>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Subscription</h3>
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Plan</span>
              <span className="font-medium text-foreground">
                {profile?.tier === "tier_3" ? "School Pro" : profile?.tier === "tier_2" ? "School Plus" : "School Starter"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Student Seats</span>
              <span className="font-medium text-foreground">
                0 / {profile?.tier === "tier_3" ? "Unlimited" : profile?.tier === "tier_2" ? "100" : "25"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Teacher Seats</span>
              <span className="font-medium text-foreground">
                0 / {profile?.tier === "tier_3" ? "Unlimited" : profile?.tier === "tier_2" ? "20" : "5"}
              </span>
            </div>
          </div>
          <Button variant="hero" className="w-full mt-4" asChild>
            <Link to="/dashboard/settings">
              <CreditCard className="w-4 h-4" />
              Manage Subscription
            </Link>
          </Button>
        </div>
      </div>

      {/* Performance overview */}
      <div className="p-6 rounded-2xl bg-card border border-border/50">
        <h3 className="font-semibold text-foreground mb-4">Department Performance</h3>
        <div className="text-center py-8 text-muted-foreground">
          <School className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No data yet</p>
          <p className="text-sm mt-1">Invite teachers and students to start tracking performance</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  subtext: string;
  color: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} p-0.5`}>
          <div className="w-full h-full rounded-[6px] bg-card flex items-center justify-center">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/70">{subtext}</span>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link 
      to={href}
      className="group p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
          <Icon className="w-6 h-6 text-foreground" />
        </div>
      </div>
      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
