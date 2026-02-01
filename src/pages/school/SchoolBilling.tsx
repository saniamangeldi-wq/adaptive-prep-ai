import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Users,
  GraduationCap,
  Sparkles,
  Minus,
  Plus,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tierInfo = [
  {
    tier: 1,
    name: "Basic AI",
    description: "Standard AI quality for everyday learning",
    studentRate: 170,
    teacherRate: 30,
  },
  {
    tier: 2,
    name: "Enhanced AI",
    description: "Better reasoning and explanations",
    studentRate: 200,
    teacherRate: 35,
    popular: true,
  },
  {
    tier: 3,
    name: "Premium AI",
    description: "Best quality with advanced capabilities",
    studentRate: 300,
    teacherRate: 40,
  },
];

interface SchoolData {
  id: string;
  ai_tier: number;
  student_count: number;
  teacher_count: number;
  monthly_cost: number;
}

export default function SchoolBilling() {
  const { profile } = useAuth();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [selectedTier, setSelectedTier] = useState(1);
  const [studentCount, setStudentCount] = useState(25);
  const [teacherCount, setTeacherCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      if (!profile?.user_id) return;

      try {
        const { data: memberData } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", profile.user_id)
          .eq("role", "school_admin")
          .maybeSingle();

        if (memberData?.school_id) {
          const { data: schoolData } = await supabase
            .from("schools")
            .select("id, ai_tier, student_count, teacher_count, monthly_cost")
            .eq("id", memberData.school_id)
            .single();

          if (schoolData) {
            setSchool(schoolData);
            setSelectedTier(schoolData.ai_tier);
            setStudentCount(schoolData.student_count);
            setTeacherCount(schoolData.teacher_count);
          }
        }
      } catch (error) {
        console.error("Error fetching school:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchool();
  }, [profile?.user_id]);

  // Calculate costs
  const currentTierInfo = tierInfo.find(t => t.tier === selectedTier) || tierInfo[0];
  const studentGroups = Math.ceil(studentCount / 25);
  const studentCost = studentGroups * currentTierInfo.studentRate;
  const teacherCost = teacherCount * currentTierInfo.teacherRate;
  const totalCost = studentCost + teacherCost;

  const handleStudentChange = (delta: number) => {
    const newCount = Math.max(25, studentCount + delta);
    setStudentCount(newCount);
  };

  const handleTeacherChange = (delta: number) => {
    const newCount = Math.max(1, teacherCount + delta);
    setTeacherCount(newCount);
  };

  const handleSave = async () => {
    if (!school) {
      toast.error("No school found");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("schools")
        .update({
          ai_tier: selectedTier,
          student_count: studentCount,
          teacher_count: teacherCount,
        })
        .eq("id", school.id);

      if (error) throw error;

      toast.success("Plan updated successfully!");
      // Refresh school data
      const { data: updatedSchool } = await supabase
        .from("schools")
        .select("id, ai_tier, student_count, teacher_count, monthly_cost")
        .eq("id", school.id)
        .single();
      
      if (updatedSchool) {
        setSchool(updatedSchool);
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = school && (
    selectedTier !== school.ai_tier ||
    studentCount !== school.student_count ||
    teacherCount !== school.teacher_count
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Configure your school subscription based on your needs
          </p>
        </div>

        {/* Current Plan Summary */}
        {school && (
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Current Plan</h3>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">AI Tier</p>
                <p className="text-lg font-bold text-foreground">
                  {tierInfo.find(t => t.tier === school.ai_tier)?.name || "Basic"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-lg font-bold text-foreground">{school.student_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teachers</p>
                <p className="text-lg font-bold text-foreground">{school.teacher_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="text-lg font-bold text-primary">${school.monthly_cost}/mo</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Tier Selection */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Select AI Quality Tier</h3>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4">
            {tierInfo.map((tier) => (
              <button
                key={tier.tier}
                onClick={() => setSelectedTier(tier.tier)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  selectedTier === tier.tier
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">{tier.name}</span>
                  {tier.popular && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                      <Sparkles className="w-3 h-3" />
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">
                    <span className="font-medium">${tier.studentRate}</span>
                    <span className="text-muted-foreground"> per 25 students</span>
                  </p>
                  <p className="text-foreground">
                    <span className="font-medium">${tier.teacherRate}</span>
                    <span className="text-muted-foreground"> per teacher</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-6">Configure Seats</h3>
          
          <div className="grid sm:grid-cols-2 gap-8">
            {/* Students */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-primary" />
                <Label className="text-foreground font-medium">Number of Students</Label>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStudentChange(-25)}
                  disabled={studentCount <= 25}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="w-20 text-center">
                  <span className="text-2xl font-bold text-foreground">{studentCount}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStudentChange(25)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {studentGroups} group{studentGroups > 1 ? "s" : ""} of 25 students
              </p>
            </div>

            {/* Teachers */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <Label className="text-foreground font-medium">Number of Teachers</Label>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTeacherChange(-1)}
                  disabled={teacherCount <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="w-20 text-center">
                  <span className="text-2xl font-bold text-foreground">{teacherCount}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTeacherChange(1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Individual teacher accounts
              </p>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
          <h3 className="font-semibold text-foreground mb-4">Monthly Cost Breakdown</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Students ({studentCount}) — {studentGroups} × ${currentTierInfo.studentRate}
              </span>
              <span className="font-medium text-foreground">${studentCost}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Teachers ({teacherCount}) — {teacherCount} × ${currentTierInfo.teacherRate}
              </span>
              <span className="font-medium text-foreground">${teacherCost}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-foreground">Total per Month</span>
              <span className="text-2xl font-bold text-primary">${totalCost}</span>
            </div>
          </div>

          <Button
            variant="hero"
            className="w-full mt-6"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : hasChanges ? "Update Plan" : "No Changes"}
          </Button>
          
          {hasChanges && school && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              Your plan will change from ${school.monthly_cost}/mo to ${totalCost}/mo
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
