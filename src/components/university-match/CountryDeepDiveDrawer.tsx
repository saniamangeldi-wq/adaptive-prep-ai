import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, ExternalLink, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸",
  "Canada": "🇨🇦",
  "United Kingdom": "🇬🇧",
  "Ireland": "🇮🇪",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "Netherlands": "🇳🇱",
  "Switzerland": "🇨🇭",
  "Austria": "🇦🇹",
  "Belgium": "🇧🇪",
  "Italy": "🇮🇹",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Norway": "🇳🇴",
  "Denmark": "🇩🇰",
  "Finland": "🇫🇮",
  "Australia": "🇦🇺",
  "New Zealand": "🇳🇿",
  "Japan": "🇯🇵",
  "South Korea": "🇰🇷",
  "Singapore": "🇸🇬",
};

const COUNTRY_INFO: Record<string, { visa: string; language: string; workRights: string }> = {
  "United States": { visa: "F-1 student visa required", language: "English", workRights: "20 hrs/week on-campus (CPT/OPT available)" },
  "United Kingdom": { visa: "Student visa (Tier 4) required", language: "English", workRights: "20 hrs/week during term" },
  "Canada": { visa: "Study permit required", language: "English / French", workRights: "20 hrs/week off-campus" },
  "Australia": { visa: "Student visa (subclass 500)", language: "English", workRights: "48 hrs/fortnight" },
  "Germany": { visa: "Student visa required for non-EU", language: "German / English (many programs)", workRights: "120 full days or 240 half days/year" },
  "France": { visa: "VLS-TS student visa", language: "French / English (some programs)", workRights: "964 hrs/year" },
  "Netherlands": { visa: "MVV + residence permit", language: "Dutch / English (most programs)", workRights: "16 hrs/week" },
  "Switzerland": { visa: "Student visa required for non-EU", language: "German / French / English", workRights: "15 hrs/week during term" },
  "Japan": { visa: "Student visa (留学)", language: "Japanese / English (select programs)", workRights: "28 hrs/week" },
  "Singapore": { visa: "Student Pass required", language: "English", workRights: "16 hrs/week during term" },
};

interface University {
  id: string;
  name: string;
  ranking_global: number | null;
  acceptance_rate: number | null;
  tuition_usd: number | null;
  avg_sat_score: number | null;
  living_cost_monthly: number | null;
  min_grade_requirement: number | null;
  programs: string[] | null;
  website: string | null;
}

interface CountryDeepDiveDrawerProps {
  country: string | null;
  onClose: () => void;
  onAskAdvisor: (prompt: string) => void;
}

function RequirementRow({ icon, label, requirement, userValue }: {
  icon: string;
  label: string;
  requirement: string;
  userValue?: string | null;
}) {
  const status = userValue === undefined || userValue === null || userValue === "Not set"
    ? "unknown"
    : "set";

  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-muted-foreground min-w-[110px]">{label}</span>
      <span className="text-foreground font-medium flex-1">{requirement}</span>
      {status === "unknown" && (
        <span className="text-amber-400 flex-shrink-0">⚠️</span>
      )}
    </div>
  );
}

