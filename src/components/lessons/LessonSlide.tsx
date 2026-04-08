import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SlideData {
  slide_type: "title" | "content" | "example" | "summary";
  heading: string;
  subheading?: string;
  bullets?: string[];
  highlight_terms?: string[];
  equation?: string;
  code_snippet?: string;
  note?: string;
}

interface LessonSlideProps {
  slide: SlideData;
  sectionTitle: string;
  slideIndex: number;
  totalSlides: number;
  isActive: boolean;
  /** 0-1 progress through this slide's narration */
  narrationProgress?: number;
  /** Whether narration is currently playing */
  isNarrating?: boolean;
}

function highlightText(text: string, terms: string[], isActive: boolean) {
  if (!terms.length) return text;
  const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (terms.some(t => t.toLowerCase() === part.toLowerCase())) {
      return (
        <span
          key={i}
          className={cn(
            "font-semibold px-1 rounded transition-all duration-500",
            isActive
              ? "text-primary bg-primary/15 scale-105 inline-block"
              : "text-primary/60 bg-primary/5"
          )}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function LessonSlide({
  slide,
  sectionTitle,
  slideIndex,
  totalSlides,
  isActive,
  narrationProgress = 0,
  isNarrating = false,
}: LessonSlideProps) {
  const allHighlights = slide.highlight_terms || [];
  const bulletCount = slide.bullets?.length || 1;

  // Calculate which bullet is "active" based on narration progress
  // First ~15% is heading, rest is split among bullets + extras
  const headingDone = narrationProgress > 0.12;
  const bulletProgress = Math.max(0, (narrationProgress - 0.12) / 0.88);
  const activeBulletIndex = Math.floor(bulletProgress * bulletCount);
  const equationProgress = narrationProgress > 0.6;

  const getBulletState = (idx: number) => {
    if (!isNarrating && narrationProgress === 0) return "visible"; // no narration, show all
    if (!isNarrating && narrationProgress > 0) return "revealed"; // paused mid-way
    if (idx < activeBulletIndex) return "revealed";
    if (idx === activeBulletIndex) return "active";
    return "hidden";
  };

  return (
    <div
      className={cn(
        "w-full aspect-video rounded-xl border border-border bg-card overflow-hidden relative flex flex-col transition-all duration-500",
        isActive ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute inset-0 pointer-events-none"
      )}
    >
      {/* Narration progress bar at top */}
      {isActive && narrationProgress > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-10">
          <div
            className="h-full bg-primary transition-all duration-200 ease-linear rounded-r-full"
            style={{ width: `${narrationProgress * 100}%` }}
          />
        </div>
      )}

      {/* Slide header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-muted/30">
        <span className="text-xs text-muted-foreground font-medium">{sectionTitle}</span>
        <span className="text-xs text-muted-foreground">
          {slideIndex + 1} / {totalSlides}
        </span>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-6 md:py-8">
        {slide.slide_type === "title" ? (
          <div className="text-center space-y-4">
            <h1
              className={cn(
                "text-2xl md:text-4xl font-bold text-foreground leading-tight transition-all duration-700",
                isNarrating && !headingDone ? "scale-[1.02]" : ""
              )}
            >
              {highlightText(slide.heading, allHighlights, isNarrating && !headingDone)}
            </h1>
            {slide.subheading && (
              <p className={cn(
                "text-base md:text-lg text-muted-foreground transition-opacity duration-500",
                isNarrating && narrationProgress < 0.3 ? "opacity-50" : "opacity-100"
              )}>
                {slide.subheading}
              </p>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {slide.bullets.map((b, i) => {
                  const state = getBulletState(i);
                  return (
                    <Badge
                      key={i}
                      variant="secondary"
                      className={cn(
                        "text-sm px-3 py-1 transition-all duration-500",
                        state === "hidden" && "opacity-0 translate-y-2",
                        state === "active" && "ring-2 ring-primary/40 bg-primary/10 scale-105",
                        state === "revealed" && "opacity-100",
                        state === "visible" && "opacity-100"
                      )}
                    >
                      {b}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 max-w-2xl mx-auto w-full">
            <h2
              className={cn(
                "text-xl md:text-2xl font-bold text-foreground transition-all duration-500",
                isNarrating && !headingDone
                  ? "text-primary"
                  : "text-foreground"
              )}
            >
              {highlightText(slide.heading, allHighlights, isNarrating && !headingDone)}
            </h2>

            {slide.subheading && (
              <p className="text-sm text-muted-foreground">{slide.subheading}</p>
            )}

            {slide.equation && (
              <div className={cn(
                "bg-muted/50 border border-border rounded-lg px-6 py-4 text-center transition-all duration-700",
                isNarrating && equationProgress
                  ? "border-primary/40 bg-primary/5 scale-[1.02]"
                  : "",
                isNarrating && !equationProgress ? "opacity-40" : "opacity-100"
              )}>
                <code className="text-lg md:text-xl font-mono text-primary font-semibold">
                  {slide.equation}
                </code>
              </div>
            )}

            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="space-y-3">
                {slide.bullets.map((bullet, i) => {
                  const state = getBulletState(i);
                  return (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-3 transition-all duration-500",
                        state === "hidden" && "opacity-0 translate-x-[-8px]",
                        state === "active" && "opacity-100 translate-x-0",
                        state === "revealed" && "opacity-70 translate-x-0",
                        state === "visible" && "opacity-100 translate-x-0"
                      )}
                    >
                      <span className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0 transition-all duration-500",
                        state === "active" ? "bg-primary scale-150 ring-4 ring-primary/20" : "bg-primary/50"
                      )} />
                      <span className={cn(
                        "text-sm md:text-base leading-relaxed transition-all duration-500",
                        state === "active" ? "text-foreground font-medium" : "text-foreground/80"
                      )}>
                        {highlightText(bullet, allHighlights, state === "active")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {slide.code_snippet && (
              <pre className={cn(
                "bg-muted border border-border rounded-lg p-4 text-sm font-mono text-foreground overflow-x-auto transition-opacity duration-500",
                isNarrating && narrationProgress < 0.5 ? "opacity-30" : "opacity-100"
              )}>
                {slide.code_snippet}
              </pre>
            )}

            {slide.note && (
              <div className={cn(
                "bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-2 transition-all duration-700",
                isNarrating && narrationProgress > 0.85
                  ? "opacity-100 translate-y-0 border-primary/40"
                  : isNarrating ? "opacity-0 translate-y-2" : "opacity-100"
              )}>
                <span className="text-primary text-sm">💡</span>
                <p className="text-sm text-foreground">{slide.note}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
