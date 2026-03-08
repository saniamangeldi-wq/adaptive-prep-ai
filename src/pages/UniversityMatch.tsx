import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSchoolStudent } from "@/hooks/useSchoolStudent";
import { LockedFeatureModal } from "@/components/university-match/LockedFeatureModal";
import { MatchProfileCard } from "@/components/university-match/MatchProfileCard";
import { UniversityCard } from "@/components/university-match/UniversityCard";
import { MatchFilterBar, type MatchFilters, type SortOption } from "@/components/university-match/MatchFilterBar";
import { AIAdvisorDrawer } from "@/components/university-match/AIAdvisorDrawer";
import { ShortlistPanel } from "@/components/university-match/ShortlistPanel";
import { PortfolioUpload } from "@/components/university-match/PortfolioUpload";
import { PreferenceQuestionnaire } from "@/components/university-match/PreferenceQuestionnaire";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  Download,
  GraduationCap,
  Sparkles,
} from "lucide-react";
// Dialog removed - preferences now full-page

interface UniversityMatch {
  id: string;
  university: {
    id: string;
    name: string;
    country: string;
    logo_url: string | null;
    acceptance_rate: number | null;
    avg_sat_score: number | null;
    tuition_usd: number | null;
    living_cost_monthly: number | null;
    student_population: number | null;
    programs: string[];
    location_type: string | null;
    website: string | null;
    ranking_global: number | null;
  };
  match_score: number;
  match_reason: string | null;
  financial_estimate: any;
  saved: boolean;
}

