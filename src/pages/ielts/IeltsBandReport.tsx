import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { IeltsWritingReport } from "@/lib/ielts";

const CRITERIA: { key: keyof IeltsWritingReport["criteria"]; label: string }[] = [
  { key: "task_achievement", label: "Task achievement / response" },
  { key: "coherence_cohesion", label: "Coherence and cohesion" },
  { key: "lexical_resource", label: "Lexical resource" },
  { key: "grammatical_range_accuracy", label: "Grammatical range and accuracy" },
];

/** Examiner-style band report for a submitted IELTS writing answer. */
export function IeltsBandReport({ report }: { report: IeltsWritingReport }) {
  return (
    <Card className="space-y-5 border-primary/40 bg-primary/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Overall band</p>
          <p className="text-4xl font-bold text-primary">{report.overall_band.toFixed(1)}</p>
        </div>
        <Badge variant="secondary">{report.word_count} words</Badge>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        {CRITERIA.map(({ key, label }) => {
          const item = report.criteria[key];
          return (
            <div key={key} className="space-y-1 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <span className="text-lg font-bold text-primary">{item.band.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.comment}</p>
            </div>
          );
        })}
      </div>

      {report.strengths.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">What worked</p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            {report.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {report.improvements.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">What to fix next</p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            {report.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {report.corrections.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Line-by-line corrections</p>
          {report.corrections.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 text-sm">
              <p className="text-destructive line-through">{c.original}</p>
              <p className="text-foreground">{c.suggestion}</p>
              <p className="mt-1 text-muted-foreground">{c.reason}</p>
            </div>
          ))}
        </div>
      )}

      {report.model_answer && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">Model answer</p>
          <p className="whitespace-pre-line rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
            {report.model_answer}
          </p>
        </div>
      )}
    </Card>
  );
}

export default IeltsBandReport;
