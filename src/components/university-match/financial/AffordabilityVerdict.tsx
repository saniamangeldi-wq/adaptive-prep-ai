import { FinancialCalculations } from "./types";
import { formatUSD, formatTenge, usdToTenge } from "./financialCalculations";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  calc: FinancialCalculations;
}

export function AffordabilityVerdict({ calc }: Props) {
  const rows = [
    { label: "First-year tuition", usd: calc.firstYearTuition },
    { label: "Living costs (12 months)", usd: calc.monthlyLivingCosts * 12 },
    { label: "Emergency buffer (3 months)", usd: calc.emergencyBuffer },
    { label: "Total needed", usd: calc.totalNeeded, bold: true },
    { label: "Your projected savings by enrollment", usd: calc.projectedSavings },
    { label: "Gap", usd: calc.gap, highlight: true },
  ];

  const verdictConfig = {
    on_track: {
      icon: CheckCircle2,
      label: "✅ On Track",
      classes: "bg-emerald-500/20 border-emerald-500 text-emerald-400",
    },
    needs_adjustment: {
      icon: AlertTriangle,
      label: "⚠️ Needs Adjustment",
      classes: "bg-amber-500/20 border-amber-500 text-amber-400",
    },
    significant_gap: {
      icon: XCircle,
      label: "❌ Significant Gap",
      classes: "bg-red-500/20 border-red-500 text-red-400",
    },
  };

  const v = verdictConfig[calc.verdict];

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-[#10B981]">Section 1 — Affordability Verdict</h3>

      {/* Table */}
      <div className="rounded-xl border border-[#2D3748] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3748] bg-muted/20">
              <th className="text-left p-3 text-muted-foreground font-medium">Item</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Amount (USD)</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Amount (₸)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className={cn("border-b border-[#2D3748] last:border-0", row.bold && "bg-muted/10")}>
                <td className={cn("p-3 text-foreground", row.bold && "font-semibold")}>{row.label}</td>
                <td className={cn(
                  "p-3 text-right",
                  row.highlight ? (row.usd >= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground",
                  row.bold && "font-semibold"
                )}>
                  {row.highlight && row.usd >= 0 ? "+" : ""}{formatUSD(row.usd)}
                </td>
                <td className="p-3 text-right text-muted-foreground text-xs">
                  {formatTenge(usdToTenge(Math.abs(row.usd)))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verdict Badge */}
      <div className="flex justify-center">
        <div className={cn("px-6 py-3 rounded-2xl border text-lg font-bold", v.classes)}>
          {v.label}
        </div>
      </div>

      {/* Confidence Score Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Financial Readiness Score</span>
          <span className="text-foreground font-semibold">{calc.confidenceScore}%</span>
        </div>
        <Progress value={calc.confidenceScore} className="h-3 bg-[#2D3748] [&>div]:bg-[#10B981]" />
      </div>
    </div>
  );
}
