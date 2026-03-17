import { FINANCIAL_CONFIG, IntakeData, FinancialCalculations } from "./types";
import { formatTenge, formatUSD, usdToTenge } from "./financialCalculations";
import { cn } from "@/lib/utils";

interface Props {
  intake: IntakeData;
  calc: FinancialCalculations;
}

export function SavingsPlan({ intake, calc }: Props) {
  const CUT_RATE = 0.3;

  const expenseRows = FINANCIAL_CONFIG.expenseCategories
    .filter((cat) => intake.expenses[cat.key] > 0)
    .map((cat) => {
      const monthly = intake.expenses[cat.key];
      const isReducible = cat.classification === "Reducible";
      const suggestedCut = isReducible ? Math.round(monthly * CUT_RATE) : 0;
      const monthlySaving = suggestedCut;
      const yearlySaving = monthlySaving * 12;
      return {
        ...cat,
        monthly,
        suggestedCut,
        monthlySaving,
        yearlySaving,
        isReducible,
      };
    });

  const totalOptimizedMonthly = expenseRows.reduce((s, r) => s + r.monthlySaving, 0);
  const totalOptimizedYearly = totalOptimizedMonthly * 12;
  const totalOptimizedByEnrollment = totalOptimizedMonthly * calc.monthsUntilEnrollment;

  // Month-by-month progress
  const monthLabels: string[] = [];
  const now = new Date();
  for (let i = 0; i < calc.monthsUntilEnrollment; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthLabels.push(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
  }

  const cumulativeSavings = monthLabels.map((_, i) => {
    return calc.currentSavingsUSD + calc.monthlyFamilyContribution * (i + 1);
  });

  const maxVal = Math.max(calc.totalNeeded, cumulativeSavings[cumulativeSavings.length - 1] || 0);
  const targetReachedIdx = cumulativeSavings.findIndex((s) => s >= calc.totalNeeded);

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-[#10B981]">Section 2 — Savings & Spending Plan</h3>

      {/* Expense classification table */}
      <div className="rounded-xl border border-[#2D3748] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2D3748] bg-muted/20">
              <th className="text-left p-2.5 text-muted-foreground">Expense</th>
              <th className="text-right p-2.5 text-muted-foreground">Monthly (₸)</th>
              <th className="text-center p-2.5 text-muted-foreground">Class</th>
              <th className="text-right p-2.5 text-muted-foreground">Suggested Cut</th>
              <th className="text-right p-2.5 text-muted-foreground">Monthly Saving</th>
              <th className="text-right p-2.5 text-muted-foreground">Yearly Saving</th>
            </tr>
          </thead>
          <tbody>
            {expenseRows.map((row) => (
              <tr key={row.key} className="border-b border-[#2D3748] last:border-0">
                <td className="p-2.5 text-foreground">{row.label}</td>
                <td className="p-2.5 text-right text-foreground">{formatTenge(row.monthly)}</td>
                <td className="p-2.5 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    row.isReducible
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {row.classification}
                  </span>
                </td>
                <td className="p-2.5 text-right text-foreground">
                  {row.isReducible ? formatTenge(row.suggestedCut) : "—"}
                </td>
                <td className="p-2.5 text-right text-emerald-400">
                  {row.monthlySaving > 0 ? formatTenge(row.monthlySaving) : "—"}
                </td>
                <td className="p-2.5 text-right text-emerald-400">
                  {row.yearlySaving > 0 ? formatTenge(row.yearlySaving) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Month-by-month progress */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">Month-by-Month Savings Progress</p>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {monthLabels.map((label, i) => {
            const pct = maxVal > 0 ? Math.min(100, (cumulativeSavings[i] / maxVal) * 100) : 0;
            const targetPct = maxVal > 0 ? Math.min(100, (calc.totalNeeded / maxVal) * 100) : 0;
            const reachedTarget = cumulativeSavings[i] >= calc.totalNeeded;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">{label}</span>
                <div className="flex-1 h-4 bg-[#2D3748] rounded relative overflow-hidden">
                  <div
                    className={cn("h-full rounded transition-all", reachedTarget ? "bg-emerald-500" : "bg-[#10B981]/70")}
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-px bg-foreground/50"
                    style={{ left: `${targetPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {targetReachedIdx === -1 && calc.gap < 0 && (
          <p className="text-xs text-red-400">
            Savings never reach the target. Remaining gap: {formatUSD(Math.abs(calc.gap))}
          </p>
        )}
      </div>

      {/* Optimized savings total */}
      {totalOptimizedMonthly > 0 && (
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 text-center">
          <p className="text-sm text-foreground">
            If you follow all recommendations above, you could save an extra{" "}
            <span className="font-bold text-[#10B981]">{formatTenge(totalOptimizedByEnrollment)}</span>
            {" / "}
            <span className="font-bold text-[#10B981]">{formatUSD(totalOptimizedByEnrollment / FINANCIAL_CONFIG.tengeToUSD)}</span>
            {" "}by enrollment.
          </p>
        </div>
      )}
    </div>
  );
}
