import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
  Target,
} from "lucide-react";

interface University {
  id: string;
  name: string;
  country: string;
  acceptance_rate: number | null;
  avg_sat_score: number | null;
  tuition_usd: number | null;
  living_cost_monthly: number | null;
  ranking_global: number | null;
  programs: string[] | null;
  admission_requirements: any;
  application_deadline: string | null;
  min_grade_requirement: number | null;
}

interface ProfileData {
  gpa: number | null;
  sat_score: number | null;
  budget_monthly: number | null;
  fields_of_interest: string[];
  preferred_countries: string[];
  english_test: string | null;
}

interface ChanceResult {
  university: University;
  score: number;
  label: string;
  color: string;
  strengths: string[];
  gaps: { text: string; question: string }[];
  factors: {
    category: string;
    you: string;
    required: string;
    status: "match" | "close" | "gap" | "missing";
  }[];
}

function calculateChance(uni: University, profile: ProfileData): ChanceResult {
  const factors: ChanceResult["factors"] = [];
  let gpaMatch = 0;
  let testMatch = 0;
  let budgetMatch = 0;
  let majorMatch = 0;
  let countryMatch = 0;

  // GPA
  const reqGpa = uni.min_grade_requirement ? uni.min_grade_requirement / 10 : (uni.acceptance_rate && uni.acceptance_rate < 15 ? 3.8 : 3.5);
  if (profile.gpa) {
    if (profile.gpa >= reqGpa) gpaMatch = 1;
    else if (profile.gpa >= reqGpa - 0.2) gpaMatch = 0.5;
    factors.push({
      category: "GPA",
      you: profile.gpa.toFixed(1),
      required: `${reqGpa.toFixed(1)}+`,
      status: gpaMatch === 1 ? "match" : gpaMatch === 0.5 ? "close" : "gap",
    });
  } else {
    factors.push({ category: "GPA", you: "Not set", required: `${reqGpa.toFixed(1)}+`, status: "missing" });
  }

  // SAT
  const reqSat = uni.avg_sat_score || 1400;
  if (profile.sat_score) {
    if (profile.sat_score >= reqSat) testMatch = 1;
    else if (profile.sat_score >= reqSat - 50) testMatch = 0.5;
    factors.push({
      category: "SAT Score",
      you: profile.sat_score.toString(),
      required: `${reqSat}+`,
      status: testMatch === 1 ? "match" : testMatch === 0.5 ? "close" : "gap",
    });
  } else {
    factors.push({ category: "SAT Score", you: "Not set", required: `${reqSat}+`, status: "missing" });
  }

  // Budget
  const monthlyCost = uni.living_cost_monthly || (uni.tuition_usd ? Math.round(uni.tuition_usd / 12) : 2000);
  if (profile.budget_monthly) {
    if (profile.budget_monthly >= monthlyCost) budgetMatch = 1;
    else if (profile.budget_monthly >= monthlyCost * 0.7) budgetMatch = 0.5;
    factors.push({
      category: "Budget",
      you: `$${profile.budget_monthly.toLocaleString()}/mo`,
      required: `$${monthlyCost.toLocaleString()}/mo`,
      status: budgetMatch === 1 ? "match" : budgetMatch === 0.5 ? "close" : "gap",
    });
  } else {
    factors.push({ category: "Budget", you: "Not set", required: `$${monthlyCost.toLocaleString()}/mo`, status: "missing" });
  }

  // Major
  if (profile.fields_of_interest.length > 0 && uni.programs && uni.programs.length > 0) {
    const hasOverlap = profile.fields_of_interest.some((f) =>
      uni.programs!.some((p) => p.toLowerCase().includes(f.split(" ")[0].toLowerCase()))
    );
    majorMatch = hasOverlap ? 1 : 0.5;
    factors.push({
      category: "Major Fit",
      you: profile.fields_of_interest[0]?.split("(")[0]?.trim() || "Set",
      required: uni.programs.slice(0, 2).join(", "),
      status: hasOverlap ? "match" : "close",
    });
  } else {
    majorMatch = 0.5;
    factors.push({ category: "Major Fit", you: profile.fields_of_interest[0]?.split("(")[0]?.trim() || "Not set", required: "Various", status: profile.fields_of_interest.length > 0 ? "match" : "missing" });
  }

  // Country
  if (profile.preferred_countries.length > 0) {
    const match = profile.preferred_countries.includes(uni.country);
    countryMatch = match ? 1 : 0.3;
    factors.push({
      category: "Country Pref",
      you: match ? "✅ Selected" : "Different",
      required: uni.country,
      status: match ? "match" : "gap",
    });
  } else {
    countryMatch = 0.5;
    factors.push({ category: "Country Pref", you: "Any", required: uni.country, status: "match" });
  }

  // English test
  if (!profile.english_test) {
    factors.push({ category: "English Test", you: "Not set", required: "IELTS 7.0+ / TOEFL 100+", status: "missing" });
  } else {
    factors.push({ category: "English Test", you: profile.english_test, required: "IELTS 7.0+", status: "match" });
  }

  const score = Math.round(
    (gpaMatch * 0.3 + testMatch * 0.25 + budgetMatch * 0.2 + majorMatch * 0.15 + countryMatch * 0.1) * 100
  );

  const strengths = factors.filter((f) => f.status === "match").map((f) => `${f.category}: ${f.you} meets ${f.required}`);
  const gaps = factors
    .filter((f) => f.status === "gap" || f.status === "missing" || f.status === "close")
    .map((f) => ({
      text: f.status === "missing" ? `${f.category} not set in your profile` : `${f.category}: You have ${f.you}, need ${f.required}`,
      question: `How can I improve my ${f.category.toLowerCase()} to get into ${uni.name}?`,
    }));

  const label = score >= 71 ? "Safety School" : score >= 41 ? "Good Chance" : "Reach School";
  const color = score >= 71 ? "hsl(var(--primary))" : score >= 41 ? "hsl(45, 93%, 47%)" : "hsl(0, 84%, 60%)";

  return { university: uni, score, label, color, strengths, gaps, factors };
}

