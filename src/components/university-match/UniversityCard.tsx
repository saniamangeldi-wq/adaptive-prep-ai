import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bookmark,
  GraduationCap,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FinancialReadinessPlanner } from "./financial/FinancialReadinessPlanner";

interface UniversityData {
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
  description?: string | null;
  application_deadline?: string | null;
}

interface UniversityCardProps {
  university: UniversityData;
  matchScore: number;
  matchReason: string | null;
  financialEstimate: any;
  saved: boolean;
  matchId: string;
  onToggleSave: (matchId: string, saved: boolean) => void;
  onGetPlan: (universityName: string) => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸", "United Kingdom": "🇬🇧", Canada: "🇨🇦",
  Australia: "🇦🇺", Germany: "🇩🇪", France: "🇫🇷", Netherlands: "🇳🇱",
  Switzerland: "🇨🇭", Japan: "🇯🇵", "South Korea": "🇰🇷", Singapore: "🇸🇬",
  "Hong Kong": "🇭🇰", "New Zealand": "🇳🇿", Ireland: "🇮🇪", Sweden: "🇸🇪",
  Denmark: "🇩🇰", Norway: "🇳🇴", Finland: "🇫🇮", Austria: "🇦🇹",
  Belgium: "🇧🇪", Italy: "🇮🇹", Spain: "🇪🇸", Kazakhstan: "🇰🇿",
  Turkey: "🇹🇷", UAE: "🇦🇪", China: "🇨🇳", India: "🇮🇳",
};

function formatCurrency(amount: number | null) {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMatchReasons(reason: string | null): string[] {
  if (!reason) return [];
  // Split match reason text into tags
  const parts = reason
    .split(/[.;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && s.length < 60);
  return parts.slice(0, 3);
}

export function UniversityCard({
  university,
  matchScore,
  matchReason,
  financialEstimate,
  saved,
  matchId,
  onToggleSave,
  onGetPlan,
}: UniversityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const score = Math.round(matchScore);
  const flag = COUNTRY_FLAGS[university.country] || "🌍";

  const matchColor =
    score >= 90
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : score >= 70
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
      : "bg-muted text-muted-foreground border-border";

  const reasons = getMatchReasons(matchReason);

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-[hsl(var(--card))] transition-all duration-200",
        expanded
          ? "border-primary/30 shadow-lg"
          : "border-[hsl(var(--border))] hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-md"
      )}
    >
      <div className="p-5">
        {/* Header: Logo + Name + Match Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-lg">
              {university.logo_url ? (
                <img
                  src={university.logo_url}
                  alt={university.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <GraduationCap className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {university.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {flag} {university.country}
                {university.location_type && ` · ${university.location_type}`}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold border",
              matchColor
            )}
          >
            {score}%
          </div>
        </div>

        {/* 3 Key Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Users className="w-3 h-3" />
            </div>
            <p className="text-xs font-medium text-foreground">
              {university.acceptance_rate
                ? `${university.acceptance_rate}%`
                : "N/A"}
            </p>
            <p className="text-[10px] text-muted-foreground">Accept Rate</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <DollarSign className="w-3 h-3" />
            </div>
            <p className="text-xs font-medium text-foreground">
              {university.tuition_usd
                ? `$${Math.round(university.tuition_usd / 1000)}K`
                : "N/A"}
            </p>
            <p className="text-[10px] text-muted-foreground">Tuition/yr</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Star className="w-3 h-3" />
            </div>
            <p className="text-xs font-medium text-foreground">
              {university.ranking_global
                ? `#${university.ranking_global}`
                : "N/A"}
            </p>
            <p className="text-[10px] text-muted-foreground">World Rank</p>
          </div>
        </div>

        {/* Match Reason Tags */}
        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {reasons.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary"
              >
                <CheckCircle2 className="w-3 h-3" />
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                View Details
              </>
            )}
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white"
            onClick={() => setFinancialOpen(true)}
          >
            <Wallet className="w-3.5 h-3.5" />
            Plan Finances
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              saved
                ? "text-red-400 hover:text-red-300"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onToggleSave(matchId, saved)}
          >
            <Bookmark
              className={cn("w-4 h-4", saved && "fill-current")}
            />
          </Button>
          {university.website && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              asChild
            >
              <a
                href={university.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Financial Readiness Planner Modal */}
      <FinancialReadinessPlanner
        open={financialOpen}
        onOpenChange={setFinancialOpen}
        universityName={university.name}
        city={university.location_type || ""}
        country={university.country}
      />

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
              {["Overview", "Requirements", "Action Plan"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab.toLowerCase().replace(" ", "-")}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="p-5 space-y-4">
              {matchReason && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {matchReason}
                </p>
              )}
              {university.programs && university.programs.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Programs Offered
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {university.programs.slice(0, 8).map((p) => (
                      <Badge
                        key={p}
                        variant="secondary"
                        className="text-[11px]"
                      >
                        {p}
                      </Badge>
                    ))}
                    {university.programs.length > 8 && (
                      <Badge variant="outline" className="text-[11px]">
                        +{university.programs.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {financialEstimate && (
                <div className="p-3 rounded-xl bg-muted/50 space-y-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Financial Estimate
                  </p>
                  {financialEstimate.scholarship_estimate && (
                    <p className="text-sm text-foreground">
                      Est. Scholarship:{" "}
                      {formatCurrency(financialEstimate.scholarship_estimate)}
                    </p>
                  )}
                  {financialEstimate.total_4_year && (
                    <p className="text-sm text-foreground">
                      4-Year Total:{" "}
                      {formatCurrency(financialEstimate.total_4_year)}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requirements" className="p-5 space-y-3">
              <div className="space-y-2.5">
                {[
                  {
                    label: "SAT Score",
                    required: university.avg_sat_score
                      ? `${university.avg_sat_score}+`
                      : null,
                    met: true,
                  },
                  {
                    label: "Acceptance Rate",
                    required: university.acceptance_rate
                      ? `${university.acceptance_rate}%`
                      : null,
                    met: (university.acceptance_rate || 0) > 20,
                  },
                  {
                    label: "Annual Tuition",
                    required: university.tuition_usd
                      ? formatCurrency(university.tuition_usd)
                      : null,
                    met: true,
                  },
                ].map(
                  (req) =>
                    req.required && (
                      <div
                        key={req.label}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30"
                      >
                        <span className="text-sm text-foreground">
                          {req.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {req.required}
                          </span>
                          {req.met ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    )
                )}
              </div>
            </TabsContent>

            <TabsContent value="action-plan" className="p-5">
              <div className="text-center py-6 space-y-3">
                <Sparkles className="w-8 h-8 mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Get a personalized 12-month action plan to maximize your
                  chances of admission.
                </p>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => onGetPlan(university.name)}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Action Plan
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
