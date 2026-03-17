import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FinancialIntakeForm } from "./FinancialIntakeForm";
import { AffordabilityVerdict } from "./AffordabilityVerdict";
import { SavingsPlan } from "./SavingsPlan";
import { JobShortlist } from "./JobShortlist";
import { calculateFinancials } from "./financialCalculations";
import { IntakeData, UniversityCosts, JobListing, FinancialCalculations as CalcType } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  universityName: string;
  city: string;
  country: string;
}

function parseCosts(content: string): UniversityCosts {
  const findNum = (patterns: RegExp[]): number | null => {
    for (const p of patterns) {
      const m = content.match(p);
      if (m) return parseFloat(m[1].replace(/,/g, ""));
    }
    return null;
  };

  return {
    annualTuition: findNum([
      /tuition[^$]*?\$([0-9,]+(?:\.\d+)?)/i,
      /\$([0-9,]+(?:\.\d+)?)[^)]*?(?:tuition|year)/i,
    ]),
    monthlyRent: findNum([
      /rent[^$]*?\$([0-9,]+(?:\.\d+)?)/i,
      /\$([0-9,]+(?:\.\d+)?)[^)]*?rent/i,
      /housing[^$]*?\$([0-9,]+(?:\.\d+)?)/i,
    ]),
    monthlyFood: findNum([
      /food[^$]*?\$([0-9,]+(?:\.\d+)?)/i,
      /groceries[^$]*?\$([0-9,]+(?:\.\d+)?)/i,
      /\$([0-9,]+(?:\.\d+)?)[^)]*?food/i,
    ]),
    monthlyTransport: findNum([
      /transport[^$]*?\$([0-9,]+(?:\.\d+)?)/i,
      /\$([0-9,]+(?:\.\d+)?)[^)]*?transport/i,
    ]),
  };
}

function parseJobs(content: string): JobListing[] {
  const jobs: JobListing[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const payMatch = line.match(/\$([0-9]+(?:\.\d+)?)\s*(?:\/hr|per hour|\/hour|an hour)/i);
    if (payMatch) {
      const titleMatch = line.match(/^[\-\*\d.)\s]*(.*?)(?:\s*[-–:]\s|\$)/);
      const title = titleMatch?.[1]?.trim() || line.split("$")[0].replace(/^[\-\*\d.)\s]+/, "").trim();
      if (title && title.length > 2) {
        jobs.push({ title: title.slice(0, 60), hourlyPay: parseFloat(payMatch[1]) });
      }
    }
  }
  if (jobs.length === 0) {
    jobs.push(
      { title: "Campus Library Assistant", hourlyPay: 12 },
      { title: "Retail / Café Staff", hourlyPay: 11 },
      { title: "Tutoring", hourlyPay: 15 },
    );
  }
  return jobs.slice(0, 5);
}

