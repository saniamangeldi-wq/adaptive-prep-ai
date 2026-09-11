import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { IeltsWritingReport } from "@/lib/ielts";

const CRITERIA: { key: keyof IeltsWritingReport["criteria"]; fallback: string }[] = [
  { key: "task", fallback: "Task achievement / response" },
  { key: "coherence", fallback: "Coherence and cohesion" },
  { key: "lexical", fallback: "Lexical resource" },
  { key: "grammar", fallback: "Grammatical range and accuracy" },
];

/** Examiner-style band report for a submitted IELTS writing answer. */
export function IeltsBandReport({ report }: { report: IeltsWritingReport }) {
  const { comments } = report;

  return (
    <Card className="space-y-5 border-primary/40 bg-primary/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Overall band</p>
          <p className="text-4xl font-bold text-primary">{report.overall.toFixed(1)}</p>
        </div>
        <Badge variant="secondary">{report.wordCount} words</Badge>
      </div>

      {comments?.summary && <p className="text-sm text-foreground">{comments.summary}</p>}

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        {CRITERIA.map(({ key, fallback }) => {
          const item = report.criteria?.[key];
          if (!item) return null;
          return (
            <div key={key} className="space-y-1 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{item.label || fallback}</p>
                <span className="text-lg font-bold text-primary">{item.band.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.comment}</p>
            </div>
          );
        })}
      </div>

      {comments?.strengths?.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">What worked</p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            {comments.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {comments?.improvements?.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">What to fix next</p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            {comments.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {comments?.corrections?.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Line-by-line corrections</p>
          {comments.corrections.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 text-sm">
              <p className="text-destructive line-through">{c.original}</p>
              <p className="text-foreground">{c.suggestion}</p>
              <p className="mt-1 text-muted-foreground">{c.reason}</p>
            </div>
          ))}
        </div>
      )}

      {report.modelAnswer && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">Model answer</p>
          <p className="whitespace-pre-line rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
            {report.modelAnswer}
          </p>
        </div>
      )}
    </Card>
  );
}

export default IeltsBandReport;
