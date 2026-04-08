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
  highlightedTerms?: string[];
}

function highlightText(text: string, terms: string[]) {
  if (!terms.length) return text;
  const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (terms.some(t => t.toLowerCase() === part.toLowerCase())) {
      return (
        <span key={i} className="text-primary font-semibold bg-primary/10 px-1 rounded">
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
  highlightedTerms = [],
}: LessonSlideProps) {
  const allHighlights = [...(slide.highlight_terms || []), ...highlightedTerms];

  return (
    <div
      className={cn(
        "w-full aspect-video rounded-xl border border-border bg-card overflow-hidden relative flex flex-col transition-all duration-500",
        isActive ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute inset-0"
      )}
    >
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
            <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
              {highlightText(slide.heading, allHighlights)}
            </h1>
            {slide.subheading && (
              <p className="text-base md:text-lg text-muted-foreground">
                {slide.subheading}
              </p>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {slide.bullets.map((b, i) => (
                  <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                    {b}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 max-w-2xl mx-auto w-full">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {highlightText(slide.heading, allHighlights)}
            </h2>

            {slide.subheading && (
              <p className="text-sm text-muted-foreground">{slide.subheading}</p>
            )}

            {slide.equation && (
              <div className="bg-muted/50 border border-border rounded-lg px-6 py-4 text-center">
                <code className="text-lg md:text-xl font-mono text-primary font-semibold">
                  {slide.equation}
                </code>
              </div>
            )}

            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="space-y-3">
                {slide.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm md:text-base text-foreground leading-relaxed">
                      {highlightText(bullet, allHighlights)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {slide.code_snippet && (
              <pre className="bg-muted border border-border rounded-lg p-4 text-sm font-mono text-foreground overflow-x-auto">
                {slide.code_snippet}
              </pre>
            )}

            {slide.note && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-2">
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