export function CountryDeepDiveDrawer({ country, onClose, onAskAdvisor }: CountryDeepDiveDrawerProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUni, setExpandedUni] = useState<string | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);

  useEffect(() => {
    if (!country) return;
    setLoading(true);
    setExpandedUni(null);
    setOverviewOpen(false);

    supabase
      .from("university_database")
      .select("id, name, ranking_global, acceptance_rate, tuition_usd, avg_sat_score, living_cost_monthly, min_grade_requirement, programs, website")
      .eq("country", country)
      .order("ranking_global", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setUniversities((data as University[]) || []);
        setLoading(false);
      });
  }, [country]);

  if (!country) return null;

  const flag = COUNTRY_FLAGS[country] || "🌍";
  const countryInfo = COUNTRY_INFO[country];

  // Calculate avg living cost from universities
  const avgLivingCost = universities.length > 0
    ? Math.round(universities.filter(u => u.living_cost_monthly).reduce((s, u) => s + (u.living_cost_monthly || 0), 0) / Math.max(1, universities.filter(u => u.living_cost_monthly).length))
    : null;

  const drawerContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border/30 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="text-2xl">{flag}</span> {country}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Top Universities & Entry Requirements</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Section 1: Universities */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : universities.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No universities in our database for {country} yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top Universities ({universities.length})
            </h3>
            {universities.map((uni) => (
              <div key={uni.id} className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
                {/* University Row */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground leading-tight">
                        {uni.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {uni.acceptance_rate && (
                          <span>{uni.acceptance_rate}% acceptance</span>
                        )}
                        {uni.tuition_usd && (
                          <span>${uni.tuition_usd.toLocaleString()}/yr</span>
                        )}
                      </div>
                    </div>
                    {uni.ranking_global && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                        #{uni.ranking_global} Global
                      </span>
                    )}
                  </div>

                  {/* Expand Toggle */}
                  <button
                    onClick={() => setExpandedUni(expandedUni === uni.id ? null : uni.id)}
                    className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {expandedUni === uni.id ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Hide Requirements
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        View Requirements
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Requirements */}
                {expandedUni === uni.id && (
                  <div className="px-3.5 pb-3.5 pt-0 border-t border-border/20">
                    <div className="pt-3 space-y-1">
                      <RequirementRow
                        icon="📊"
                        label="GPA Required:"
                        requirement={uni.min_grade_requirement ? `${(uni.min_grade_requirement / 25 * 4).toFixed(1)}+` : "Not specified"}
                        userValue={null}
                      />
                      <RequirementRow
                        icon="📝"
                        label="SAT/ACT Score:"
                        requirement={uni.avg_sat_score ? `${uni.avg_sat_score}+` : "Not specified"}
                        userValue={null}
                      />
                      <RequirementRow
                        icon="🗣️"
                        label="English Test:"
                        requirement="IELTS 7.0+ / TOEFL 100+"
                      />
                      <RequirementRow
                        icon="📁"
                        label="Essays Required:"
                        requirement="Yes (Personal statement + supplements)"
                      />
                      <RequirementRow
                        icon="📅"
                        label="Deadline:"
                        requirement="January 1 (Regular Decision)"
                      />
                      <RequirementRow
                        icon="💰"
                        label="Application Fee:"
                        requirement={uni.tuition_usd ? "$75" : "Varies"}
                      />
                      <RequirementRow
                        icon="🏆"
                        label="Extracurriculars:"
                        requirement="Research experience preferred"
                      />
                    </div>
                    {uni.website && (
                      <a
                        href={uni.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
                      >
                        Visit Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Section 2: Country Overview */}
        <Collapsible open={overviewOpen} onOpenChange={setOverviewOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Country Overview
            </span>
            {overviewOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3.5 rounded-xl border border-border/30 bg-muted/10 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg. Cost of Living</span>
              <span className="font-medium text-foreground">
                {avgLivingCost ? `$${avgLivingCost.toLocaleString()}/mo` : "N/A"}
              </span>
            </div>
            {countryInfo ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Student Visa</span>
                  <span className="font-medium text-foreground text-right max-w-[200px]">{countryInfo.visa}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-medium text-foreground">{countryInfo.language}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Work Rights</span>
                  <span className="font-medium text-foreground text-right max-w-[200px]">{countryInfo.workRights}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No detailed info available for this country yet.</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Section 3: AI Quick Plan */}
        <Button
          onClick={() => onAskAdvisor(`What do I need to do to get into a top university in ${country}?`)}
          className="w-full gap-2 bg-[hsl(160,100%,40%)] hover:bg-[hsl(160,100%,35%)] text-white"
          size="lg"
        >
          <GraduationCap className="w-4 h-4" />
          Ask Advisor about {country}
        </Button>
      </div>
    </div>
  );

  // Mobile: bottom sheet style
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div
          className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border/50"
          style={{
            maxHeight: "85vh",
            animation: "slideUpFromBottom 200ms ease forwards",
          }}
        >
          <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted" />
          {drawerContent}
        </div>
      </div>
    );
  }

  // Desktop: slide-in from right replacing Live Match Preview
  return (
    <div
      className="w-[380px] flex-shrink-0 h-full border-l border-border/30 bg-background animate-slide-in-right"
    >
      {drawerContent}
    </div>
  );
}
