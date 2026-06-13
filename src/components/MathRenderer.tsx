import { Fragment, useMemo } from "react";
import katex from "katex";

interface MathRendererProps {
  text: string;
  className?: string;
  /** Render wrapper element. Defaults to span. */
  as?: "span" | "div" | "p";
}

type Segment =
  | { type: "text"; content: string }
  | { type: "inline"; content: string }
  | { type: "block"; content: string };

const LATEX_INDICATORS = /\\[a-zA-Z]+|[a-zA-Z0-9][_^][a-zA-Z0-9{(]/;
const LATEX_INDICATOR_SOURCE = String.raw`(?:\\[a-zA-Z]+|[a-zA-Z0-9][_^][a-zA-Z0-9{(])`;
const CONNECTOR_RE = /(\s+(?:and|or)\s+|,\s+)/i;
const CONNECTOR_ONLY_RE = /^(\s+(?:and|or)\s+|,\s+)$/i;
const PROSE_WORD_RE = /(^|[^\\])\b[a-zA-Z]{3,}\b/;
const CONNECTOR_WORD_RE = /\b(?:and|or)\b/i;

function isStandaloneMathExpression(value: string) {
  const trimmed = value.trim();
  return (
    LATEX_INDICATORS.test(trimmed) &&
    !trimmed.includes("$") &&
    !trimmed.includes(":") &&
    !CONNECTOR_WORD_RE.test(trimmed) &&
    !PROSE_WORD_RE.test(trimmed)
  );
}

/**
 * Splits text into math + plain-text segments. Recognises:
 *   $$...$$    block math
 *   $...$      inline math
 *   \[...\]    block math
 *   \(...\)    inline math
 *   (...)      inline math IF content has a LaTeX command (\foo) or sub/superscript (x_1, x^2)
 *   [...]      inline math IF content has a LaTeX command (\foo)
 * Plus: bare LaTeX/scripts (e.g. "x = \dfrac{1}{2}" or "D = b^2 - 4ac")
 * without delimiters are detected and rendered, splitting on English connectors.
 */
function splitIntoSegments(text: string): Segment[] {
  const result: Segment[] = [];
  if (!text) return result;

  if (isStandaloneMathExpression(text)) {
    return [{ type: "inline", content: text.trim() }];
  }

  // Order matters: explicit delimiters first, then heuristic paren/bracket matches.
  const RE = new RegExp(
    String.raw`(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\([^()\n]*${LATEX_INDICATOR_SOURCE}[^()\n]*\)|\[[^\[\]\n]*${LATEX_INDICATOR_SOURCE}[^\[\]\n]*\])`,
    "g"
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushTextLike = (chunk: string) => {
    if (!chunk) return;
    if (!LATEX_INDICATORS.test(chunk)) {
      result.push({ type: "text", content: chunk });
      return;
    }

    // Keep prose before labels such as "Formula:" as text, then render the math tail.
    const labelMatch = chunk.match(/^([\s\S]*?:\s*)([\s\S]*${LATEX_INDICATOR_SOURCE}[\s\S]*)$/);
    if (labelMatch) {
      result.push({ type: "text", content: labelMatch[1] });
      pushTextLike(labelMatch[2]);
      return;
    }

    // Split keeping separators: " and ", " or ", ", "
    const parts = chunk.split(CONNECTOR_RE);
    for (const part of parts) {
      if (!part) continue;
      if (CONNECTOR_ONLY_RE.test(part) || !LATEX_INDICATORS.test(part)) {
        result.push({ type: "text", content: part });
        continue;
      }

      const leading = part.match(/^\s*/)?.[0] ?? "";
      const trailing = part.match(/\s*$/)?.[0] ?? "";
      const math = part.trim();
      if (leading) result.push({ type: "text", content: leading });
      if (math) result.push({ type: "inline", content: math });
      if (trailing) result.push({ type: "text", content: trailing });
    }
  };

  while ((match = RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushTextLike(text.slice(lastIndex, match.index));
    }

    const raw = match[0];
    let content = raw;
    let type: "inline" | "block" = "inline";

    if (raw.startsWith("$$")) {
      content = raw.slice(2, -2);
      type = "block";
    } else if (raw.startsWith("$")) {
      content = raw.slice(1, -1);
    } else if (raw.startsWith("\\[")) {
      content = raw.slice(2, -2);
      type = "block";
    } else if (raw.startsWith("\\(")) {
      content = raw.slice(2, -2);
    } else if (raw.startsWith("(")) {
      content = raw;
    } else if (raw.startsWith("[")) {
      content = raw.slice(1, -1);
      type = "inline";
    }

    result.push({ type, content: content.trim() });
    lastIndex = RE.lastIndex;
  }

  if (lastIndex < text.length) {
    pushTextLike(text.slice(lastIndex));
  }

  return result;
}

function useKatexHtml(value: string, displayMode: boolean) {
  return useMemo(() => {
    try {
      return katex.renderToString(value, {
        displayMode,
        output: "html",
        strict: false,
        throwOnError: true,
      });
    } catch {
      return null;
    }
  }, [displayMode, value]);
}

function SafeInline({ value }: { value: string }) {
  const html = useKatexHtml(value, false);
  if (!html) return <span>{value}</span>;
  return <span aria-label={value} role="img" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SafeBlock({ value }: { value: string }) {
  const html = useKatexHtml(value, true);
  if (!html) return <span>{value}</span>;
  return <div aria-label={value} role="img" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Renders text containing LaTeX expressions across multiple delimiter styles.
 * Plain (non-math) substrings preserve their original whitespace.
 */
export function MathRenderer({ text, className, as = "span" }: MathRendererProps) {
  const segments = useMemo(() => splitIntoSegments(text ?? ""), [text]);

  const content = segments.map((seg, i) => {
    if (seg.type === "text") {
      return <Fragment key={i}>{seg.content}</Fragment>;
    }
    if (seg.type === "block") {
      return <SafeBlock key={i} value={seg.content} />;
    }
    return <SafeInline key={i} value={seg.content} />;
  });

  if (as === "div") return <div className={className}>{content}</div>;
  if (as === "p") return <p className={className}>{content}</p>;
  return <span className={className}>{content}</span>;
}

export default MathRenderer;
