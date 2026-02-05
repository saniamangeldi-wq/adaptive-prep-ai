import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  MapPin,
  DollarSign,
  GraduationCap,
  Users
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PreferenceQuestionnaireProps {
  onComplete: () => void;
  onBack: () => void;
}

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Switzerland", "Japan", "South Korea",
  "Singapore", "Hong Kong", "New Zealand", "Ireland", "Sweden",
  "Denmark", "Norway", "Finland", "Austria", "Belgium", "Italy", "Spain"
];

const FIELDS_OF_INTEREST = [
  "STEM (Science, Tech, Engineering, Math)",
  "Business & Economics",
  "Arts & Humanities",
  "Social Sciences",
  "Medicine & Health",
  "Law & Public Policy",
  "Education",
  "Environmental Studies"
];

export function PreferenceQuestionnaire({ onComplete, onBack }: PreferenceQuestionnaireProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [preferences, setPreferences] = useState({
    preferred_countries: [] as string[],
    social_life_preference: "",
    climate_preference: "",
    scholarship_need: "",
    budget_monthly: 0,
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
    graduation_year: null as number | null
  });

  // Load existing preferences
  useEffect(() => {
    async function loadPreferences() {
      if (!user) return;

      try {
        const { data, error } = await supabase
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
            budget_monthly: data.budget_monthly || 0,
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
            graduation_year: (data as any).graduation_year || null
          });
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [user]);

  const sections = [
    { title: "Location & Lifestyle", icon: MapPin, color: "text-blue-500" },
    { title: "Financial Considerations", icon: DollarSign, color: "text-green-500" },
    { title: "Academic Preferences", icon: GraduationCap, color: "text-purple-500" },
    { title: "Cultural & Personal", icon: Users, color: "text-orange-500" }
  ];

  const toggleCountry = (country: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_countries: prev.preferred_countries.includes(country)
        ? prev.preferred_countries.filter(c => c !== country)
        : [...prev.preferred_countries, country]
    }));
  };

  const toggleField = (field: string) => {
    setPreferences(prev => ({
      ...prev,
      fields_of_interest: prev.fields_of_interest.includes(field)
        ? prev.fields_of_interest.filter(f => f !== field)
        : [...prev.fields_of_interest, field]
    }));
  };

  const toggleLanguage = (lang: string) => {
    setPreferences(prev => ({
      ...prev,
      language_of_instruction: prev.language_of_instruction.includes(lang)
        ? prev.language_of_instruction.filter(l => l !== lang)
        : [...prev.language_of_instruction, lang]
    }));
  };

  const saveAndContinue = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("university_preferences")
        .upsert({
          student_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "student_id"
        });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your preferences have been saved. Generating matches..."
      });

      onComplete();
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Save failed",
        description: err.message || "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderSection = () => {
    switch (currentSection) {
      case 0: // Location & Lifestyle
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">
                Where would you like to study?
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COUNTRIES.map(country => (
                  <label 
                    key={country}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      preferences.preferred_countries.includes(country)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={preferences.preferred_countries.includes(country)}
                      onCheckedChange={() => toggleCountry(country)}
                    />
                    <span className="text-sm">{country}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                What kind of social life do you want?
              </h4>
              <RadioGroup
                value={preferences.social_life_preference}
                onValueChange={(v) => setPreferences(p => ({ ...p, social_life_preference: v }))}
                className="space-y-2"
              >
                {[
                  "Large campus with vibrant social scene",
                  "Medium-sized with balanced focus",
                  "Small, close-knit community",
                  "Urban campus with city life",
                  "Rural/suburban with nature"
                ].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                What climate do you prefer?
              </h4>
              <RadioGroup
                value={preferences.climate_preference}
                onValueChange={(v) => setPreferences(p => ({ ...p, climate_preference: v }))}
                className="space-y-2"
              >
                {["Warm/tropical", "Moderate/seasonal", "Cold/snowy", "No preference"].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`climate-${option}`} />
                    <Label htmlFor={`climate-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 1: // Financial
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">
                What is your scholarship expectation?
              </h4>
              <RadioGroup
                value={preferences.scholarship_need}
                onValueChange={(v) => setPreferences(p => ({ ...p, scholarship_need: v }))}
                className="space-y-2"
              >
                {[
                  "Full scholarship required (100%)",
                  "Partial scholarship (50-99%)",
                  "Merit-based aid (25-50%)",
                  "Willing to pay full tuition",
                  "Need-based financial aid"
                ].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`scholarship-${option}`} />
                    <Label htmlFor={`scholarship-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                Monthly living budget (USD)
              </h4>
              <RadioGroup
                value={preferences.budget_monthly?.toString() || ""}
                onValueChange={(v) => setPreferences(p => ({ ...p, budget_monthly: parseInt(v) }))}
                className="space-y-2"
              >
                {[
                  { label: "Under $500/month", value: "500" },
                  { label: "$500-$1,000/month", value: "1000" },
                  { label: "$1,000-$2,000/month", value: "2000" },
                  { label: "$2,000+/month", value: "3000" },
                  { label: "Not a concern", value: "10000" }
                ].map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                    <Label htmlFor={`budget-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                Can you work part-time while studying?
              </h4>
              <RadioGroup
                value={preferences.can_work_part_time}
                onValueChange={(v) => setPreferences(p => ({ ...p, can_work_part_time: v }))}
                className="space-y-2"
              >
                {["Yes, I plan to work", "Yes, but only if necessary", "No, focus on studies"].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`work-${option}`} />
                    <Label htmlFor={`work-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                Do you need on-campus housing?
              </h4>
              <RadioGroup
                value={preferences.needs_on_campus_housing}
                onValueChange={(v) => setPreferences(p => ({ ...p, needs_on_campus_housing: v }))}
                className="space-y-2"
              >
                {["Required", "Preferred", "Will live off-campus"].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`housing-${option}`} />
                    <Label htmlFor={`housing-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 2: // Academic
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">
                When do you expect to graduate high school?
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                This helps us find universities that match your timeline. Some universities require 12 years of schooling.
              </p>
              <RadioGroup
                value={preferences.graduation_year?.toString() || ""}
                onValueChange={(v) => setPreferences(p => ({ ...p, graduation_year: parseInt(v) }))}
                className="space-y-2"
              >
                {[
                  { label: "2025", value: "2025" },
                  { label: "2026", value: "2026" },
                  { label: "2027", value: "2027" },
                  { label: "2028", value: "2028" },
                  { label: "Already graduated", value: "2024" }
                ].map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`grad-${option.value}`} />
                    <Label htmlFor={`grad-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                What fields are you interested in?
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FIELDS_OF_INTEREST.map(field => (
                  <label 
                    key={field}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      preferences.fields_of_interest.includes(field)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={preferences.fields_of_interest.includes(field)}
                      onCheckedChange={() => toggleField(field)}
                    />
                    <span className="text-sm">{field}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                What university size do you prefer?
              </h4>
              <RadioGroup
                value={preferences.university_size}
                onValueChange={(v) => setPreferences(p => ({ ...p, university_size: v }))}
                className="space-y-2"
              >
                {[
                  "Small (<5,000 students)",
                  "Medium (5,000-15,000)",
                  "Large (15,000-30,000)",
                  "Very large (30,000+)",
                  "No preference"
                ].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`size-${option}`} />
                    <Label htmlFor={`size-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                What's your preferred teaching style?
              </h4>
              <RadioGroup
                value={preferences.teaching_style}
                onValueChange={(v) => setPreferences(p => ({ ...p, teaching_style: v }))}
                className="space-y-2"
              >
                {[
                  "Lecture-based (large classes)",
                  "Discussion-based (small seminars)",
                  "Hands-on/lab-focused",
                  "Mixed approach"
                ].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`teaching-${option}`} />
                    <Label htmlFor={`teaching-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                Research opportunities importance?
              </h4>
              <RadioGroup
                value={preferences.research_importance}
                onValueChange={(v) => setPreferences(p => ({ ...p, research_importance: v }))}
                className="space-y-2"
              >
                {["Essential", "Nice to have", "Not important"].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`research-${option}`} />
                    <Label htmlFor={`research-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                Ranking importance?
              </h4>
              <RadioGroup
                value={preferences.ranking_importance}
                onValueChange={(v) => setPreferences(p => ({ ...p, ranking_importance: v }))}
                className="space-y-2"
              >
                {[
                  "Only top 50 globally",
                  "Top 100-200 range",
                  "Ranking not important"
                ].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`ranking-${option}`} />
                    <Label htmlFor={`ranking-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 3: // Cultural
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">
                Language of instruction?
              </h4>
              <div className="flex flex-wrap gap-2">
                {["English", "Russian", "Kazakh", "Other languages"].map(lang => (
                  <label 
                    key={lang}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                      preferences.language_of_instruction.includes(lang)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={preferences.language_of_instruction.includes(lang)}
                      onCheckedChange={() => toggleLanguage(lang)}
                    />
                    <span className="text-sm">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                International student support needed?
              </h4>
              <RadioGroup
                value={preferences.international_support}
                onValueChange={(v) => setPreferences(p => ({ ...p, international_support: v }))}
                className="space-y-2"
              >
                {[
                  "Yes, I need visa assistance and orientation",
                  "Somewhat (would be helpful)",
                  "No, I'm familiar with the system"
                ].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`support-${option}`} />
                    <Label htmlFor={`support-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">
                Campus diversity importance?
              </h4>
              <RadioGroup
                value={preferences.diversity_importance}
                onValueChange={(v) => setPreferences(p => ({ ...p, diversity_importance: v }))}
                className="space-y-2"
              >
                {["Very important", "Somewhat important", "Not a priority"].map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`diversity-${option}`} />
                    <Label htmlFor={`diversity-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <button
              key={index}
              onClick={() => setCurrentSection(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                currentSection === index
                  ? "bg-primary/10 border border-primary text-primary"
                  : "bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 ${currentSection === index ? section.color : ""}`} />
              <span className="text-sm font-medium">{section.title}</span>
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <Progress value={((currentSection + 1) / sections.length) * 100} className="h-1" />

      {/* Section Content */}
      <div className="min-h-[400px]">
        {renderSection()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={currentSection === 0 ? onBack : () => setCurrentSection(s => s - 1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentSection === 0 ? "Back to Portfolio" : "Previous"}
        </Button>

        {currentSection < sections.length - 1 ? (
          <Button
            onClick={() => setCurrentSection(s => s + 1)}
            className="gap-2"
          >
            Next Section
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={saveAndContinue}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finding Matches...
              </>
            ) : (
              <>
                Find My Matches
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
