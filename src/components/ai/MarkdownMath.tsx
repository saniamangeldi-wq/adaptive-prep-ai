import ReactMarkdown, { type Options } from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

/**
 * Normalizes LaTeX delimiters so remark-math recognises them.
 * remark-math only handles $...$ and $$...$$; AI responses often use
 * \( \) and \[ \]. Convert those to dollar-form so the pipeline picks
 * them up. Triple backslashes guard against escaped output.
 */
function normalizeMath(input: string): string {
  if (!input) return "";
  return input
    .replace(/\\\\\[/g, "\\[")
    .replace(/\\\\\]/g, "\\]")
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)")
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, body) => `\n$$\n${body.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, body) => `$${body.trim()}$`);
}

/**
 * Models sometimes emit a whole markdown table on ONE line
 * ("| A | B | |---|---| | 1 | 2 |"), which renders as raw pipe text.
 * Re-break those into proper rows so remark-gfm can parse the table.
 */
function normalizeTables(input: string): string {
  if (!input || !input.includes("|")) return input;

  return input
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return line;
      // Already a single row (no doubled pipes joining rows) -> leave alone
      if (!/\|\s*\|/.test(trimmed)) return line;

      const rows = trimmed
        .split(/\|\s*\|/)
        .map((part, i, arr) => {
          let row = part;
          if (i > 0) row = `|${row}`;
          if (i < arr.length - 1) row = `${row}|`;
          return row.trim();
        })
        .filter((row) => row.replace(/[|\s]/g, "").length > 0 || /-/.test(row));

      if (rows.length < 2) return line;
      return `\n${rows.join("\n")}\n`;
    })
    .join("\n");
}

interface MarkdownMathProps extends Omit<Options, "children"> {
  children: string;
}

const tableComponents: Options["components"] = {
  table: ({ children, ...props }) => (
    <div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold text-foreground" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-border px-3 py-2 align-top text-foreground/90" {...props}>
      {children}
    </td>
  ),
};

/**
 * Drop-in replacement for ReactMarkdown that also renders KaTeX math and GFM tables.
 */
export function MarkdownMath({ children, remarkPlugins = [], rehypePlugins = [], components, ...rest }: MarkdownMathProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm, ...remarkPlugins]}
      rehypePlugins={[rehypeKatex, ...rehypePlugins]}
      components={{ ...tableComponents, ...(components || {}) }}
      {...rest}
    >
      {normalizeTables(normalizeMath(children))}
    </ReactMarkdown>
  );
}

export default MarkdownMath;
