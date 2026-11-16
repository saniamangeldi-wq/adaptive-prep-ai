import { CRITERION_COLORS, criterionWash } from "@/components/writing/ScriptHighlights";
import { formatBand } from "@/lib/ielts/labels";
import { SAMPLE } from "./sample";

/**
 * A static copy of the top of a real report and of one opened comment, built with the
 * same markup and colours as the report screen. Labelled as a sample.
 */
export function SampleReport() {
  return (
    <figure className="relative rounded-2xl border border-border bg-card shadow-float">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3 sm:px-5">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sample report</span>
        <span className="text-xs text-muted-foreground">
          {SAMPLE.taskLabel}, {SAMPLE.wordCount} words
        </span>
      </figcaption>

      <div className="grid gap-5 px-4 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 sm:px-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Estimated band</p>
          <p className="mt-1 text-6xl font-bold leading-none tabular-nums tracking-[-0.03em] text-foreground">{formatBand(SAMPLE.overall)}</p>
        </div>
        <ul className="space-y-2.5" aria-label="Estimated band for each criterion">
          {SAMPLE.criteria.map((c) => (
            <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
              <span className="truncate text-sm text-foreground">{c.label}</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{formatBand(c.band)}</span>
              <span className="col-span-2 h-1.5 rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(c.band / 9) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border px-4 pb-5 pt-4 sm:px-5">
        <p className="mb-2 text-sm font-medium text-foreground">Your answer, with comments</p>
        <p className="font-script text-[15px] leading-8 text-foreground">
          {SAMPLE.excerpt.map((seg, i) => {
            if (!seg.mark) return <span key={i}>{seg.text}</span>;
            const color = CRITERION_COLORS[seg.mark];
            return (
              <mark
                key={i}
                className={seg.open ? "sample-mark-draw rounded-sm px-0.5 text-foreground underline decoration-2 underline-offset-4" : "rounded-sm px-0.5 text-foreground underline decoration-2 underline-offset-4"}
                style={
                  seg.open
                    ? { backgroundImage: `linear-gradient(${criterionWash(color)}, ${criterionWash(color)})`, backgroundColor: "transparent", textDecorationColor: color }
                    : { background: criterionWash(color), textDecorationColor: color }
                }
              >
                {seg.text}
              </mark>
            );
          })}
        </p>

        <div className="sample-note-in mt-3 rounded-lg border border-border bg-popover p-4 shadow-float sm:ml-8">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: CRITERION_COLORS[SAMPLE.comment.criterion] }} aria-hidden="true" />
              <span className="text-muted-foreground">{SAMPLE.comment.heading}</span>
            </p>
            <p className="text-sm text-foreground">“{SAMPLE.comment.quote}”</p>
            <p className="text-sm text-foreground">{SAMPLE.comment.explanation}</p>
            <p className="text-sm">
              <span className="text-muted-foreground">Try: </span>
              <span className="font-medium text-primary">{SAMPLE.comment.suggestion}</span>
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}
