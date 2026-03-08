import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Bookmark,
  BarChart3,
  X,
  Star,
  DollarSign,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortlistMatch {
  id: string;
  university: {
    name: string;
    country: string;
    acceptance_rate: number | null;
    tuition_usd: number | null;
    ranking_global: number | null;
  };
  match_score: number;
}

interface ShortlistPanelProps {
  savedMatches: ShortlistMatch[];
  onRemove: (matchId: string) => void;
}

function formatCurrency(amount: number | null) {
  if (!amount) return "N/A";
  return `$${Math.round(amount / 1000)}K`;
}

export function ShortlistPanel({ savedMatches, onRemove }: ShortlistPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [comparing, setComparing] = useState<string[]>([]);

  if (savedMatches.length === 0) return null;

  const toggleCompare = (id: string) => {
    setComparing((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const compareItems = savedMatches.filter((m) => comparing.includes(m.id));

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            My Shortlist
          </span>
          <Badge variant="secondary" className="text-[11px]">
            {savedMatches.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Compact horizontal cards */}
          <div className="p-4 space-y-2">
            {savedMatches.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-colors",
                  comparing.includes(m.id)
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30"
                )}
              >
                <button
                  onClick={() => toggleCompare(m.id)}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    comparing.includes(m.id)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {comparing.includes(m.id) && (
                    <span className="text-[10px] text-primary-foreground font-bold">
                      ✓
                    </span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.university.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.university.country} · {Math.round(m.match_score)}% match
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => onRemove(m.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Select up to 3 to compare side-by-side
            </p>
          </div>

          {/* Comparison Matrix */}
          {compareItems.length >= 2 && (
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Comparison
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 text-xs text-muted-foreground font-medium">
                        Metric
                      </th>
                      {compareItems.map((m) => (
                        <th
                          key={m.id}
                          className="text-center py-2 px-2 text-xs font-medium text-foreground"
                        >
                          {m.university.name.length > 15
                            ? m.university.name.slice(0, 15) + "…"
                            : m.university.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        Match %
                      </td>
                      {compareItems.map((m) => (
                        <td
                          key={m.id}
                          className="text-center py-2 px-2 text-xs font-medium text-foreground"
                        >
                          {Math.round(m.match_score)}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        Accept Rate
                      </td>
                      {compareItems.map((m) => (
                        <td
                          key={m.id}
                          className="text-center py-2 px-2 text-xs text-foreground"
                        >
                          {m.university.acceptance_rate
                            ? `${m.university.acceptance_rate}%`
                            : "N/A"}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        Tuition
                      </td>
                      {compareItems.map((m) => (
                        <td
                          key={m.id}
                          className="text-center py-2 px-2 text-xs text-foreground"
                        >
                          {formatCurrency(m.university.tuition_usd)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        Ranking
                      </td>
                      {compareItems.map((m) => (
                        <td
                          key={m.id}
                          className="text-center py-2 px-2 text-xs text-foreground"
                        >
                          {m.university.ranking_global
                            ? `#${m.university.ranking_global}`
                            : "N/A"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