export default function UniversityMatch() {
  const { isSchoolStudent, loading: schoolLoading, hasUniversityMatchAccess } = useSchoolStudent();
  const { user } = useAuth();
  const { toast } = useToast();

  const [showLockedModal, setShowLockedModal] = useState(false);
  const [matches, setMatches] = useState<UniversityMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters & sort
  const [filters, setFilters] = useState<MatchFilters>({
    country: null,
    tuitionMax: null,
    acceptanceMin: null,
    programType: null,
  });
  const [sortBy, setSortBy] = useState<SortOption>("match");

  // AI Advisor drawer
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);

  // Edit profile dialog
  const [editingProfile, setEditingProfile] = useState(false);
  const [editStep, setEditStep] = useState<"portfolio" | "preferences">("portfolio");

  // Silent first-use profile check
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (!schoolLoading && !hasUniversityMatchAccess) {
      setShowLockedModal(true);
      setLoading(false);
    }
  }, [hasUniversityMatchAccess, schoolLoading]);

  useEffect(() => {
    if (hasUniversityMatchAccess && user) {
      checkAndLoad();
    }
  }, [hasUniversityMatchAccess, user]);

  async function checkAndLoad() {
    try {
      // Check if user has preferences
      const { data: prefs } = await supabase
        .from("university_preferences")
        .select("id")
        .eq("student_id", user!.id)
        .maybeSingle();

      if (!prefs) {
        setNeedsSetup(true);
        setEditingProfile(true);
        setEditStep("portfolio");
        setLoading(false);
        return;
      }

      await loadMatches();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function loadMatches() {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("student_university_matches")
        .select(`
          id, match_score, match_reason, financial_estimate, saved,
          university:university_database (
            id, name, country, logo_url, acceptance_rate, avg_sat_score,
            tuition_usd, living_cost_monthly, student_population, programs,
            location_type, website, ranking_global
          )
        `)
        .eq("student_id", user.id)
        .order("match_score", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setMatches(
          data.map((m) => ({
            ...m,
            university: m.university as any,
            financial_estimate: m.financial_estimate as any,
          }))
        );
      } else {
        await generateMatches();
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load matches", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function generateMatches() {
    if (!user) return;
    setGenerating(true);
    try {
      await supabase.functions.invoke("university-matcher", {
        body: { student_id: user.id },
      });
      await loadMatches();
      toast({ title: "Matches generated!", description: "Your recommendations are ready." });
    } catch {
      toast({ title: "Coming soon", description: "University matching is being set up." });
    } finally {
      setGenerating(false);
    }
  }

  async function toggleSaved(matchId: string, currentSaved: boolean) {
    try {
      await supabase
        .from("student_university_matches")
        .update({ saved: !currentSaved })
        .eq("id", matchId);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, saved: !currentSaved } : m))
      );
    } catch (err) {
      console.error(err);
    }
  }

  function handleGetPlan(universityName: string) {
    setSelectedUniversity(universityName);
    setAdvisorOpen(true);
  }

  // Filtering & sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...matches];

    if (filters.country) {
      result = result.filter((m) => m.university.country === filters.country);
    }
    if (filters.tuitionMax) {
      result = result.filter(
        (m) =>
          !m.university.tuition_usd || m.university.tuition_usd <= filters.tuitionMax!
      );
    }
    if (filters.acceptanceMin) {
      result = result.filter(
        (m) =>
          !m.university.acceptance_rate ||
          m.university.acceptance_rate >= filters.acceptanceMin!
      );
    }

    switch (sortBy) {
      case "match":
        result.sort((a, b) => b.match_score - a.match_score);
        break;
      case "acceptance":
        result.sort(
          (a, b) =>
            (b.university.acceptance_rate || 0) - (a.university.acceptance_rate || 0)
        );
        break;
      case "tuition-asc":
        result.sort(
          (a, b) =>
            (a.university.tuition_usd || 999999) - (b.university.tuition_usd || 999999)
        );
        break;
      case "ranking":
        result.sort(
          (a, b) =>
            (a.university.ranking_global || 9999) - (b.university.ranking_global || 9999)
        );
        break;
    }

    return result;
  }, [matches, filters, sortBy]);

  const availableCountries = useMemo(
    () => [...new Set(matches.map((m) => m.university.country))].sort(),
    [matches]
  );

  const savedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.saved)
        .map((m) => ({
          id: m.id,
          university: {
            name: m.university.name,
            country: m.university.country,
            acceptance_rate: m.university.acceptance_rate,
            tuition_usd: m.university.tuition_usd,
            ranking_global: m.university.ranking_global,
          },
          match_score: m.match_score,
        })),
    [matches]
  );

  if (schoolLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <LockedFeatureModal open={showLockedModal} onOpenChange={setShowLockedModal} />

      {/* Full-page Profile/Preferences Editor */}
      {editingProfile && (
        <div className="max-w-[1200px] mx-auto h-[calc(100vh-80px)] overflow-hidden">
          {editStep === "portfolio" ? (
            <div className="space-y-4 overflow-y-auto h-full pb-8">
              <h1 className="text-xl font-bold text-foreground">Build Your Profile</h1>
              <p className="text-sm text-muted-foreground">Upload your academic portfolio to get better matches</p>
              <PortfolioUpload onComplete={() => setEditStep("preferences")} />
            </div>
          ) : (
            <PreferenceQuestionnaire
              onComplete={() => {
                setEditingProfile(false);
                setNeedsSetup(false);
                loadMatches();
              }}
              onBack={() => setEditStep("portfolio")}
              onAskAdvisor={(prompt) => {
                setSelectedUniversity(prompt);
                setAdvisorOpen(true);
              }}
            />
          )}
        </div>
      )}

      {/* AI Advisor Drawer */}
      <AIAdvisorDrawer
        open={advisorOpen}
        onOpenChange={setAdvisorOpen}
        topUniversities={matches.map((m) => ({
          name: m.university.name,
          country: m.university.country,
          match_score: m.match_score,
        }))}
        selectedUniversity={selectedUniversity}
        onUniversityChange={setSelectedUniversity}
      />

      {hasUniversityMatchAccess && !editingProfile && (
        <div className="flex gap-6 max-w-[1400px] mx-auto">
          {/* Left Column: Profile Card */}
          <div className="hidden lg:block w-[280px] flex-shrink-0 sticky top-4 self-start space-y-4">
            <MatchProfileCard onEditProfile={() => {
              setEditStep("portfolio");
              setEditingProfile(true);
            }} />
          </div>

          {/* Right Column: Results */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  University Match
                </h1>
                <p className="text-sm text-muted-foreground">
                  Personalized recommendations across the globe
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => generateMatches()}
                  disabled={generating}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            {matches.length > 0 && (
              <MatchFilterBar
                filters={filters}
                sortBy={sortBy}
                onFiltersChange={setFilters}
                onSortChange={setSortBy}
                availableCountries={availableCountries}
                totalResults={filteredAndSorted.length}
              />
            )}

            {/* Loading */}
            {(loading || generating) && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {generating
                    ? "Analyzing your profile and finding matches..."
                    : "Loading matches..."}
                </p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !generating && matches.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <GraduationCap className="w-14 h-14 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">
                  No matches yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Complete your profile and preferences to get personalized university recommendations.
                </p>
                <Button onClick={() => { setEditStep("portfolio"); setEditingProfile(true); }} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Set Up Profile
                </Button>
              </div>
            )}

            {/* University Cards Grid */}
            {!loading && !generating && filteredAndSorted.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredAndSorted.map((match) => (
                  <UniversityCard
                    key={match.id}
                    university={match.university}
                    matchScore={match.match_score}
                    matchReason={match.match_reason}
                    financialEstimate={match.financial_estimate}
                    saved={match.saved}
                    matchId={match.id}
                    onToggleSave={toggleSaved}
                    onGetPlan={handleGetPlan}
                  />
                ))}
              </div>
            )}

            {/* Shortlist Panel */}
            {savedMatches.length > 0 && (
              <ShortlistPanel
                savedMatches={savedMatches}
                onRemove={(id) => toggleSaved(id, true)}
              />
            )}
          </div>
        </div>
      )}

      {/* Floating AI Advisor Button */}
      {hasUniversityMatchAccess && matches.length > 0 && !advisorOpen && (
        <button
          onClick={() => setAdvisorOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-sm font-medium">Ask Advisor</span>
        </button>
      )}
    </DashboardLayout>
  );
}
