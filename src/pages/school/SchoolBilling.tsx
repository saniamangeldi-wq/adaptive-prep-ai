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
    name: "School Starter",
    description: "Teacher dashboard, bulk onboarding, analytics, email support",
    basePriceUSD: 149,
    basePriceKZT: 74500,
    includedStudents: 25,
    includedTeachers: 3,
    extraStudentBlockUSD: 99,
    extraStudentBlockKZT: 49500,
    extraTeacherUSD: 25,
    extraTeacherKZT: 12500,
  },
  {
    tier: 2,
    name: "School Pro",
    description: "Adv. analytics, parent portal, dept. mgmt, custom tests, priority support",
    basePriceUSD: 349,
    basePriceKZT: 174500,
    includedStudents: 75,
    includedTeachers: 8,
    extraStudentBlockUSD: 99,
    extraStudentBlockKZT: 49500,
    extraTeacherUSD: 25,
    extraTeacherKZT: 12500,
    popular: true,
  },
  {
    tier: 3,
    name: "Enterprise",
    description: "Full white-label, API/LMS integration, dedicated success manager",
    basePriceUSD: null,
    basePriceKZT: null,
    includedStudents: null,
    includedTeachers: Infinity,
    extraStudentBlockUSD: 0,
    extraStudentBlockKZT: 0,
    extraTeacherUSD: 0,
    extraTeacherKZT: 0,
  },
];

