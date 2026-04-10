import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { WordTimestamp } from "./LessonPlayer";

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
  narrationProgress?: number;
  isNarrating?: boolean;
  currentTime?: number;
  wordTimestamps?: WordTimestamp[];
}

/** Normalize a word for fuzzy matching */
function normalize(w: string) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Find the timestamp range for a bullet by matching its first few words
 * against the word timestamps array. Returns { start, end } indices into wordTimestamps.
 */
function findBulletTimestampRange(
  bulletText: string,
  wordTimestamps: WordTimestamp[],
  searchStartIdx: number
): { startIdx: number; endIdx: number } | null {
  const bulletWords = bulletText.split(/\s+/).filter(Boolean);
  if (bulletWords.length === 0 || wordTimestamps.length === 0) return null;

  // Match first 3 words of the bullet against wordTimestamps
  const matchWords = bulletWords.slice(0, Math.min(3, bulletWords.length)).map(normalize);

  for (let i = searchStartIdx; i < wordTimestamps.length; i++) {
    let matched = true;
    for (let j = 0; j < matchWords.length; j++) {
      if (i + j >= wordTimestamps.length) { matched = false; break; }
      if (normalize(wordTimestamps[i + j].word) !== matchWords[j]) { matched = false; break; }
    }
    if (matched) {
      // Found the start. Now find the end by matching last few words or using next bullet's start.
      const lastWords = bulletWords.slice(-Math.min(3, bulletWords.length)).map(normalize);
      let endIdx = i + bulletWords.length - 1; // estimate

      // Try to find exact end by matching last words
      for (let k = Math.min(i + bulletWords.length + 10, wordTimestamps.length - 1); k >= i + matchWords.length; k--) {
        let endMatched = true;
        for (let j = 0; j < lastWords.length; j++) {
          const checkIdx = k - lastWords.length + 1 + j;
          if (checkIdx < 0 || checkIdx >= wordTimestamps.length) { endMatched = false; break; }
          if (normalize(wordTimestamps[checkIdx].word) !== lastWords[j]) { endMatched = false; break; }
        }
        if (endMatched) {
          endIdx = k;
          break;
        }
      }

      return { startIdx: i, endIdx: Math.min(endIdx, wordTimestamps.length - 1) };
    }
  }
  return null;
}

/** Map all bullets to their timestamp ranges */
function mapBulletsToTimestamps(
  bullets: string[],
  wordTimestamps: WordTimestamp[]
): Array<{ startIdx: number; endIdx: number; startTime: number; endTime: number } | null> {
  const ranges: Array<{ startIdx: number; endIdx: number; startTime: number; endTime: number } | null> = [];
  let searchFrom = 0;
  for (const bullet of bullets) {
    const range = findBulletTimestampRange(bullet, wordTimestamps, searchFrom);
    if (range) {
      ranges.push({
        ...range,
        startTime: wordTimestamps[range.startIdx].start,
        endTime: wordTimestamps[range.endIdx].end,
      });
      searchFrom = range.endIdx + 1;
    } else {
      ranges.push(null);
    }
  }
  return ranges;
}