// Gauge component
function ChanceGauge({ score, color, size = 180 }: { score: number; color: string; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.55;
  const startAngle = -210;
  const endAngle = 30;
  const totalArc = endAngle - startAngle;
  const scoreAngle = startAngle + (animatedScore / 100) * totalArc;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number, r: number) => {
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
      {/* Background arc */}
      <path
        d={arcPath(startAngle, endAngle, radius)}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={size * 0.06}
        strokeLinecap="round"
      />
      {/* Score arc */}
      <path
        d={arcPath(startAngle, scoreAngle, radius)}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.06}
        strokeLinecap="round"
        style={{ transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
      {/* Needle dot */}
      <circle
        cx={cx + radius * Math.cos(toRad(scoreAngle))}
        cy={cy + radius * Math.sin(toRad(scoreAngle))}
        r={size * 0.03}
        fill={color}
        style={{ transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
      {/* Score text */}
      <text
        x={cx}
        y={cy - size * 0.02}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize={size * 0.22}
        fontWeight="bold"
      >
        {animatedScore}%
      </text>
    </svg>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "match") return <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />;
  if (status === "close") return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
  if (status === "gap") return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
}

interface MyChancesProps {
  onAskAdvisor?: (prompt: string) => void;
}

export function MyChances({ onAskAdvisor }: MyChancesProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [universities, setUniversities] = useState<University[]>([]);
  const [suggestions, setSuggestions] = useState<University[]>([]);
  const [selected, setSelected] = useState<University[]>([]);
  const [profile, setProfile] = useState<ProfileData>({
    gpa: null,
    sat_score: null,
    budget_monthly: null,
    fields_of_interest: [],
    preferred_countries: [],
    english_test: null,
  });
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load universities + profile
  useEffect(() => {
    async function load() {
      const [uniRes, prefRes, profileRes] = await Promise.all([
        supabase.from("university_database").select("*"),
        user ? supabase.from("university_preferences").select("*").eq("student_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        user ? supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (uniRes.data) setUniversities(uniRes.data as University[]);

      const pref = prefRes.data;
      const prof = profileRes.data;

      setProfile({
        gpa: null, // Not stored in profile yet
        sat_score: null, // Not stored in profile yet
        budget_monthly: pref?.budget_monthly || null,
        fields_of_interest: pref?.fields_of_interest || [],
        preferred_countries: pref?.preferred_countries || [],
        english_test: null,
      });

      setLoading(false);
    }
    load();
  }, [user]);

  // Autocomplete
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    const results = universities
      .filter((u) => u.name.toLowerCase().includes(q) || u.country.toLowerCase().includes(q))
      .filter((u) => !selected.some((s) => s.id === u.id))
      .slice(0, 8);
    setSuggestions(results);
    setShowDropdown(results.length > 0);
  }, [query, universities, selected]);

  const addUniversity = (uni: University) => {
    if (selected.length >= 3) return;
    setSelected((prev) => [...prev, uni]);
    setQuery("");
    setShowDropdown(false);
  };

  const removeUniversity = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id));
  };

  const results = useMemo(
    () => selected.map((uni) => calculateChance(uni, profile)),
    [selected, profile]
  );

  const profileIncomplete = !profile.gpa && !profile.sat_score;

  const bestResult = results.length > 1
    ? results.reduce((best, r) => (r.score > best.score ? r : best), results[0])
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile incomplete banner */}
      {profileIncomplete && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">Complete your profile for accurate predictions</p>
            <p className="text-xs text-muted-foreground">GPA and test scores aren't set yet</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onAskAdvisor?.("How do I set up my academic profile with GPA and SAT scores?")}
          >
            Fill in now →
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search any university worldwide..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          className="pl-10 h-12 text-base bg-muted/30 border-border/40"
        />
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border/50 bg-card shadow-xl max-h-64 overflow-y-auto">
            {suggestions.map((uni) => (
              <button
                key={uni.id}
                onClick={() => addUniversity(uni)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{uni.name}</p>
                  <p className="text-xs text-muted-foreground">{uni.country}{uni.ranking_global ? ` · #${uni.ranking_global} Global` : ""}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((uni) => (
            <span
              key={uni.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm border border-primary/20"
            >
              {uni.name}
              <button onClick={() => removeUniversity(uni.id)} className="hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {selected.length < 3 && (
            <button
              onClick={() => document.querySelector<HTMLInputElement>("input")?.focus()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-border/50 text-muted-foreground text-sm hover:border-primary/40 hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add university
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {selected.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Target className="w-14 h-14 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Check your admission chances</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Search for any university above to instantly see how your profile compares to their requirements.
          </p>
        </div>
      )}

      {/* Results — Compare or Single */}
      {results.length > 0 && (
        <div className={cn("grid gap-4", results.length > 1 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
          {results.map((result) => (
            <div
              key={result.university.id}
              className={cn(
                "rounded-2xl border bg-card p-5 space-y-4 transition-all",
                bestResult && bestResult.university.id === result.university.id && results.length > 1
                  ? "border-primary/40 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.2)]"
                  : "border-border/40"
              )}
            >
              {/* University name */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{result.university.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {result.university.country}
                    {result.university.ranking_global ? ` · #${result.university.ranking_global} Global` : ""}
                  </p>
                </div>
                <button onClick={() => removeUniversity(result.university.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Gauge */}
              <div className="flex flex-col items-center">
                <ChanceGauge
                  score={result.score}
                  color={result.color}
                  size={results.length > 1 ? 140 : 180}
                />
                <span
                  className="text-sm font-bold mt-1"
                  style={{ color: result.color }}
                >
                  {result.label}
                </span>
                <span className="text-xs text-muted-foreground">Based on your current profile</span>
              </div>

              {/* Factor table */}
              <div className="space-y-1.5">
                {result.factors.map((f) => (
                  <div key={f.category} className="flex items-center gap-2 text-xs">
                    <StatusIcon status={f.status} />
                    <span className="w-20 text-muted-foreground flex-shrink-0">{f.category}</span>
                    <span className="flex-1 text-foreground truncate">{f.you}</span>
                    <span className="text-muted-foreground text-right flex-shrink-0">{f.required}</span>
                  </div>
                ))}
              </div>

              {/* Strengths & Gaps (only in single view) */}
              {results.length === 1 && (
                <div className="space-y-4 pt-2">
                  {result.strengths.length > 0 && (
                    <div className="rounded-xl border-l-2 border-primary/60 pl-4 py-2 space-y-1.5">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Your Strengths
                      </h4>
                      {result.strengths.map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                      ))}
                    </div>
                  )}

                  {result.gaps.length > 0 && (
                    <div className="rounded-xl border-l-2 border-yellow-500/60 pl-4 py-2 space-y-1.5">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Gaps to Close
                      </h4>
                      {result.gaps.map((g, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <p className="text-xs text-muted-foreground">• {g.text}</p>
                          <button
                            onClick={() => onAskAdvisor?.(g.question)}
                            className="text-[11px] text-primary hover:underline whitespace-nowrap flex-shrink-0"
                          >
                            How to fix →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="rounded-xl border-l-2 border-blue-500/60 pl-4 py-2 space-y-1.5">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      Application Timeline
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      • Early Decision: November 1
                    </p>
                    <p className="text-xs text-muted-foreground">
                      • Regular Decision: {result.university.application_deadline || "January 1"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      • Scholarship Deadline: December 15
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compare mode gaps (when multiple selected) */}
      {results.length > 1 && bestResult && (
        <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            🏆 Best match: {bestResult.university.name} ({bestResult.score}%)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bestResult.strengths.length > 0 && (
              <div className="rounded-xl border-l-2 border-primary/60 pl-3 py-1.5 space-y-1">
                <p className="text-xs font-medium text-foreground">✅ Strengths</p>
                {bestResult.strengths.slice(0, 3).map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                ))}
              </div>
            )}
            {bestResult.gaps.length > 0 && (
              <div className="rounded-xl border-l-2 border-yellow-500/60 pl-3 py-1.5 space-y-1">
                <p className="text-xs font-medium text-foreground">⚠️ Gaps</p>
                {bestResult.gaps.slice(0, 3).map((g, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">• {g.text}</p>
                    <button
                      onClick={() => onAskAdvisor?.(g.question)}
                      className="text-[11px] text-primary hover:underline whitespace-nowrap"
                    >
                      Fix →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
