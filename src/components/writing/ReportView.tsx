import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, Minus, X } from "lucide-react";
import type { CriterionKey, GradeReport } from "@ielts/contract.ts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CONFIDENCE_TEXT, MET_LABELS, criterionLabel, describeTask, errorTagLabel, flagText, formatBand } from "@/lib/ielts/labels";
import type { LegacyReportView } from "@/lib/ielts/reportRow";
import { cn } from "@/lib/utils";
import { ScriptHighlights } from "./ScriptHighlights";
import { TaskCard } from "./TaskCard";

const CRITERION_ORDER: CriterionKey[] = ["task", "coherence", "lexical", "grammar"];

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="space-y-3" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function BandBar({ band }: { band: number }) {
  const pct = Math.max(0, Math.min(100, (band / 9) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Fold({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-4 text-left font-semibold text-foreground">
        {title}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform flex-shrink-0", open && "rotate-180")} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function BandHeader({ band, meta, children }: { band: number | null; meta: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Estimated band</p>
          <p className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums leading-none mt-1">{formatBand(band)}</p>
        </div>
        <p className="text-sm text-muted-foreground pb-1 min-w-0">{meta}</p>
      </div>
      {children}
    </div>
  );
}

export function FullReportView({ report }: { report: GradeReport }) {
  const task = report.task;
  const taskLabel = describeTask(task.taskType, task.variant);
  const detected = report.variantDetected && report.variantDetected !== task.variant ? describeTask(task.taskType, report.variantDetected) : null;
  const counts = Object.entries(report.errorTagCounts)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  const maxCount = counts.length ? (counts[0][1] as number) : 1;

  return (
    <div className="space-y-8">
      <BandHeader
        band={report.overall}
        meta={`${taskLabel} · ${report.wordCount} words${report.createdAt ? ` · ${new Date(report.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : ""}`}
      >
        <p className={cn("text-sm", report.confidence === "low" ? "text-amber-400" : "text-muted-foreground")}>{CONFIDENCE_TEXT[report.confidence]}</p>
        {(report.flags.length > 0 || detected) && (
          <ul className="space-y-2">
            {report.flags.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-foreground rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{flagText(f)}{f === "wrong_task_variant" && detected ? ` We treated it as: ${detected.toLowerCase()}.` : ""}</span>
              </li>
            ))}
          </ul>
        )}
        {report.summary && <p className="text-foreground leading-relaxed">{report.summary}</p>}
      </BandHeader>

      <Section title="The four criteria" id="criteria">
        <div className="grid gap-3 md:grid-cols-2">
          {CRITERION_ORDER.map((k) => {
            const c = report.criteria[k];
            return (
              <div key={k} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{c.label || criterionLabel(k, task.taskType)}</h3>
                  <span className="text-2xl font-bold tabular-nums text-foreground" aria-label={`Estimated band ${formatBand(c.band)}`}>{formatBand(c.band)}</span>
                </div>
                <BandBar band={c.band} />
                {c.rationale && <p className="text-sm text-foreground leading-relaxed">{c.rationale}</p>}
                {(report.adjustments ?? [])
                  .filter((adj) => adj.criterion === k)
                  .map((adj, i) => (
                    <p key={`adj-${i}`} className="text-sm text-muted-foreground">
                      Capped at {formatBand(adj.to)}
                      {adj.reason ? `: ${adj.reason}` : ""}
                    </p>
                  ))}
                {c.evidence.length > 0 && (
                  <ul className="space-y-1">
                    {c.evidence.map((q, i) => (
                      <li key={i} className="border-l-2 border-primary/50 pl-3 text-sm italic text-muted-foreground">“{q}”</li>
                    ))}
                  </ul>
                )}
                {c.toNextBand && (
                  <p className="text-sm rounded-lg bg-primary/10 p-3 text-foreground">
                    <span className="font-medium">To reach the next half band: </span>
                    {c.toNextBand}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {report.checklist.length > 0 && (
        <Section title="Checklist" id="checklist">
          <ul className="space-y-2">
            {report.checklist.map((item, i) => (
              <li key={item.id || i} className="flex gap-3 rounded-xl border border-border p-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                    item.met === "yes" ? "bg-primary/20 text-primary" : item.met === "partly" ? "bg-amber-500/20 text-amber-400" : "bg-destructive/20 text-destructive"
                  )}
                >
                  {item.met === "yes" ? <Check className="h-4 w-4" aria-hidden="true" /> : item.met === "partly" ? <Minus className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.label} <span className="text-muted-foreground font-normal">· {MET_LABELS[item.met]}</span>
                  </p>
                  {item.note && <p className="text-sm text-muted-foreground">{item.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(report.priorities.length > 0 || report.strengths.length > 0) && (
        <Section title="What to work on first" id="priorities">
          {report.priorities.length > 0 && (
            <ol className="space-y-3">
              {report.priorities.map((p, i) => (
                <li key={i} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <p className="font-semibold text-foreground"><span className="text-primary">{i + 1}.</span> {p.title}</p>
                  {p.why && <p className="text-sm text-muted-foreground">{p.why}</p>}
                  {p.how && <p className="text-sm text-foreground"><span className="font-medium">How: </span>{p.how}</p>}
                </li>
              ))}
            </ol>
          )}
          {report.strengths.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">What worked</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground">
                {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </Section>
      )}

      <Section title="Your answer, with comments" id="script">
        <p className="text-sm text-muted-foreground">Tap or click an underlined passage to read the comment and a suggested rewording.</p>
        <ScriptHighlights script={report.script} issues={report.issues} taskType={task.taskType} />
      </Section>

      {counts.length > 0 && (
        <Section title="Error types" id="errors">
          <ul className="space-y-2">
            {counts.map(([tag, n]) => (
              <li key={tag} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center">
                <span className="text-sm text-foreground truncate">{errorTagLabel(tag)}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{n as number}</span>
                <div className="col-span-2 h-1.5 rounded-full bg-muted" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${((n as number) / maxCount) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.rewrite && (
        <Section title="One paragraph, rewritten" id="rewrite">
          <p className="text-sm text-muted-foreground">One of your paragraphs, rewritten. Your ideas stay the same.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Your paragraph</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{report.rewrite.original}</p>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">Improved</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{report.rewrite.improved}</p>
            </div>
          </div>
          {report.rewrite.changes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">What changed</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground mt-1">
                {report.rewrite.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </Section>
      )}

      {report.modelAnswer && (
        <Fold title="Model answer">
          <p className="text-sm text-muted-foreground mb-3">One way to answer this question. Do not memorise it; use it to see how ideas can be organised.</p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{report.modelAnswer}</p>
        </Fold>
      )}

      <Fold title="The task">
        <TaskCard task={task} />
      </Fold>
    </div>
  );
}

export function LegacyReportViewUi({ view }: { view: LegacyReportView }) {
  return (
    <div className="space-y-8">
      <BandHeader
        band={view.overall}
        meta={`${view.taskTypeLabel} · ${view.wordCount} words${view.createdAt ? ` · ${new Date(view.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : ""}`}
      >
        <p className="text-sm text-muted-foreground">This report was made with an earlier version of the checker, so it has fewer details than newer ones.</p>
        {view.summary && <p className="text-foreground leading-relaxed">{view.summary}</p>}
      </BandHeader>

      <Section title="The four criteria" id="criteria">
        <div className="grid gap-3 md:grid-cols-2">
          {view.criteria.map((c) => (
            <div key={c.key} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-foreground">{c.label}</h3>
                <span className="text-2xl font-bold tabular-nums text-foreground">{formatBand(c.band)}</span>
              </div>
              <BandBar band={c.band} />
              {c.comment && <p className="text-sm text-foreground leading-relaxed">{c.comment}</p>}
            </div>
          ))}
        </div>
      </Section>

      {(view.strengths.length > 0 || view.improvements.length > 0) && (
        <Section title="Feedback" id="feedback">
          {view.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">What worked</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground mt-1">{view.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {view.improvements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">What to improve</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground mt-1">{view.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </Section>
      )}

      {view.corrections.length > 0 && (
        <Section title="Corrections" id="corrections">
          <ul className="space-y-3">
            {view.corrections.map((c, i) => (
              <li key={i} className="rounded-xl border border-border p-3 space-y-1">
                {c.original && <p className="text-sm text-muted-foreground line-through">{c.original}</p>}
                {c.suggestion && <p className="text-sm text-primary font-medium">{c.suggestion}</p>}
                {c.reason && <p className="text-sm text-foreground">{c.reason}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Your answer" id="essay">
        <div className="rounded-xl border border-border bg-card p-4 whitespace-pre-wrap break-words leading-relaxed text-foreground text-[15px]">{view.essay}</div>
      </Section>

      {view.modelAnswer.trim() && (
        <Fold title="Model answer">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{view.modelAnswer}</p>
        </Fold>
      )}

      <Fold title="The task">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{view.taskTypeLabel}</p>
        <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed">{view.prompt}</p>
      </Fold>
    </div>
  );
}
