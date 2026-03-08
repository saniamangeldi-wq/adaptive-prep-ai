import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, GraduationCap, DollarSign, MapPin, Target, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileData {
  gpa?: string;
  testScore?: string;
  intendedMajor?: string;
  budgetRange?: string;
  preferredCountries?: string[];
  competitivenessScore: number;
}

interface MatchProfileCardProps {
  onEditProfile: () => void;
}

export function MatchProfileCard({ onEditProfile }: MatchProfileCardProps) {
  const { user, profile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    competitivenessScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const [portfolioRes, prefsRes] = await Promise.all([
          supabase
            .from("student_portfolios")
            .select("extracted_data")
            .eq("student_id", user.id)
            .maybeSingle(),
          supabase
            .from("university_preferences")
            .select("*")
            .eq("student_id", user.id)
            .maybeSingle(),
        ]);

        const extracted = portfolioRes.data?.extracted_data as any;
        const prefs = prefsRes.data;

        let score = 40; // base
        if (extracted?.gpa) score += 15;
        if (extracted?.sat_score || extracted?.act_score) score += 15;
        if (prefs?.fields_of_interest?.length) score += 10;
        if (prefs?.preferred_countries?.length) score += 10;
        if (profile?.study_subjects) score += 5;
        if (profile?.primary_goal) score += 5;

        const budgetMap: Record<string, string> = {
          "500": "< $500/mo",
          "1000": "$500–$1K/mo",
          "2000": "$1K–$2K/mo",
          "3000": "$2K+/mo",
          "10000": "Flexible",
        };

        setProfileData({
          gpa: extracted?.gpa || "Not set",
          testScore: extracted?.sat_score
            ? `SAT ${extracted.sat_score}`
            : extracted?.act_score
            ? `ACT ${extracted.act_score}`
            : "Not set",
          intendedMajor:
            prefs?.fields_of_interest?.[0]?.replace(/\s*\(.*?\)/, "") || "Not set",
          budgetRange: prefs?.budget_monthly
            ? budgetMap[prefs.budget_monthly.toString()] || `$${prefs.budget_monthly}/mo`
            : "Not set",
          preferredCountries: prefs?.preferred_countries || [],
          competitivenessScore: Math.min(100, score),
        });
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, profile]);

  const scoreColor =
    profileData.competitivenessScore >= 75
      ? "text-green-400"
      : profileData.competitivenessScore >= 50
      ? "text-yellow-400"
      : "text-orange-400";

  const scoreRingColor =
    profileData.competitivenessScore >= 75
      ? "stroke-green-400"
      : profileData.competitivenessScore >= 50
      ? "stroke-yellow-400"
      : "stroke-orange-400";

  const circumference = 2 * Math.PI * 42;
  const dashOffset =
    circumference - (profileData.competitivenessScore / 100) * circumference;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-2/3 mb-4" />
        <div className="h-24 bg-muted rounded-full w-24 mx-auto mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  const stats = [
    { icon: BookOpen, label: "GPA", value: profileData.gpa },
    { icon: Target, label: "Test Score", value: profileData.testScore },
    { icon: GraduationCap, label: "Major", value: profileData.intendedMajor },
    { icon: DollarSign, label: "Budget", value: profileData.budgetRange },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Match Profile
        </h3>
      </div>

      {/* Competitiveness Ring */}
      <div className="flex flex-col items-center py-6 px-5">
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              className="stroke-muted"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              className={cn("transition-all duration-1000 ease-out", scoreRingColor)}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-bold", scoreColor)}>
              {profileData.competitivenessScore}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Score
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Overall Competitiveness</p>
      </div>

      {/* Stats */}
      <div className="px-5 pb-4 space-y-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {s.label}
              </p>
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  s.value === "Not set"
                    ? "text-muted-foreground/50 italic"
                    : "text-foreground"
                )}
              >
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Countries */}
      {profileData.preferredCountries &&
        profileData.preferredCountries.length > 0 && (
          <div className="px-5 pb-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Preferred Countries
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profileData.preferredCountries.slice(0, 4).map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5"
                >
                  {c}
                </Badge>
              ))}
              {profileData.preferredCountries.length > 4 && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                  +{profileData.preferredCountries.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

      {/* Edit Button */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onEditProfile}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Profile
        </Button>
      </div>
    </div>
  );
}
