import type { CriterionKey } from "@ielts/contract.ts";

/**
 * The sample shown on the landing page. Written by us for this page: the question,
 * the essay excerpt, the bands and the comments are examples, not a real student's
 * work and not taken from any published test material. The overall follows the
 * server's rule (mean of the four, rounded down to the half band): 6.5, 6, 6.5, 6 → 6.0.
 */
export const SAMPLE = {
  taskLabel: "Task 2, opinion essay",
  wordCount: 268,
  overall: 6,
  criteria: [
    { key: "task", label: "Task Response", band: 6.5 },
    { key: "coherence", label: "Coherence and Cohesion", band: 6 },
    { key: "lexical", label: "Lexical Resource", band: 6.5 },
    { key: "grammar", label: "Grammatical Range and Accuracy", band: 6 },
  ] as Array<{ key: CriterionKey; label: string; band: number }>,
  /** Excerpt split into plain text and marked passages. */
  excerpt: [
    { text: "In my opinion, a year of work before university can be useful, but it should not be compulsory. " },
    { text: "Firstly,", mark: "coherence" as CriterionKey },
    { text: " " },
    { text: "working give young people", mark: "grammar" as CriterionKey, open: true },
    { text: " " },
    { text: "a clear idea about", mark: "lexical" as CriterionKey },
    { text: " what they want to study. My cousin, for example, worked in a hotel for a year and then chose tourism management." },
  ],
  comment: {
    criterion: "grammar" as CriterionKey,
    heading: "Grammatical Range and Accuracy · Subject-verb agreement",
    quote: "working give young people",
    explanation: "“Working” is the subject here, and it takes a singular verb.",
    suggestion: "working gives young people",
  },
  chat: {
    question: "Why is my coherence only 6.0?",
    answer: [
      "Each paragraph has one clear main idea, which helps. What holds the band back is the linking: every body paragraph starts with *Firstly* or *Secondly*, so the reader sees a list rather than an argument.",
      "Try opening the second paragraph with a sentence that builds on the first:",
    ],
    example: "Knowing what to study is one benefit; earning money of their own is another.",
  },
};