export function FinancialReadinessPlanner({ open, onOpenChange, universityName, city, country }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<{
    costs: UniversityCosts;
    jobs: JobListing[];
    calc: CalcType;
    intake: IntakeData;
  } | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [manualCosts, setManualCosts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (intake: IntakeData) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in first", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const costQuery = `Average international student annual tuition, rent, food, and transport costs in ${city} ${country} ${new Date().getFullYear()} in USD`;
      const jobQuery = `Part-time jobs for international students near ${city} ${country} 2026 hourly pay`;

      const [costRes, jobRes] = await Promise.all([
        supabase.functions.invoke("web-search", {
          body: { query: costQuery },
        }),
        supabase.functions.invoke("web-search", {
          body: { query: jobQuery },
        }),
      ]);

      const costs = parseCosts(costRes.data?.content || "");
      const jobs = parseJobs(jobRes.data?.content || "");

      // Check missing fields
      const missing: string[] = [];
      if (!costs.annualTuition) missing.push("tuition");
      if (!costs.monthlyRent) missing.push("rent");
      if (!costs.monthlyFood) missing.push("food");
      if (!costs.monthlyTransport) missing.push("transport");

      if (missing.length > 0) {
        setMissingFields(missing);
        setReport({ costs, jobs, calc: calculateFinancials(intake, costs), intake });
      } else {
        const calc = calculateFinancials(intake, costs);
        setReport({ costs, jobs, calc, intake });
        setMissingFields([]);
      }
    } catch (err) {
      console.error("Financial planner error:", err);
      toast({ title: "Failed to fetch cost data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualContinue = () => {
    if (!report) return;
    const updatedCosts: UniversityCosts = {
      annualTuition: manualCosts.tuition ?? report.costs.annualTuition,
      monthlyRent: manualCosts.rent ?? report.costs.monthlyRent,
      monthlyFood: manualCosts.food ?? report.costs.monthlyFood,
      monthlyTransport: manualCosts.transport ?? report.costs.monthlyTransport,
    };
    const calc = calculateFinancials(report.intake, updatedCosts);
    setReport({ ...report, costs: updatedCosts, calc });
    setMissingFields([]);
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("financial_reports" as any).insert({
        user_id: user.id,
        university_name: report.intake.universityName,
        city: report.intake.city,
        country: report.intake.country,
        enrollment_date: `${report.intake.enrollmentYear}-${String(report.intake.enrollmentMonth).padStart(2, "0")}`,
        confidence_score: report.calc.confidenceScore,
        verdict: report.calc.verdict,
        total_needed_usd: report.calc.totalNeeded,
        projected_savings_usd: report.calc.projectedSavings,
        gap_usd: report.calc.gap,
        report_data: {
          costs: report.costs,
          jobs: report.jobs,
          intake: report.intake,
        },
      } as any);

      if (error) throw error;
      toast({ title: "Report saved to your University Match profile" });
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Failed to save report", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const showReport = report && missingFields.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F1117] border-[#2D3748] p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1117] border-b border-[#2D3748] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">💰 Financial Readiness Planner</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-10 w-10 border-4 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Researching costs for {city}, {country}...
              </p>
            </div>
          )}

          {/* Intake form (hide when report is shown) */}
          {!showReport && !isLoading && (
            <FinancialIntakeForm
              universityName={universityName}
              city={city}
              country={country}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}

          {/* Missing fields fallback */}
          {report && missingFields.length > 0 && !isLoading && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <p className="text-amber-400 font-semibold">
                ⚠️ We couldn't find complete data for this university. Please answer these quick questions:
              </p>
              {missingFields.includes("tuition") && (
                <Input
                  type="number"
                  placeholder="Annual tuition in USD"
                  className="border-amber-500/30"
                  onChange={(e) => setManualCosts((p) => ({ ...p, tuition: Number(e.target.value) }))}
                />
              )}
              {missingFields.includes("rent") && (
                <Input
                  type="number"
                  placeholder="Estimated monthly rent in USD"
                  className="border-amber-500/30"
                  onChange={(e) => setManualCosts((p) => ({ ...p, rent: Number(e.target.value) }))}
                />
              )}
              {missingFields.includes("food") && (
                <Input
                  type="number"
                  placeholder="Estimated monthly food cost in USD"
                  className="border-amber-500/30"
                  onChange={(e) => setManualCosts((p) => ({ ...p, food: Number(e.target.value) }))}
                />
              )}
              {missingFields.includes("transport") && (
                <Input
                  type="number"
                  placeholder="Estimated monthly transport cost in USD"
                  className="border-amber-500/30"
                  onChange={(e) => setManualCosts((p) => ({ ...p, transport: Number(e.target.value) }))}
                />
              )}
              <Button onClick={handleManualContinue} className="bg-amber-500 hover:bg-amber-600 text-white w-full">
                Continue with my answers →
              </Button>
            </div>
          )}

          {/* Report */}
          {showReport && (
            <div className="space-y-8">
              <AffordabilityVerdict calc={report.calc} />
              <SavingsPlan intake={report.intake} calc={report.calc} />
              <JobShortlist jobs={report.jobs} calc={report.calc} />

              {/* Save button */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#10B981] hover:bg-[#10B981]/80 text-white gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Report"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
