import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSchoolStudent } from "@/hooks/useSchoolStudent";
import { useUniversityAccess } from "@/hooks/useUniversityAccess";
import { LockedFeatureModal } from "@/components/university-match/LockedFeatureModal";
import { MatchProfileCard } from "@/components/university-match/MatchProfileCard";
import { UniversityCard } from "@/components/university-match/UniversityCard";
import { AIAdvisorDrawer } from "@/components/university-match/AIAdvisorDrawer";
import { ShortlistPanel } from "@/components/university-match/ShortlistPanel";
import { PortfolioUpload } from "@/components/university-match/PortfolioUpload";
import { PreferenceQuestionnaire } from "@/components/university-match/PreferenceQuestionnaire";
import {
  UniversityFilterToolbar,
  EmptyFilterState,
  getRegionForCountry,
  type UniversityFilters,
  type UniversitySortOption,
} from "@/components/university-match/UniversityFilterToolbar";
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
  Clock,
  DollarSign,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    city?: string | null;
    qs_rank?: number | null;
    offers_full_scholarship?: boolean | null;
    scholarship_name?: string | null;
    scholarship_coverage?: string | null;
    international_student_pct?: number | null;
    campus_setting?: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    hasActiveAccess: hasPaidAccess,
    remainingSeconds,
    formattedTime,
    loading: accessLoading,
    purchasing,
    purchaseAccess,
    verifyPayment,
    checkAccess,
  } = useUniversityAccess();

  // Combined access: subscription-based OR paid 10-min access
  const canAccess = hasUniversityMatchAccess || hasPaidAccess;

  const [showLockedModal, setShowLockedModal] = useState(false);
  const [matches, setMatches] = useState<UniversityMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [filters, setFilters] = useState<UniversityFilters>({
    search: "",
    scholarshipOnly: false,
    region: null,
    acceptanceRange: null,
    tuitionRange: null,
  });
  const [sortBy, setSortBy] = useState<UniversitySortOption>("qs-rank");

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [confirmRefreshOpen, setConfirmRefreshOpen] = useState(false);

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editStep, setEditStep] = useState<"portfolio" | "preferences">("portfolio");
  const [needsSetup, setNeedsSetup] = useState(false);

  // Handle payment success redirect
  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (payment === "success" && sessionId) {
      verifyPayment(sessionId).then((granted) => {
        if (granted) {
          toast({ title: "Access granted!", description: "You have 10 minutes of University Match access." });
        }
        // Clean up URL params
        setSearchParams({});
      });
    } else if (payment === "cancelled") {
      toast({ title: "Payment cancelled", description: "You can try again anytime.", variant: "destructive" });
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    if (!schoolLoading && !accessLoading && !canAccess) {
      setShowLockedModal(false); // We'll show the paywall instead
      setLoading(false);
    }
  }, [canAccess, schoolLoading, accessLoading]);

  useEffect(() => {
    if (canAccess && user) {
      checkAndLoad();
    }
  }, [canAccess, user]);

  async function checkAndLoad() {
    try {
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
            location_type, website, ranking_global, city, qs_rank,
            offers_full_scholarship, scholarship_name, scholarship_coverage,
            international_student_pct, campus_setting, last_refreshed_at
          )
        `)
        .eq("student_id", user.id)
        .order("match_score", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped = data.map((m: any) => ({
          ...m,
          university: m.university as any,
          financial_estimate: m.financial_estimate as any,
        }));
        setMatches(mapped);

        const refreshDates = mapped
          .map((m: any) => m.university?.last_refreshed_at)
          .filter(Boolean);
        if (refreshDates.length > 0) {
          setLastRefreshed(refreshDates.sort().reverse()[0]);
        }
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

  async function handleRefreshScholarships() {
    setConfirmRefreshOpen(false);
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-scholarships");
      if (error) throw error;
      toast({
        title: "Scholarship data updated",
        description: data?.message || "Scholarship data has been refreshed.",
      });
      await loadMatches();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to refresh scholarship data", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }

  function handleGetPlan(universityName: string) {
    setSelectedUniversity(universityName);
    setAdvisorOpen(true);
  }

  const filteredAndSorted = useMemo(() => {
    let result = [...matches];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.university.name.toLowerCase().includes(q) ||
          m.university.country.toLowerCase().includes(q) ||
          (m.university.city && m.university.city.toLowerCase().includes(q))
      );
    }

    if (filters.scholarshipOnly) {
      result = result.filter((m) => m.university.offers_full_scholarship);
    }

    if (filters.region) {
      result = result.filter(
        (m) => getRegionForCountry(m.university.country) === filters.region
      );
    }

    if (filters.acceptanceRange) {
      result = result.filter((m) => {
        const rate = m.university.acceptance_rate;
        if (rate == null) return false;
        switch (filters.acceptanceRange) {
          case "under10": return rate < 10;
          case "10to30": return rate >= 10 && rate < 30;
          case "30to60": return rate >= 30 && rate < 60;
          case "over60": return rate >= 60;
          default: return true;
        }
      });
    }

    if (filters.tuitionRange) {
      result = result.filter((m) => {
        const t = m.university.tuition_usd;
        if (t == null) return false;
        switch (filters.tuitionRange) {
          case "under10k": return t < 10000;
          case "10to25k": return t >= 10000 && t < 25000;
          case "25to50k": return t >= 25000 && t < 50000;
          case "over50k": return t >= 50000;
          default: return true;
        }
      });
    }

    switch (sortBy) {
      case "qs-rank":
        result.sort((a, b) => (a.university.qs_rank || 9999) - (b.university.qs_rank || 9999));
        break;
      case "acceptance-high":
        result.sort((a, b) => (b.university.acceptance_rate || 0) - (a.university.acceptance_rate || 0));
        break;
      case "acceptance-low":
        result.sort((a, b) => (a.university.acceptance_rate || 999) - (b.university.acceptance_rate || 999));
        break;
      case "tuition-asc":
        result.sort((a, b) => (a.university.tuition_usd || 999999) - (b.university.tuition_usd || 999999));
        break;
      case "tuition-desc":
        result.sort((a, b) => (b.university.tuition_usd || 0) - (a.university.tuition_usd || 0));
        break;
      case "scholarship":
        result.sort((a, b) => {
          const aSchol = a.university.offers_full_scholarship ? 1 : 0;
          const bSchol = b.university.offers_full_scholarship ? 1 : 0;
          if (bSchol !== aSchol) return bSchol - aSchol;
          return (a.university.qs_rank || 9999) - (b.university.qs_rank || 9999);
        });
        break;
    }

    return result;
  }, [matches, filters, sortBy]);

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

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: "",
      scholarshipOnly: false,
      region: null,
      acceptanceRange: null,
      tuitionRange: null,
    });
  }, []);

  if (schoolLoading || accessLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Paywall for users without subscription access
  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full rounded-2xl border border-border/50 bg-card p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">University Match</h2>
              <p className="text-sm text-muted-foreground">
                Get personalized university recommendations powered by AI. Pay just $1 for 10 minutes of full access.
              </p>
            </div>
            
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <DollarSign className="w-5 h-5" />
                <span>$1 / ₸500 for 10 minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Explore matches, compare universities, get AI advice, and save your shortlist.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => purchaseAccess("usd")}
                disabled={purchasing}
                className="flex-1 gap-2"
                size="lg"
              >
                {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Unlock - $1
              </Button>
              <Button
                onClick={() => purchaseAccess("kzt")}
                disabled={purchasing}
                variant="outline"
                className="flex-1 gap-2"
                size="lg"
              >
                {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Unlock - ₸500
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Or upgrade to Pro/Elite plan for unlimited access
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Timer banner for paid access */}
      {hasPaidAccess && !hasUniversityMatchAccess && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>
              Access expires in <span className="font-mono font-bold text-primary">{formattedTime}</span>
            </span>
          </div>
          {remainingSeconds < 120 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => purchaseAccess("usd")} disabled={purchasing} className="gap-1 text-xs">
                <DollarSign className="w-3 h-3" />
                $1
              </Button>
              <Button variant="outline" size="sm" onClick={() => purchaseAccess("kzt")} disabled={purchasing} className="gap-1 text-xs">
                ₸500
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Refresh Confirmation Dialog */}
      <Dialog open={confirmRefreshOpen} onOpenChange={setConfirmRefreshOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh Scholarship Data</DialogTitle>
            <DialogDescription>
              This will re-fetch the latest scholarship and acceptance data from the web for all universities. This may take 1-2 minutes. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRefreshOpen(false)}>Cancel</Button>
            <Button onClick={handleRefreshScholarships} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {canAccess && !editingProfile && (
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

            {/* Enhanced Filter Toolbar */}
            {matches.length > 0 && (
              <UniversityFilterToolbar
                filters={filters}
                sortBy={sortBy}
                onFiltersChange={setFilters}
                onSortChange={setSortBy}
                totalResults={filteredAndSorted.length}
                onRefreshScholarships={() => setConfirmRefreshOpen(true)}
                refreshing={refreshing}
                lastRefreshed={lastRefreshed}
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

            {/* Empty State - No matches at all */}
            {!loading && !generating && matches.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <GraduationCap className="w-14 h-14 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">No matches yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Complete your profile and preferences to get personalized university recommendations.
                </p>
                <Button onClick={() => { setEditStep("portfolio"); setEditingProfile(true); }} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Set Up Profile
                </Button>
              </div>
            )}

            {/* Empty State - Filters returned nothing */}
            {!loading && !generating && matches.length > 0 && filteredAndSorted.length === 0 && (
              <EmptyFilterState onClear={clearAllFilters} />
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
      {canAccess && matches.length > 0 && !advisorOpen && (
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
