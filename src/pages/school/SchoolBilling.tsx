import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tierInfo = [
  {
    tier: 1,
    name: "School Starter",
    description: "Teacher dashboard, bulk onboarding, analytics, email support",
    includedStudents: 25,
    includedTeachers: 3,
  },
  {
    tier: 2,
    name: "School Pro",
    description: "Adv. analytics, parent portal, dept. mgmt, custom tests, priority support",
    includedStudents: 75,
    includedTeachers: 8,
    popular: true,
  },
  {
    tier: 3,
    name: "Enterprise",
    description: "Full white-label, API/LMS integration, dedicated success manager",
    includedStudents: null,
    includedTeachers: Infinity,
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
  const [loading, setLoading] = useState(true);

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

  const schoolTierInfo = school ? tierInfo.find(t => t.tier === school.ai_tier) : null;

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
          <p className="text-muted-foreground mt-1">Contact us to configure your school subscription</p>
        </div>

        {/* Current Plan Summary */}
        {school && schoolTierInfo && (
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Current Plan</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
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
            </div>
          </div>
        )}

        {/* Plan Options */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Available Plans</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {tierInfo.map((tier) => (
              <div
                key={tier.tier}
                className={cn(
                  "p-4 rounded-xl border-2 text-left",
                  school?.ai_tier === tier.tier
                    ? "border-primary bg-primary/10"
                    : "border-border/50"
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
                <p className="text-foreground font-medium text-sm">Custom Pricing</p>
                {tier.includedStudents && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Includes {tier.includedStudents} students & {Number.isFinite(tier.includedTeachers) ? tier.includedTeachers : "unlimited"} teachers
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 text-center">
          <h3 className="font-semibold text-foreground mb-2">Interested in a plan?</h3>
          <p className="text-muted-foreground mb-4">All school plans are customized to fit your institution's needs. Contact us to get started.</p>
          <Button variant="hero" onClick={() => {}}>
            Contact Us
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
