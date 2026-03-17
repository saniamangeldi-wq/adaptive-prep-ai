import { FINANCIAL_CONFIG, JobListing, FinancialCalculations } from "./types";
import { formatUSD } from "./financialCalculations";
import { Briefcase } from "lucide-react";

interface Props {
  jobs: JobListing[];
  calc: FinancialCalculations;
}

export function JobShortlist({ jobs, calc }: Props) {
  if (jobs.length === 0) return null;

  const { partTimeHoursPerWeekMin: minH, partTimeHoursPerWeekMax: maxH } = FINANCIAL_CONFIG;
  const weeksPerMonth = 4.33;

  const maxAnnualReduction = jobs.reduce((best, job) => {
    const annual = job.hourlyPay * maxH * weeksPerMonth * 12;
    return Math.max(best, annual);
  }, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-[#10B981]">Section 3 — Job Shortlist</h3>

      <div className="space-y-3">
        {jobs.slice(0, 5).map((job, i) => {
          const monthlyMin = Math.round(job.hourlyPay * minH * weeksPerMonth);
          const monthlyMax = Math.round(job.hourlyPay * maxH * weeksPerMonth);
          const coverMonths = calc.monthlyLivingCosts > 0
            ? (monthlyMax / calc.monthlyLivingCosts).toFixed(1)
            : "N/A";
          const annualIncome = monthlyMax * 12;
          const newGap = calc.gap + annualIncome;

          return (
            <div
              key={i}
              className="rounded-xl border-l-4 border-l-[#10B981] border border-[#2D3748] bg-[#1A1D27] p-4"
            >
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-[#10B981] mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">{job.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    Hourly Pay: <span className="text-foreground">{formatUSD(job.hourlyPay)}/hr</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Est. Monthly Income ({minH}–{maxH} hrs/wk):{" "}
                    <span className="text-foreground">{formatUSD(monthlyMin)} – {formatUSD(monthlyMax)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Covers: <span className="text-foreground">{coverMonths} months of living costs</span>
                  </p>
                  {calc.gap < 0 && (
                    <p className="text-xs text-muted-foreground">
                      Gap reduction: Shortfall shrinks from{" "}
                      <span className="text-red-400">{formatUSD(Math.abs(calc.gap))}</span> to{" "}
                      <span className={newGap >= 0 ? "text-emerald-400" : "text-amber-400"}>
                        {newGap >= 0 ? formatUSD(0) : formatUSD(Math.abs(newGap))}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#2D3748] bg-muted/20 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Working part-time could reduce your financial gap by up to{" "}
          <span className="font-bold text-[#10B981]">{formatUSD(maxAnnualReduction)}</span>{" "}
          over your first year.
        </p>
      </div>
    </div>
  );
}