/** Render text with word-level highlighting */
function WordHighlightedText({
  text,
  highlightTerms,
  isActive,
  currentTime,
  wordTimestamps,
  rangeStartIdx,
}: {
  text: string;
  highlightTerms: string[];
  isActive: boolean;
  currentTime: number;
  wordTimestamps: WordTimestamp[];
  rangeStartIdx: number;
}) {
  const words = text.split(/(\s+)/); // keep spaces
  let tsIdx = rangeStartIdx;

  return (
    <>
      {words.map((segment, i) => {
        if (/^\s+$/.test(segment)) return <span key={i}>{segment}</span>;

        const currentTsIdx = tsIdx;
        tsIdx++;

        const ts = wordTimestamps[currentTsIdx];
        const isSpoken = ts && currentTime >= ts.start && currentTime < ts.end;
        const isHighlightTerm = highlightTerms.some(
          t => normalize(t) === normalize(segment)
        );

        return (
          <span
            key={i}
            className={cn(
              "transition-colors duration-100 rounded px-0.5",
              isSpoken && "bg-primary/20 text-primary font-semibold",
              isHighlightTerm && "font-semibold text-primary",
              isHighlightTerm && isActive && "bg-primary/15 scale-105 inline-block",
              isHighlightTerm && isSpoken && "bg-primary/30 text-primary ring-1 ring-primary/40"
            )}
          >
            {segment}
          </span>
        );
      })}
    </>
  );
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
  currentTime = 0,
  wordTimestamps = [],
}: LessonSlideProps) {
  const allHighlights = slide.highlight_terms || [];
  const bulletCount = slide.bullets?.length || 1;
  const hasWordTimestamps = wordTimestamps.length > 0;

  // Map bullets to their timestamp ranges (memoized)
  const bulletRanges = useMemo(() => {
    if (!hasWordTimestamps || !slide.bullets?.length) return [];
    return mapBulletsToTimestamps(slide.bullets, wordTimestamps);
  }, [slide.bullets, wordTimestamps, hasWordTimestamps]);

  // Fallback: approximate bullet states from narrationProgress
  const headingDone = narrationProgress > 0.12;
  const bulletProgress = Math.max(0, (narrationProgress - 0.12) / 0.88);
  const fallbackActiveBulletIndex = Math.floor(bulletProgress * bulletCount);
  const equationProgress = narrationProgress > 0.6;

  const getBulletState = (idx: number): "visible" | "revealed" | "active" | "hidden" => {
    if (!isNarrating && narrationProgress === 0) return "visible";
    if (!isNarrating && narrationProgress > 0) return "revealed";

    if (hasWordTimestamps) {
      const range = bulletRanges[idx];
      if (!range) {
        // No timestamp match — use fallback
        if (idx < fallbackActiveBulletIndex) return "revealed";
        if (idx === fallbackActiveBulletIndex) return "active";
        return "hidden";
      }
      if (currentTime >= range.endTime) return "revealed";
      if (currentTime >= range.startTime) return "active";
      return "hidden";
    }

    // Fallback: evenly spaced
    if (idx < fallbackActiveBulletIndex) return "revealed";
    if (idx === fallbackActiveBulletIndex) return "active";
    return "hidden";
  };

  // Equation reveal based on word timestamps or fallback
  const isEquationRevealed = useMemo(() => {
    if (!slide.equation) return false;
    if (!isNarrating) return narrationProgress > 0 || narrationProgress === 0;

    if (hasWordTimestamps) {
      // Find equation trigger in narration by looking for equation-related words
      const eqWords = slide.equation.split(/\s+/).slice(0, 2).map(normalize);
      for (let i = 0; i < wordTimestamps.length; i++) {
        if (eqWords[0] && normalize(wordTimestamps[i].word) === eqWords[0]) {
          return currentTime >= wordTimestamps[i].start;
        }
      }
      return equationProgress;
    }
    return equationProgress;
  }, [slide.equation, isNarrating, narrationProgress, hasWordTimestamps, wordTimestamps, currentTime, equationProgress]);

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
                isNarrating && isEquationRevealed
                  ? "border-primary/40 bg-primary/5 scale-[1.02] opacity-100"
                  : isNarrating ? "opacity-40" : "opacity-100"
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
                  const range = bulletRanges[i];
                  const useWordHighlight = hasWordTimestamps && range && state === "active";

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
                        {useWordHighlight ? (
                          <WordHighlightedText
                            text={bullet}
                            highlightTerms={allHighlights}
                            isActive={state === "active"}
                            currentTime={currentTime}
                            wordTimestamps={wordTimestamps}
                            rangeStartIdx={range.startIdx}
                          />
                        ) : (
                          highlightText(bullet, allHighlights, state === "active")
                        )}
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
