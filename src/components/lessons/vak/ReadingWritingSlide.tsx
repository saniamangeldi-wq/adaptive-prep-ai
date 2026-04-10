import { cn } from "@/lib/utils";
import type { WordTimestamp } from "../LessonPlayer";

interface NotesLayout {
  summary_sentence: string;
  key_terms: Array<{ term: string; definition: string }>;
  structured_notes: Array<{ heading: string; sub_points: string[] }>;
  memory_tip: string;
}

interface ReadingWritingSlideProps {
  slide: {
    heading: string;
    subheading?: string;
    bullets?: string[];
    highlight_terms?: string[];
    notes_layout?: NotesLayout;
  };
  isNarrating: boolean;
  narrationProgress: number;
  currentTime: number;
  wordTimestamps: WordTimestamp[];
  getBulletState: (idx: number) => "visible" | "revealed" | "active" | "hidden";
  renderBulletContent: (bullet: string, idx: number, state: string) => React.ReactNode;
}

export function ReadingWritingSlide({
  slide,
  isNarrating,
  narrationProgress,
  getBulletState,
  renderBulletContent,
}: ReadingWritingSlideProps) {
  const notes = slide.notes_layout;

  return (
    <div className="flex gap-5 h-full">
      {/* Left panel: structured outline (60%) */}
      <div className="flex-[3] space-y-3 min-w-0">
        <h2 className="text-lg font-bold text-foreground leading-snug">{slide.heading}</h2>
        {slide.subheading && <p className="text-xs text-muted-foreground">{slide.subheading}</p>}

        {/* Render bullets as structured outline with indentation */}
        {slide.bullets && slide.bullets.length > 0 && (
          <div className="space-y-2">
            {slide.bullets.map((bullet, i) => {
              const state = getBulletState(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "pl-4 border-l-2 transition-all duration-500 leading-relaxed text-sm",
                    state === "hidden" && "opacity-0 border-transparent",
                    state === "active" && "opacity-100 border-primary bg-primary/5 rounded-r px-3 py-1",
                    state === "revealed" && "opacity-70 border-muted-foreground/30",
                    state === "visible" && "opacity-100 border-muted-foreground/20"
                  )}
                >
                  {renderBulletContent(bullet, i, state)}
                </div>
              );
            })}
          </div>
        )}

        {/* Structured notes from notes_layout */}
        {notes?.structured_notes && notes.structured_notes.length > 0 && (
          <div className="space-y-2 mt-3">
            {notes.structured_notes.map((section, i) => (
              <div key={i} className="space-y-1">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">{section.heading}</h4>
                <ul className="pl-4 space-y-0.5">
                  {section.sub_points.map((point, j) => (
                    <li key={j} className="text-xs text-foreground/80 leading-relaxed list-disc">{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel: Cornell Notes sidebar (40%) */}
      {notes && (
        <div className="flex-[2] flex flex-col gap-3 min-w-0">
          {/* Summary */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
            <p className="text-xs font-semibold text-primary mb-1">Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{notes.summary_sentence}</p>
          </div>

          {/* Key terms */}
          <div className="flex-1 space-y-0 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Key Terms</p>
            {notes.key_terms.map((item, i) => (
              <div key={i} className="py-2 border-b border-border last:border-0">
                <span className="text-xs font-bold text-foreground">{item.term}</span>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.definition}</p>
              </div>
            ))}
          </div>

          {/* Memory tip */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <div className="flex items-start gap-1.5">
              <span className="text-sm">💡</span>
              <p className="text-xs text-foreground leading-relaxed">{notes.memory_tip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
