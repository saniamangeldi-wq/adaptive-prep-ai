import { cn } from "@/lib/utils";
import type { WordTimestamp } from "../LessonPlayer";

interface AudioEmphasis {
  rhetorical_questions: string[];
  analogies: string[];
  rhythm_phrases: string[];
}

interface AuditorySlideProps {
  slide: {
    heading: string;
    subheading?: string;
    bullets?: string[];
    highlight_terms?: string[];
    audio_emphasis?: AudioEmphasis;
  };
  isNarrating: boolean;
  narrationProgress: number;
  currentTime: number;
  wordTimestamps: WordTimestamp[];
  getBulletState: (idx: number) => "visible" | "revealed" | "active" | "hidden";
  renderBulletContent: (bullet: string, idx: number, state: string) => React.ReactNode;
}

export function AuditorySlide({
  slide,
  isNarrating,
  narrationProgress,
  getBulletState,
  renderBulletContent,
}: AuditorySlideProps) {
  const emphasis = slide.audio_emphasis;
  const bullets = slide.bullets || [];

  // Interleave bullets with rhetorical questions
  const rhetoricalQs = emphasis?.rhetorical_questions || [];
  let qIdx = 0;

  return (
    <div className="space-y-4 h-full max-w-2xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-foreground">{slide.heading}</h2>
      {slide.subheading && <p className="text-sm text-muted-foreground">{slide.subheading}</p>}

      {/* Conversational paragraphs instead of bullet list */}
      <div className="space-y-4">
        {bullets.map((bullet, i) => {
          const state = getBulletState(i);
          const showQuestion = rhetoricalQs[qIdx] && (i + 1) % 2 === 0;

          return (
            <div key={i}>
              <p
                className={cn(
                  "text-sm md:text-base leading-relaxed transition-all duration-500",
                  state === "hidden" && "opacity-0 translate-y-2",
                  state === "active" && "opacity-100 text-foreground",
                  state === "revealed" && "opacity-70 text-foreground/80",
                  state === "visible" && "opacity-100 text-foreground"
                )}
              >
                {renderBulletContent(bullet, i, state)}
              </p>

              {/* Rhetorical question after every 2nd bullet */}
              {showQuestion && (() => {
                const q = rhetoricalQs[qIdx++];
                return (
                  <div className={cn(
                    "mt-3 mb-1 flex items-start gap-2 transition-all duration-500",
                    state === "revealed" || state === "visible" ? "opacity-100" : "opacity-0"
                  )}>
                    <span className="text-primary text-lg">?</span>
                    <p className="text-base md:text-lg italic text-primary font-medium leading-snug">{q}</p>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Analogies */}
      {emphasis?.analogies && emphasis.analogies.length > 0 && (
        <div className="space-y-2">
          {emphasis.analogies.map((analogy, i) => (
            <div
              key={i}
              className={cn(
                "border-l-4 border-accent bg-accent/10 italic p-3 rounded-r-lg text-sm text-foreground transition-all duration-500",
                narrationProgress > 0.4 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[-8px]"
              )}
              style={{ transitionDelay: `${i * 200}ms` }}
            >
              {analogy}
            </div>
          ))}
        </div>
      )}

      {/* Rhythm phrases */}
      {emphasis?.rhythm_phrases && emphasis.rhythm_phrases.length > 0 && (
        <div className={cn(
          "flex flex-wrap gap-2 pt-2 transition-all duration-700",
          narrationProgress > 0.7 ? "opacity-100" : "opacity-0"
        )}>
          {emphasis.rhythm_phrases.map((phrase, i) => (
            <span
              key={i}
              className="inline-block bg-primary/10 text-primary font-bold text-sm px-3 py-1.5 rounded-lg border border-primary/20"
            >
              {phrase}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
