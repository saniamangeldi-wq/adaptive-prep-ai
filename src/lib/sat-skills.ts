/**
 * Digital SAT skill domains (the 4 + 4 content domains College Board reports
 * on) and a classifier for questions that don't carry an explicit `skill`.
 *
 * New, original questions should set `skill` directly. For the legacy bank,
 * Reading & Writing stems are standardised ("Which choice completes the text
 * with the most logical transition?"), so stem matching is reliable. Math is
 * classified by keywords, which is a best guess; unknown math defaults to
 * Algebra.
 */

export type SatSection = "math" | "reading_writing";

export type SkillKey =
  | "information_ideas"
  | "craft_structure"
  | "expression_ideas"
  | "standard_english"
  | "algebra"
  | "advanced_math"
  | "data_analysis"
  | "geometry_trig";

export const SKILLS: Record<SkillKey, { label: string; section: SatSection }> = {
  information_ideas: { label: "Information and Ideas", section: "reading_writing" },
  craft_structure: { label: "Craft and Structure", section: "reading_writing" },
  expression_ideas: { label: "Expression of Ideas", section: "reading_writing" },
  standard_english: { label: "Standard English Conventions", section: "reading_writing" },
  algebra: { label: "Algebra", section: "math" },
  advanced_math: { label: "Advanced Math", section: "math" },
  data_analysis: { label: "Problem-Solving and Data Analysis", section: "math" },
  geometry_trig: { label: "Geometry and Trigonometry", section: "math" },
};

export const SKILL_KEYS = Object.keys(SKILLS) as SkillKey[];

export function isSkillKey(v: unknown): v is SkillKey {
  return typeof v === "string" && v in SKILLS;
}

interface Classifiable {
  section: SatSection;
  text: string;
  skill?: string;
}

const RW_RULES: Array<[RegExp, SkillKey]> = [
  [/conforms? to the conventions of standard english/i, "standard_english"],
  [/most logical transition/i, "expression_ideas"],
  [/relevant information from the notes|the student wants to|accomplish (this|these) goals?/i, "expression_ideas"],
  [/most logical and precise word|word or phrase|as used in the text, what does the word/i, "craft_structure"],
  [/main purpose|overall structure|function of the underlined|based on the texts|text 2|text 1/i, "craft_structure"],
  [/main idea|central idea|best summarizes/i, "information_ideas"],
  [/data from the (table|graph|chart)|quotation|illustrates the claim|finding, if true|most directly (support|weaken)|most logically completes the text|best supports/i, "information_ideas"],
];

const MATH_RULES: Array<[RegExp, SkillKey]> = [
  [/\b(triangle|circle|radius|diameter|circumference|angle|degrees?|radians?|perimeter|rectangle|rectangular|square units|polygon|hexagon|pentagon|parallelogram|trapezoid|cylinder|cone|sphere|cube|prism|pyramid|volume|area of|hypotenuse|arc|chord|tangent to|sine|cosine|tangent|sin|cos|tan|pi)\b/i, "geometry_trig"],
  [/\b(percent|percentage|survey(ed)?|sample|mean|median|mode|range of the data|standard deviation|probability|ratio|proportion|rate|per hour|per minute|miles|kilometers|scatterplot|line of best fit|table|data|frequency|dot plot|histogram|margin of error|population)\b|%/i, "data_analysis"],
  [/\b(squared|cubed|quadratic|parabola|polynomial|exponential|exponent|to the power|square root|radical|vertex|zeros? of|roots?|factor(ed|s)?|nonlinear|rational expression|f left parenthesis|g left parenthesis|h left parenthesis)\b|\^/i, "advanced_math"],
];

export function classifySkill(q: Classifiable): SkillKey {
  if (isSkillKey(q.skill)) return q.skill;
  const text = q.text || "";
  if (q.section === "reading_writing") {
    for (const [re, skill] of RW_RULES) if (re.test(text)) return skill;
    return "information_ideas";
  }
  for (const [re, skill] of MATH_RULES) if (re.test(text)) return skill;
  return "algebra";
}

/** Item difficulty on the same logit scale as skill ratings. */
export const DIFFICULTY_LOGIT: Record<string, number> = { easy: -1, normal: 0, hard: 1 };

/** Chance of answering a medium-difficulty question in a skill correctly. */
export function masteryPct(rating: number): number {
  return Math.round(100 / (1 + Math.exp(-rating)));
}
