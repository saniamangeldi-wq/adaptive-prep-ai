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

/**
 * Normalize "verbalized LaTeX" (screen-reader style) into real LaTeX so
 * stored strings like "StartFraction x squared Over y EndFraction" render.
 */
function normalizeVerbalMath(input: string): string {
  if (!input) return input;
  let s = input;

  // Fractions: StartFraction A Over B EndFraction  ->  \frac{A}{B}
  const fracRe = /StartFraction\s+([\s\S]+?)\s+Over\s+([\s\S]+?)\s+EndFraction/gi;
  // Run repeatedly to handle nesting
  for (let i = 0; i < 5 && fracRe.test(s); i++) {
    s = s.replace(fracRe, (_m, a, b) => `\\frac{${a.trim()}}{${b.trim()}}`);
  }

  // Roots: StartRoot X EndRoot -> \sqrt{X}
  const rootRe = /StartRoot\s+([\s\S]+?)\s+EndRoot/gi;
  for (let i = 0; i < 5 && rootRe.test(s); i++) {
    s = s.replace(rootRe, (_m, a) => `\\sqrt{${a.trim()}}`);
  }

  // Absolute value: StartAbsoluteValue X EndAbsoluteValue -> \left|X\right|
  s = s.replace(/StartAbsoluteValue\s+([\s\S]+?)\s+EndAbsoluteValue/gi,
    (_m, a) => `\\left|${a.trim()}\\right|`);

  // Exponents in prose: "x squared", "y cubed"
  s = s.replace(/\b([A-Za-z0-9\)\]\}])\s+squared\b/g, "$1^{2}");
  s = s.replace(/\b([A-Za-z0-9\)\]\}])\s+cubed\b/g, "$1^{3}");
  // "X to the fourth/fifth/...power" -> X^{n}
  const ordinals: Record<string, string> = {
    fourth: "4", fifth: "5", sixth: "6", seventh: "7",
    eighth: "8", ninth: "9", tenth: "10",
  };
  s = s.replace(/\b([A-Za-z0-9\)\]\}])\s+to the (fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:\s+power)?\b/gi,
    (_m, base, ord) => `${base}^{${ordinals[ord.toLowerCase()]}}`);

  // Wrap the whole normalized run in $...$ delimiters if it clearly became LaTeX
  // but only if it isn't already delimited — we let the splitter pick it up.
  return s;
}

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
 * inside mixed prose. Also handles bare LaTeX strings with no delimiters.
 */
function splitIntoSegments(rawText: string): Segment[] {
  const text = normalizeVerbalMath(rawText);
  const result: Segment[] = [];
  if (!text) return result;

  // First pass: extract explicit delimited math from mixed prose.
  const DELIM_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  const hasDelimiter = DELIM_RE.test(text);
  DELIM_RE.lastIndex = 0;

  if (hasDelimiter) {
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DELIM_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      const raw = match[0];
      let content = raw;
      let type: "inline" | "block" = "inline";
      if (raw.startsWith("$$")) { content = raw.slice(2, -2); type = "block"; }
      else if (raw.startsWith("$")) { content = raw.slice(1, -1); }
      else if (raw.startsWith("\\[")) { content = raw.slice(2, -2); type = "block"; }
      else if (raw.startsWith("\\(")) { content = raw.slice(2, -2); }
      result.push({ type, content: content.trim() });
      lastIndex = DELIM_RE.lastIndex;
    }
    if (lastIndex < text.length) {
      result.push({ type: "text", content: text.slice(lastIndex) });
    }
    return result;
  }

  // No explicit delimiters — fall back to prior heuristic behaviour.
  if (isStandaloneMathExpression(text)) {
    return [{ type: "inline", content: text.trim() }];
  }

  const HEURISTIC_RE = new RegExp(
    String.raw`(\([^()\n]*${LATEX_INDICATOR_SOURCE}[^()\n]*\)|\[[^\[\]\n]*${LATEX_INDICATOR_SOURCE}[^\[\]\n]*\])`,
    "g"
  );

  const pushTextLike = (chunk: string) => {
    if (!chunk) return;
    if (!LATEX_INDICATORS.test(chunk)) {
      result.push({ type: "text", content: chunk });
      return;
    }
    const labelMatch = chunk.match(new RegExp(String.raw`^([\s\S]*?:\s*)([\s\S]*${LATEX_INDICATOR_SOURCE}[\s\S]*)$`));
    if (labelMatch) {
      result.push({ type: "text", content: labelMatch[1] });
      pushTextLike(labelMatch[2]);
      return;
    }
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

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HEURISTIC_RE.exec(text)) !== null) {
    if (match.index > lastIndex) pushTextLike(text.slice(lastIndex, match.index));
    const raw = match[0];
    let content = raw;
    if (raw.startsWith("[")) content = raw.slice(1, -1);
    result.push({ type: "inline", content: content.trim() });
    lastIndex = HEURISTIC_RE.lastIndex;
  }
  if (lastIndex < text.length) pushTextLike(text.slice(lastIndex));

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
