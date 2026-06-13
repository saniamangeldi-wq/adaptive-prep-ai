import { Fragment, useMemo } from "react";
import { InlineMath, BlockMath } from "react-katex";

interface MathRendererProps {
  text: string;
  className?: string;
  /** Render inline (no wrapper span). Defaults to false (span wrapper). */
  as?: "span" | "div" | "p";
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "inline"; value: string }
  | { kind: "block"; value: string };

// Heuristic: a bracketed segment is treated as math only if it
// contains a LaTeX command or typical math typography.
const LATEX_HINT =
  /\\(?:boxed|frac|sqrt|sum|int|prod|lim|vec|hat|bar|overline|underline|left|right|cdot|times|div|pm|neq|leq|geq|approx|infty|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|quad|qquad|displaystyle|text|mathbb|mathrm|mathcal)\b|[\^_]\{|\\\\/;

function looksLikeMath(inner: string): boolean {
  return LATEX_HINT.test(inner);
}

/**
 * Splits text into math + plain-text segments. Recognises:
 *   $$...$$    block math
 *   $...$      inline math
 *   \[...\]    block math
 *   \(...\)    inline math
 *   [...]      block math, only when content contains LaTeX commands
 *   (...)      inline math, only when content contains LaTeX commands
 */
function parseSegments(input: string): Segment[] {
  const out: Segment[] = [];
  if (!input) return out;

  // Master regex: order matters — $$ before $, \[ before \(, then bracket fallbacks.
  const re =
    /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\$\n]+?)\$|\[([^\[\]\n]{2,400}?)\]|\(([^()\n]{2,400}?)\)/g;

  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    if (m.index > lastIndex) {
      out.push({ kind: "text", value: input.slice(lastIndex, m.index) });
    }

    const [full, dd, br, pr, dl, sq, pa] = m;
    if (dd !== undefined) {
      out.push({ kind: "block", value: dd.trim() });
    } else if (br !== undefined) {
      out.push({ kind: "block", value: br.trim() });
    } else if (pr !== undefined) {
      out.push({ kind: "inline", value: pr.trim() });
    } else if (dl !== undefined) {
      out.push({ kind: "inline", value: dl.trim() });
    } else if (sq !== undefined && looksLikeMath(sq)) {
      out.push({ kind: "block", value: sq.trim() });
    } else if (pa !== undefined && looksLikeMath(pa)) {
      out.push({ kind: "inline", value: pa.trim() });
    } else {
      // Bracketed but not math — keep the literal text.
      out.push({ kind: "text", value: full });
    }

    lastIndex = m.index + full.length;
  }

  if (lastIndex < input.length) {
    out.push({ kind: "text", value: input.slice(lastIndex) });
  }

  return out;
}

function SafeInline({ value }: { value: string }) {
  try {
    return <InlineMath math={value} />;
  } catch {
    return <span>{value}</span>;
  }
}

function SafeBlock({ value }: { value: string }) {
  try {
    return <BlockMath math={value} />;
  } catch {
    return <span>{value}</span>;
  }
}

/**
 * Renders text containing LaTeX expressions across multiple delimiter styles.
 * Plain (non-math) substrings preserve their original whitespace.
 */
export function MathRenderer({ text, className, as = "span" }: MathRendererProps) {
  const segments = useMemo(() => parseSegments(text ?? ""), [text]);

  const content = segments.map((seg, i) => {
    if (seg.kind === "text") {
      return <Fragment key={i}>{seg.value}</Fragment>;
    }
    if (seg.kind === "block") {
      return <SafeBlock key={i} value={seg.value} />;
    }
    return <SafeInline key={i} value={seg.value} />;
  });

  if (as === "div") return <div className={className}>{content}</div>;
  if (as === "p") return <p className={className}>{content}</p>;
  return <span className={className}>{content}</span>;
}

export default MathRenderer;
