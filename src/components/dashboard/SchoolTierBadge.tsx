import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, ArrowUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface SchoolData {
  id: string;
  name: string;
  ai_tier: number;
  student_count: number;
  teacher_count: number;
}

const tierNames: Record<number, string> = {
  1: "Starter",
  2: "Professional", 
  3: "Premium",
  4: "Enterprise"
};

const studentLimits: Record<number, number> = {
  1: 25,
  2: 50,
  3: 100,
  4: 200
};

export function SchoolTierBadge() {
  const { user } = useAuth();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [currentStudents, setCurrentStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchoolData() {
      if (!user?.id) return;

      try {
        // Get school membership
        const { data: membership } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", user.id)
          .eq("role", "school_admin")
          .maybeSingle();

        if (!membership) {
          setLoading(false);
          return;
        }

        // Get school details
        const { data: schoolData } = await supabase
          .from("schools")
          .select("id, name, ai_tier, student_count, teacher_count")
          .eq("id", membership.school_id)
          .single();

        if (schoolData) {
          setSchool(schoolData);

          // Count current students
          const { count } = await supabase
            .from("school_members")
            .select("*", { count: "exact", head: true })
            .eq("school_id", schoolData.id)
            .eq("role", "student");

          setCurrentStudents(count || 0);
        }
      } catch (error) {
        console.error("Error fetching school data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSchoolData();
  }, [user?.id]);

  if (loading || !school) return null;

  const planName = tierNames[school.ai_tier] || "Starter";
  const studentLimit = studentLimits[school.ai_tier] || 25;
  const usagePercent = (currentStudents / studentLimit) * 100;
  const isApproachingLimit = usagePercent >= 80;

  const getBadgeColor = () => {
    switch (school.ai_tier) {
      case 4:
        return "from-accent/20 to-primary/20 border-accent/30";
      case 3:
        return "from-primary/20 to-secondary/20 border-primary/30";
      case 2:
        return "from-primary/20 to-muted/20 border-primary/30";
      default:
        return "from-muted/50 to-muted/30 border-border";
    }
  };

  return (
    <div className="p-3 border-t border-sidebar-border">
      <div className={cn(
        "p-3 rounded-lg bg-gradient-to-r border",
        getBadgeColor()
      )}>
        {/* School name and plan */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground">
                {planName} Plan
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate max-w-[120px]">
                {school.name}
              </p>
            </div>
          </div>
        </div>

        {/* Student usage */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-sidebar-foreground/70 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Students
            </span>
            <span className={cn(
              "text-xs font-medium",
              isApproachingLimit ? "text-warning" : "text-sidebar-foreground"
            )}>
              {currentStudents}/{studentLimit}
            </span>
          </div>
          <Progress 
            value={usagePercent} 
            className={cn("h-1.5", isApproachingLimit && "[&>div]:bg-warning")} 
          />
        </div>

        {/* Upgrade button if approaching limit */}
        {isApproachingLimit && (
          <Link
            to="/dashboard/school/billing"
            className="flex items-center justify-center gap-1 w-full py-2 px-3 rounded-md text-center text-xs font-medium bg-warning hover:bg-warning/90 text-warning-foreground transition-colors"
          >
            <ArrowUp className="w-3 h-3" />
            Upgrade Plan
          </Link>
        )}

        {!isApproachingLimit && (
          <Link
            to="/dashboard/school/billing"
            className="block w-full py-2 px-3 rounded-md text-center text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          >
            Manage Subscription
          </Link>
        )}
      </div>
    </div>
  );
}
