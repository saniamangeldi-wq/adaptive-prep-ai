import { Fragment, useMemo } from "react";
import { InlineMath, BlockMath } from "react-katex";

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

/**
 * Splits text into math + plain-text segments. Recognises:
 *   $$...$$    block math
 *   $...$      inline math
 *   \[...\]    block math
 *   \(...\)    inline math
 *   (...)      inline math IF content has a LaTeX command (\foo) or sub/superscript (x_1, x^2)
 *   [...]      inline math IF content has a LaTeX command (\foo)
 */
function splitIntoSegments(text: string): Segment[] {
  const result: Segment[] = [];
  if (!text) return result;

  // Order matters: explicit delimiters first, then heuristic paren/bracket matches.
  const RE =
    /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\([^()\n]*\\[a-zA-Z]+[^()\n]*\)|\[[^\[\]\n]*\\[a-zA-Z]+[^\[\]\n]*\]|\([^()\n]*[a-zA-Z0-9][_^][a-zA-Z0-9{][^()\n]*\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: "text", content: text.slice(lastIndex, match.index) });
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
    } else if (raw.startsWith("(") || raw.startsWith("[")) {
      content = raw.slice(1, -1);
      type = "inline";
    }

    result.push({ type, content: content.trim() });
    lastIndex = RE.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", content: text.slice(lastIndex) });
  }

  return result;
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
