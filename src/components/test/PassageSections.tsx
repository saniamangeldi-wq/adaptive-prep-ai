import { MathRenderer } from "@/components/MathRenderer";
import { splitPassages } from "@/lib/rw-structure";

interface PassageSectionsProps {
  text: string;
  questionId?: string;
  className?: string;
}

/**
 * Renders Reading & Writing prose. When the source merges "Text 1" and
 * "Text 2" into one blob, each passage is rendered as its own labeled section
 * with proper spacing. Wording is never altered.
 */
export function PassageSections({ text, questionId, className }: PassageSectionsProps) {
  const sections = splitPassages(text);

  if (sections.length === 1 && !sections[0].label) {
    return (
      <MathRenderer
        as="div"
        className={className ?? "text-lg text-foreground leading-relaxed whitespace-pre-line"}
        text={sections[0].body}
        questionId={questionId}
      />
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) =>
        section.label ? (
          <section
            key={i}
            aria-label={section.label}
            className="rounded-xl border border-border/60 bg-muted/30 p-4"
          >
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </h3>
            <MathRenderer
              as="div"
              className="text-foreground leading-relaxed whitespace-pre-line"
              text={section.body}
              questionId={questionId}
            />
          </section>
        ) : (
          <MathRenderer
            key={i}
            as="div"
            className={className ?? "text-lg text-foreground leading-relaxed whitespace-pre-line"}
            text={section.body}
            questionId={questionId}
          />
        )
      )}
    </div>
  );
}

export default PassageSections;
