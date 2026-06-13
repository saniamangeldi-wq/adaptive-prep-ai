import ReactMarkdown, { type Options } from "react-markdown";
import remarkMath from "remark-math";
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

interface MarkdownMathProps extends Omit<Options, "children"> {
  children: string;
}

/**
 * Drop-in replacement for ReactMarkdown that also renders KaTeX math.
 */
export function MarkdownMath({ children, remarkPlugins = [], rehypePlugins = [], ...rest }: MarkdownMathProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, ...remarkPlugins]}
      rehypePlugins={[rehypeKatex, ...rehypePlugins]}
      {...rest}
    >
      {normalizeMath(children)}
    </ReactMarkdown>
  );
}

export default MarkdownMath;
