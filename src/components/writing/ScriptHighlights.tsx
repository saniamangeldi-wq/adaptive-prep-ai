import { useMemo } from "react";
import type { CriterionKey, InlineIssue } from "@ielts/contract.ts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { splitScript } from "@/lib/ielts/segments";
import { criterionLabel, errorTagLabel } from "@/lib/ielts/labels";

export const CRITERION_COLORS: Record<CriterionKey, string> = {
  task: "#a78bfa",
  coherence: "#60a5fa",
  lexical: "#fbbf24",
  grammar: "#f87171",
};

function IssueDetail({ issue, taskType }: { issue: InlineIssue; taskType?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: CRITERION_COLORS[issue.criterion] ?? CRITERION_COLORS.grammar }} aria-hidden="true" />
        <span className="text-muted-foreground">{criterionLabel(issue.criterion, taskType)} · {errorTagLabel(issue.tag)}</span>
      </p>
      {issue.quote && <p className="text-sm text-foreground">“{issue.quote}”</p>}
      {issue.explanation && <p className="text-sm text-foreground">{issue.explanation}</p>}
      {issue.suggestion && (
        <p className="text-sm">
          <span className="text-muted-foreground">Try: </span>
          <span className="text-primary font-medium">{issue.suggestion}</span>
        </p>
      )}
    </div>
  );
}

export function IssueList({ items, taskType }: { items: Array<{ index: number; issue: InlineIssue }>; taskType?: string }) {
  return (
    <ul className="space-y-3">
      {items.map(({ index, issue }) => (
        <li key={index} className="rounded-lg border border-border bg-muted/20 p-3">
          <IssueDetail issue={issue} taskType={taskType} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The student's script with issues highlighted. Tap or click a highlight to read the
 * explanation and suggested wording. Issues without a place in the text are listed below.
 */
export function ScriptHighlights({ script, issues, taskType }: { script: string; issues: InlineIssue[]; taskType?: string }) {
  const { segments, unlocated } = useMemo(() => splitScript(script, issues), [script, issues]);
  const safeIssues = Array.isArray(issues) ? issues : [];

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Highlight colours">
        {(Object.keys(CRITERION_COLORS) as CriterionKey[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: CRITERION_COLORS[k] }} aria-hidden="true" />
            {criterionLabel(k, taskType)}
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-border bg-card p-4 whitespace-pre-wrap break-words leading-8 text-foreground text-[15px]">
        {segments.map((seg) => {
          if (seg.issueIndexes.length === 0) return <span key={seg.start}>{seg.text}</span>;
          const first = safeIssues[seg.issueIndexes[0]];
          const color = CRITERION_COLORS[first?.criterion] ?? CRITERION_COLORS.grammar;
          return (
            <Popover key={seg.start}>
              <PopoverTrigger asChild>
                <mark
                  role="button"
                  tabIndex={0}
                  aria-label={`Comment on “${seg.text.slice(0, 40)}”: ${seg.issueIndexes.map((i) => errorTagLabel(safeIssues[i]?.tag)).join(", ")}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                  className="cursor-pointer rounded-sm px-0.5 text-foreground underline decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ background: `${color}26`, textDecorationColor: color }}
                >
                  {seg.text}
                </mark>
              </PopoverTrigger>
              <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] space-y-3 max-h-[60vh] overflow-y-auto" align="start">
                {seg.issueIndexes.map((i) => (safeIssues[i] ? <IssueDetail key={i} issue={safeIssues[i]} taskType={taskType} /> : null))}
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {unlocated.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Other comments</h3>
          <p className="text-xs text-muted-foreground">These could not be matched to a place in your text.</p>
          <IssueList items={unlocated} taskType={taskType} />
        </div>
      )}
    </div>
  );
}
