import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2,
  MapPin,
  DollarSign,
  GraduationCap,
  ArrowLeft,
  Users,
  Building2,
  TreePine,
  Landmark,
  BookOpen,
  MessageCircle,
  Beaker,
  FlaskConical,
  Briefcase,
  Home,
  Check,
} from "lucide-react";
import { WorldMapSelector } from "./WorldMapSelector";
import { IconCardSelector } from "./IconCardSelector";
import { PersonalityTags } from "./PersonalityTags";
import { LiveMatchPreview } from "./LiveMatchPreview";
import { CountryDeepDiveDrawer } from "./CountryDeepDiveDrawer";

interface PreferenceQuestionnaireProps {
  onComplete: () => void;
  onBack: () => void;
}

const FIELDS_OF_INTEREST = [
  "STEM (Science, Tech, Engineering, Math)",
  "Business & Economics",
  "Arts & Humanities",
  "Social Sciences",
  "Medicine & Health",
  "Law & Public Policy",
  "Education",
  "Environmental Studies",
];

const TABS = [
  { id: "location", label: "Location & Lifestyle", icon: MapPin },
  { id: "financial", label: "Financial", icon: DollarSign },
  { id: "academic", label: "Academic", icon: GraduationCap },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PreferenceQuestionnaire({ onComplete, onBack }: PreferenceQuestionnaireProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("location");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);

  const [preferences, setPreferences] = useState({
    preferred_countries: [] as string[],
    social_life_preference: "",
    climate_preference: "",
    scholarship_need: "",
    budget_monthly: 2000,
    can_work_part_time: "",
    needs_on_campus_housing: "",
    fields_of_interest: [] as string[],
    university_size: "",
    teaching_style: "",
    research_importance: "",
    ranking_importance: "",
    language_of_instruction: [] as string[],
    international_support: "",
    diversity_importance: "",
    graduation_year: null as number | null,
  });

  // Climate slider: 0 = cold, 100 = warm
  const [climateValue, setClimateValue] = useState(50);

  useEffect(() => {
    async function loadPreferences() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("university_preferences")
          .select("*")
          .eq("student_id", user.id)
          .maybeSingle();

        if (data) {
          setPreferences({
            preferred_countries: data.preferred_countries || [],
            social_life_preference: data.social_life_preference || "",
            climate_preference: data.climate_preference || "",
            scholarship_need: data.scholarship_need || "",
            budget_monthly: data.budget_monthly || 2000,
            can_work_part_time: data.can_work_part_time || "",
            needs_on_campus_housing: data.needs_on_campus_housing || "",
            fields_of_interest: data.fields_of_interest || [],
            university_size: data.university_size || "",
            teaching_style: data.teaching_style || "",
            research_importance: data.research_importance || "",
            ranking_importance: data.ranking_importance || "",
            language_of_instruction: data.language_of_instruction || [],
            international_support: data.international_support || "",
            diversity_importance: data.diversity_importance || "",
            graduation_year: (data as any).graduation_year || null,
          });
          // Map climate string to slider
          if (data.climate_preference === "Cold/snowy") setClimateValue(10);
          else if (data.climate_preference === "Moderate/seasonal") setClimateValue(50);
          else if (data.climate_preference === "Warm/tropical") setClimateValue(90);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [user]);

  // Map climate slider to string
  useEffect(() => {
    let val = "Moderate/seasonal";
    if (climateValue <= 30) val = "Cold/snowy";
    else if (climateValue >= 70) val = "Warm/tropical";
    setPreferences((p) => ({ ...p, climate_preference: val }));
  }, [climateValue]);

  const toggleCountry = useCallback((country: string) => {
    setPreferences((prev) => ({
      ...prev,
      preferred_countries: prev.preferred_countries.includes(country)
        ? prev.preferred_countries.filter((c) => c !== country)
        : [...prev.preferred_countries, country],
    }));
  }, []);

  const toggleField = useCallback((field: string) => {
    setPreferences((prev) => ({
      ...prev,
      fields_of_interest: prev.fields_of_interest.includes(field)
        ? prev.fields_of_interest.filter((f) => f !== field)
        : [...prev.fields_of_interest, field],
    }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setPersonalityTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  }, []);

  // Completion counts per tab
  const tabCompletion = useMemo(() => {
    const loc = [
      preferences.preferred_countries.length > 0,
      !!preferences.social_life_preference,
      !!preferences.climate_preference,
    ];
    const fin = [
      !!preferences.scholarship_need,
      preferences.budget_monthly > 0,
      !!preferences.can_work_part_time,
      !!preferences.needs_on_campus_housing,
    ];
    const acad = [
      preferences.fields_of_interest.length > 0,
      !!preferences.university_size,
      !!preferences.teaching_style,
      !!preferences.research_importance,
      !!preferences.ranking_importance,
    ];
    return {
      location: { filled: loc.filter(Boolean).length, total: loc.length },
      financial: { filled: fin.filter(Boolean).length, total: fin.length },
      academic: { filled: acad.filter(Boolean).length, total: acad.length },
    };
  }, [preferences]);

  // Simulated match count based on filled preferences
  const simulatedMatchCount = useMemo(() => {
    let base = 22;
    if (preferences.preferred_countries.length > 0)
      base = Math.max(5, base - preferences.preferred_countries.length * 2 + 8);
    if (preferences.budget_monthly < 1500) base = Math.max(3, base - 5);
    if (preferences.ranking_importance === "Only top 50 globally") base = Math.max(2, base - 8);
    if (preferences.fields_of_interest.length > 0) base += preferences.fields_of_interest.length;
    return Math.min(base, 40);
  }, [preferences]);

  const simulatedTopMatches = useMemo(() => {
    const unis = [
      { name: "MIT", flag: "🇺🇸", score: 95 },
      { name: "University of Cambridge", flag: "🇬🇧", score: 92 },
      { name: "ETH Zurich", flag: "🇨🇭", score: 88 },
    ];
    return unis.slice(0, Math.min(3, simulatedMatchCount));
  }, [simulatedMatchCount]);

  const saveAndContinue = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("university_preferences").upsert(
        {
          student_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );
      if (error) throw error;
      toast({ title: "Preferences saved ✅", description: "Generating your matches..." });
      onComplete();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 w-full h-full overflow-hidden">
      {/* Left: Preference Builder */}
      <div className="flex-1 min-w-0 lg:pr-8 lg:border-r border-border/30 overflow-y-auto overflow-x-hidden pb-24">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </button>

        {/* Tab Bar */}
        <div className="relative flex gap-1 mb-8 border-b border-border/30">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const comp = tabCompletion[tab.id];
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Completion badge */}
                <span
                  className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                    comp.filled === comp.total
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {comp.filled === comp.total ? "✅" : `${comp.filled}/${comp.total}`}
                </span>
                {/* Active underline */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-8 animate-fade-in" key={activeTab}>
          {activeTab === "location" && (
            <>
              {/* World Map */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Where would you like to study?
                </h4>
                <WorldMapSelector
                  selected={preferences.preferred_countries}
                  onToggle={toggleCountry}
                />
              </div>

              {/* Climate Vibe Slider */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Climate preference</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>🥶 Cold</span>
                    <span className="text-muted-foreground text-xs">
                      {climateValue <= 30
                        ? "Cold & Snowy"
                        : climateValue >= 70
                        ? "Warm & Tropical"
                        : "Moderate & Seasonal"}
                    </span>
                    <span>🌞 Warm</span>
                  </div>
                  <Slider
                    value={[climateValue]}
                    onValueChange={(v) => setClimateValue(v[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Social Life — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  What kind of social life?
                </h4>
                <IconCardSelector
                  value={preferences.social_life_preference}
                  onChange={(v) =>
                    setPreferences((p) => ({ ...p, social_life_preference: v }))
                  }
                  options={[
                    {
                      value: "Large campus with vibrant social scene",
                      label: "Vibrant",
                      description: "Large campus, social events",
                      icon: Users,
                    },
                    {
                      value: "Medium-sized with balanced focus",
                      label: "Balanced",
                      description: "Medium-sized, study & social",
                      icon: Building2,
                    },
                    {
                      value: "Small, close-knit community",
                      label: "Intimate",
                      description: "Small, close community",
                      icon: Home,
                    },
                    {
                      value: "Urban campus with city life",
                      label: "Urban",
                      description: "City life & nightlife",
                      icon: Landmark,
                    },
                  ]}
                />
              </div>

              {/* Personality Tags */}
              <PersonalityTags
                selected={personalityTags}
                onToggle={toggleTag}
              />
            </>
          )}

          {activeTab === "financial" && (
            <>
              {/* Budget Slider */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">
                  Monthly living budget (USD)
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">$500</span>
                    <span className="text-lg font-bold text-primary">
                      ${preferences.budget_monthly.toLocaleString()}/mo
                    </span>
                    <span className="text-muted-foreground">$5,000+</span>
                  </div>
                  <Slider
                    value={[preferences.budget_monthly]}
                    onValueChange={(v) =>
                      setPreferences((p) => ({ ...p, budget_monthly: v[0] }))
                    }
                    min={500}
                    max={5000}
                    step={100}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Scholarship — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Scholarship expectation
                </h4>
                <IconCardSelector
                  value={preferences.scholarship_need}
                  onChange={(v) => setPreferences((p) => ({ ...p, scholarship_need: v }))}
                  options={[
                    {
                      value: "Full scholarship required (100%)",
                      label: "Full Ride",
                      description: "100% scholarship needed",
                      icon: DollarSign,
                    },
                    {
                      value: "Partial scholarship (50-99%)",
                      label: "Partial",
                      description: "50-99% scholarship",
                      icon: DollarSign,
                    },
                    {
                      value: "Merit-based aid (25-50%)",
                      label: "Merit Aid",
                      description: "25-50% aid",
                      icon: GraduationCap,
                    },
                    {
                      value: "Willing to pay full tuition",
                      label: "Full Pay",
                      description: "No aid needed",
                      icon: Briefcase,
                    },
                  ]}
                />
              </div>

              {/* Part-time Work — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Can you work part-time?
                </h4>
                <IconCardSelector
                  value={preferences.can_work_part_time}
                  onChange={(v) => setPreferences((p) => ({ ...p, can_work_part_time: v }))}
                  columns={3}
                  options={[
                    {
                      value: "Yes, I plan to work",
                      label: "Yes",
                      description: "Plan to work",
                      icon: Briefcase,
                    },
                    {
                      value: "Yes, but only if necessary",
                      label: "If Needed",
                      description: "Only if necessary",
                      icon: Users,
                    },
                    {
                      value: "No, focus on studies",
                      label: "No",
                      description: "Focus on studies",
                      icon: BookOpen,
                    },
                  ]}
                />
              </div>

              {/* Housing — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  On-campus housing?
                </h4>
                <IconCardSelector
                  value={preferences.needs_on_campus_housing}
                  onChange={(v) =>
                    setPreferences((p) => ({ ...p, needs_on_campus_housing: v }))
                  }
                  columns={3}
                  options={[
                    {
                      value: "Required",
                      label: "Required",
                      description: "Must live on campus",
                      icon: Home,
                    },
                    {
                      value: "Preferred",
                      label: "Preferred",
                      description: "Would like it",
                      icon: Building2,
                    },
                    {
                      value: "Will live off-campus",
                      label: "Off-campus",
                      description: "Own accommodation",
                      icon: TreePine,
                    },
                  ]}
                />
              </div>
            </>
          )}

          {activeTab === "academic" && (
            <>
              {/* Fields of Interest */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Fields of interest
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FIELDS_OF_INTEREST.map((field) => {
                    const isSelected = preferences.fields_of_interest.includes(field);
                    return (
                      <button
                        key={field}
                        onClick={() => toggleField(field)}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-xl border text-sm text-left transition-all duration-200",
                          isSelected
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-border/60 bg-transparent"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span>{field}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* University Size — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">University size</h4>
                <IconCardSelector
                  value={preferences.university_size}
                  onChange={(v) => setPreferences((p) => ({ ...p, university_size: v }))}
                  options={[
                    {
                      value: "Small (<5,000 students)",
                      label: "Small",
                      description: "Under 5,000 students",
                      icon: Users,
                    },
                    {
                      value: "Medium (5,000-15,000)",
                      label: "Medium",
                      description: "5K–15K students",
                      icon: Building2,
                    },
                    {
                      value: "Large (15,000-30,000)",
                      label: "Large",
                      description: "15K–30K students",
                      icon: Landmark,
                    },
                    {
                      value: "Very large (30,000+)",
                      label: "Huge",
                      description: "30K+ students",
                      icon: GraduationCap,
                    },
                  ]}
                />
              </div>

              {/* Teaching Style — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Teaching style</h4>
                <IconCardSelector
                  value={preferences.teaching_style}
                  onChange={(v) => setPreferences((p) => ({ ...p, teaching_style: v }))}
                  options={[
                    {
                      value: "Lecture-based (large classes)",
                      label: "Lectures",
                      description: "Large classes",
                      icon: BookOpen,
                    },
                    {
                      value: "Discussion-based (small seminars)",
                      label: "Seminars",
                      description: "Small discussions",
                      icon: MessageCircle,
                    },
                    {
                      value: "Hands-on/lab-focused",
                      label: "Hands-on",
                      description: "Lab & project work",
                      icon: FlaskConical,
                    },
                    {
                      value: "Mixed approach",
                      label: "Mixed",
                      description: "All of the above",
                      icon: Beaker,
                    },
                  ]}
                />
              </div>

              {/* Research — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Research opportunities
                </h4>
                <IconCardSelector
                  value={preferences.research_importance}
                  onChange={(v) =>
                    setPreferences((p) => ({ ...p, research_importance: v }))
                  }
                  columns={3}
                  options={[
                    {
                      value: "Essential",
                      label: "Essential",
                      description: "Core priority",
                      icon: Beaker,
                    },
                    {
                      value: "Nice to have",
                      label: "Nice to have",
                      description: "Would be a plus",
                      icon: FlaskConical,
                    },
                    {
                      value: "Not important",
                      label: "Not needed",
                      description: "Not a factor",
                      icon: BookOpen,
                    },
                  ]}
                />
              </div>

              {/* Ranking — Icon Cards */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Ranking importance
                </h4>
                <IconCardSelector
                  value={preferences.ranking_importance}
                  onChange={(v) =>
                    setPreferences((p) => ({ ...p, ranking_importance: v }))
                  }
                  columns={3}
                  options={[
                    {
                      value: "Only top 50 globally",
                      label: "Top 50",
                      description: "Elite only",
                      icon: GraduationCap,
                    },
                    {
                      value: "Top 100-200 range",
                      label: "Top 200",
                      description: "Well-ranked",
                      icon: Landmark,
                    },
                    {
                      value: "Ranking not important",
                      label: "Any",
                      description: "Doesn't matter",
                      icon: Users,
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Live Match Preview (sticky) */}
      <div className="hidden lg:block w-[320px] flex-shrink-0 pl-8">
        <div className="sticky top-4 p-4">
          <LiveMatchPreview
            matchCount={simulatedMatchCount}
            topMatches={simulatedTopMatches}
            onSeeAll={saveAndContinue}
            loading={saving}
          />
        </div>
      </div>

      {/* Mobile CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border/30 z-30">
        <Button onClick={saveAndContinue} disabled={saving} className="w-full gap-2" size="lg">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              See {simulatedMatchCount} Matches →
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
