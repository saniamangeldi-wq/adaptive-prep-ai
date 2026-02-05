import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2,
  Star,
  MapPin,
  Users,
  DollarSign,
  ExternalLink,
  Heart,
  RefreshCw,
  Download,
  Trophy,
  GraduationCap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UniversityAIAdvisor } from "./UniversityAIAdvisor";
 import { Progress } from "@/components/ui/progress";
 import { TrendingUp, Sparkles } from "lucide-react";

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
  financial_estimate: {
    scholarship_estimate?: number;
    expected_contribution?: number;
    total_4_year?: number;
  } | null;
  saved: boolean;
}

interface UniversityMatchesProps {
  onRestart: () => void;
}

export function UniversityMatches({ onRestart }: UniversityMatchesProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<UniversityMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);

  // Calculate acceptance chance based on student profile vs university requirements
  const calculateAcceptanceChance = (university: UniversityMatch["university"]) => {
    let chance = 50; // Base chance
    
    // Factor in acceptance rate (lower acceptance = lower base chance)
    if (university.acceptance_rate) {
      chance = Math.min(50, university.acceptance_rate * 0.8 + 10);
    }
    
    // Boost based on profile completeness
    if (profile?.study_subjects && (profile.study_subjects as string[]).length > 0) {
      chance += 5;
    }
    if (profile?.primary_goal) {
      chance += 5;
    }
    if (profile?.grade_level) {
      chance += 5;
    }
    
    return Math.min(85, Math.max(5, Math.round(chance)));
  };

  const getChanceColor = (chance: number) => {
    if (chance >= 60) return "text-green-500";
    if (chance >= 40) return "text-yellow-500";
    if (chance >= 20) return "text-orange-500";
    return "text-red-500";
  };

  const getChanceLabel = (chance: number) => {
    if (chance >= 60) return "Good";
    if (chance >= 40) return "Moderate";
    if (chance >= 20) return "Reach";
    return "Dream";
  };

  useEffect(() => {
    loadMatches();
  }, [user]);

  async function loadMatches() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("student_university_matches")
        .select(`
          id,
          match_score,
          match_reason,
          financial_estimate,
          saved,
          university:university_database (
            id,
            name,
            country,
            logo_url,
            acceptance_rate,
            avg_sat_score,
            tuition_usd,
            living_cost_monthly,
            student_population,
            programs,
            location_type,
            website,
            ranking_global
          )
        `)
        .eq("student_id", user.id)
        .order("match_score", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setMatches(data.map(m => ({
          ...m,
          university: m.university as any,
          financial_estimate: m.financial_estimate as any
        })));
      } else {
        // Generate matches if none exist
        await generateMatches();
      }
    } catch (err) {
      console.error("Error loading matches:", err);
      toast({
        title: "Error",
        description: "Failed to load university matches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateMatches() {
    if (!user) return;

    setGenerating(true);

    try {
      // Call the AI edge function to generate matches
      const { data, error } = await supabase.functions.invoke("university-matcher", {
        body: { student_id: user.id }
      });

      if (error) throw error;

      // Reload matches after generation
      await loadMatches();

      toast({
        title: "Matches generated!",
        description: "Your personalized university recommendations are ready."
      });
    } catch (err: any) {
      console.error("Error generating matches:", err);
      
      // If no universities in database, show helpful message
      toast({
        title: "Coming soon",
        description: "University matching is being set up. Check back soon!",
        variant: "default"
      });
    } finally {
      setGenerating(false);
    }
  }

  async function toggleSaved(matchId: string, currentSaved: boolean) {
    try {
      const { error } = await supabase
        .from("student_university_matches")
        .update({ saved: !currentSaved })
        .eq("id", matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, saved: !currentSaved } : m
      ));

      toast({
        title: currentSaved ? "Removed from list" : "Added to list",
        description: currentSaved ? "University removed from your saved list" : "University saved to your list"
      });
    } catch (err) {
      console.error("Error toggling saved:", err);
    }
  }

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-500 bg-green-500/10";
    if (score >= 60) return "text-yellow-500 bg-yellow-500/10";
    return "text-orange-500 bg-orange-500/10";
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">
          {generating ? "Analyzing your profile and finding matches..." : "Loading your matches..."}
        </p>
        <p className="text-sm text-muted-foreground">
          This may take a moment
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">No matches yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          We're still building our university database. Check back soon for personalized recommendations!
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Button onClick={onRestart} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Update Profile
          </Button>
          <Button onClick={generateMatches} className="gap-2">
            <Loader2 className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* University AI Advisor */}
      <UniversityAIAdvisor 
        topUniversities={matches.map(m => ({
          name: m.university.name,
          country: m.university.country,
          match_score: m.match_score
        }))}
        initialUniversity={selectedUniversity}
        onUniversityChange={setSelectedUniversity}
      />

      {/* Matches Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Your Top Matches
          </h3>
          <p className="text-sm text-muted-foreground">
            {matches.length} universities matched to your profile
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button onClick={generateMatches} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Match Cards */}
      <div className="grid gap-4">
        {matches.map((match, index) => (
          <div 
            key={match.id}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Rank */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {index < 3 ? (
                  <Trophy className={`w-5 h-5 ${
                    index === 0 ? "text-yellow-500" : 
                    index === 1 ? "text-gray-400" : 
                    "text-amber-600"
                  }`} />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* University Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {match.university.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {match.university.country}
                        {match.university.location_type && ` • ${match.university.location_type}`}
                      </span>
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className={`px-3 py-1 rounded-full font-semibold ${getMatchColor(match.match_score)}`}>
                    {Math.round(match.match_score)}% Match
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-4 mt-4">
                  {match.university.ranking_global && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">
                        #{match.university.ranking_global} Global
                      </span>
                    </div>
                  )}
                  {match.university.acceptance_rate && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {match.university.acceptance_rate}% acceptance
                      </span>
                    </div>
                  )}
                  {match.university.tuition_usd && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(match.university.tuition_usd)}/year
                      </span>
                    </div>
                  )}
                </div>

                {/* Match Reason */}
                {match.match_reason && (
                  <p className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {match.match_reason}
                  </p>
                )}

                {/* Acceptance Chance */}
                <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Your Acceptance Chance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getChanceColor(calculateAcceptanceChance(match.university))}`}>
                        {calculateAcceptanceChance(match.university)}%
                      </span>
                      <Badge variant="outline" className={getChanceColor(calculateAcceptanceChance(match.university))}>
                        {getChanceLabel(calculateAcceptanceChance(match.university))}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={calculateAcceptanceChance(match.university)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on your profile. Click "Get My Plan" to improve your chances!
                  </p>
                </div>

                {/* Programs */}
                {match.university.programs && match.university.programs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {match.university.programs.slice(0, 5).map(program => (
                      <Badge key={program} variant="secondary">
                        {program}
                      </Badge>
                    ))}
                    {match.university.programs.length > 5 && (
                      <Badge variant="outline">
                        +{match.university.programs.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedUniversity(match.university.name);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  >
                    <Sparkles className="w-4 h-4" />
                    Get My Plan
                  </Button>
                  <Button
                    variant={match.saved ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSaved(match.id, match.saved)}
                    className="gap-2"
                  >
                    <Heart className={`w-4 h-4 ${match.saved ? "fill-current" : ""}`} />
                    {match.saved ? "Saved" : "Save"}
                  </Button>
                  {match.university.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-2"
                    >
                      <a href={match.university.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Visit Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-center pt-6 border-t border-border">
        <Button onClick={onRestart} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Update Profile & Preferences
        </Button>
      </div>
    </div>
  );
}