function fmtDual(usd: number): string {
  const kzt = usd * 500;
  return `$${usd.toLocaleString("en-US")} / ₸${kzt.toLocaleString("ru-RU")}`;
}

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
  const [teacherCount, setTeacherCount] = useState(3);
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

  const currentTierInfo = tierInfo.find(t => t.tier === selectedTier) || tierInfo[0];
  const isEnterprise = selectedTier === 3;

  // Calculate costs
  const baseUSD = currentTierInfo.basePriceUSD ?? 0;
  const includedStudents = currentTierInfo.includedStudents ?? 0;
  const includedTeachers = currentTierInfo.includedTeachers;

  const extraStudents = Math.max(0, studentCount - includedStudents);
  const extraStudentBlocks = Math.ceil(extraStudents / 25);
  const extraStudentCostUSD = extraStudentBlocks * currentTierInfo.extraStudentBlockUSD;

  const extraTeachers = Math.max(0, teacherCount - (Number.isFinite(includedTeachers) ? includedTeachers : teacherCount));
  const extraTeacherCostUSD = extraTeachers * currentTierInfo.extraTeacherUSD;

  const totalCostUSD = baseUSD + extraStudentCostUSD + extraTeacherCostUSD;
  const totalCostKZT = totalCostUSD * 500;

  const handleStudentChange = (delta: number) => {
    const min = includedStudents || 25;
    setStudentCount(Math.max(min, studentCount + delta));
  };

  const handleTeacherChange = (delta: number) => {
    const min = Number.isFinite(includedTeachers) ? includedTeachers : 1;
    setTeacherCount(Math.max(min as number, teacherCount + delta));
  };

  const handleSave = async () => {
    if (!school) { toast.error("No school found"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("schools")
        .update({ ai_tier: selectedTier, student_count: studentCount, teacher_count: teacherCount })
        .eq("id", school.id);
      if (error) throw error;
      toast.success("Plan updated successfully!");
      const { data: updatedSchool } = await supabase
        .from("schools")
        .select("id, ai_tier, student_count, teacher_count, monthly_cost")
        .eq("id", school.id)
        .single();
      if (updatedSchool) setSchool(updatedSchool);
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

  // For current plan display
  const schoolTierInfo = school ? tierInfo.find(t => t.tier === school.ai_tier) : null;
  const currentBaseUSD = schoolTierInfo?.basePriceUSD;

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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">Configure your school subscription based on your needs</p>
        </div>

        {/* Current Plan Summary */}
        {school && schoolTierInfo && (
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Current Plan</h3>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-bold text-foreground">{schoolTierInfo.name}</p>
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
                <p className="text-sm text-muted-foreground">Base Price</p>
                <p className="text-lg font-bold text-primary">
                  {currentBaseUSD != null ? fmtDual(currentBaseUSD) + "/mo" : "Custom"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Tier Selection */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Select Plan</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {tierInfo.map((tier) => (
              <button
                key={tier.tier}
                onClick={() => {
                  setSelectedTier(tier.tier);
                  if (tier.includedStudents) setStudentCount(Math.max(studentCount, tier.includedStudents));
                  if (Number.isFinite(tier.includedTeachers)) setTeacherCount(Math.max(teacherCount, tier.includedTeachers as number));
                }}
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
                      <Sparkles className="w-3 h-3" /> Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>
                <div className="space-y-1 text-sm">
                  {tier.basePriceUSD != null ? (
                    <>
                      <p className="text-foreground font-medium">
                        ${tier.basePriceUSD}/mo <span className="text-muted-foreground font-normal">/ ₸{tier.basePriceKZT!.toLocaleString("ru-RU")}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Includes {tier.includedStudents} students & {tier.includedTeachers} teachers
                      </p>
                      <p className="text-muted-foreground">
                        +${tier.extraStudentBlockUSD}/25 students · +${tier.extraTeacherUSD}/teacher
                      </p>
                    </>
                  ) : (
                    <p className="text-foreground font-medium">Custom Pricing</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Selection (hide for Enterprise) */}
        {!isEnterprise && (
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
                  <Button variant="secondary" size="icon" onClick={() => handleStudentChange(-25)} disabled={studentCount <= includedStudents} className="bg-muted hover:bg-muted/80 border border-border">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="w-20 text-center">
                    <span className="text-2xl font-bold text-foreground">{studentCount}</span>
                  </div>
                  <Button variant="secondary" size="icon" onClick={() => handleStudentChange(25)} className="bg-muted hover:bg-muted/80 border border-border">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {includedStudents} included free · {extraStudents > 0 ? `${extraStudentBlocks} extra block${extraStudentBlocks > 1 ? "s" : ""} of 25` : "no extras"}
                </p>
              </div>

              {/* Teachers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-primary" />
                  <Label className="text-foreground font-medium">Number of Teachers</Label>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="secondary" size="icon" onClick={() => handleTeacherChange(-1)} disabled={teacherCount <= (includedTeachers as number)} className="bg-muted hover:bg-muted/80 border border-border">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="w-20 text-center">
                    <span className="text-2xl font-bold text-foreground">{teacherCount}</span>
                  </div>
                  <Button variant="secondary" size="icon" onClick={() => handleTeacherChange(1)} className="bg-muted hover:bg-muted/80 border border-border">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {includedTeachers} included free · {extraTeachers > 0 ? `${extraTeachers} extra` : "no extras"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
          <h3 className="font-semibold text-foreground mb-4">Monthly Cost Breakdown</h3>
          {isEnterprise ? (
            <p className="text-muted-foreground">Contact us for custom Enterprise pricing.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{currentTierInfo.name} base plan</span>
                <span className="font-medium text-foreground">{fmtDual(baseUSD)}</span>
              </div>
              {extraStudentCostUSD > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Extra students (+{extraStudents}) — {extraStudentBlocks} × ${currentTierInfo.extraStudentBlockUSD}
                  </span>
                  <span className="font-medium text-foreground">{fmtDual(extraStudentCostUSD)}</span>
                </div>
              )}
              {extraTeacherCostUSD > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Extra teachers (+{extraTeachers}) — {extraTeachers} × ${currentTierInfo.extraTeacherUSD}
                  </span>
                  <span className="font-medium text-foreground">{fmtDual(extraTeacherCostUSD)}</span>
                </div>
              )}
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total per Month</span>
                <span className="text-2xl font-bold text-primary">{fmtDual(totalCostUSD)}/mo</span>
              </div>
            </div>
          )}

          <Button
            variant={hasChanges ? "hero" : "secondary"}
            className={cn("w-full mt-6", !hasChanges && "bg-muted text-muted-foreground border border-border")}
            onClick={isEnterprise ? () => toast.info("Contact sales for Enterprise pricing") : handleSave}
            disabled={!isEnterprise && (!hasChanges || saving)}
          >
            {isEnterprise ? "Contact Sales" : saving ? "Saving..." : hasChanges ? "Update Plan" : "No Changes"}
          </Button>

          {hasChanges && school && !isEnterprise && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              Your plan will change to {fmtDual(totalCostUSD)}/mo
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
