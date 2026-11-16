/**
 * Marking knowledge for the grader. Pure data + small helpers.
 *
 * Everything here is written in our own words as a working summary of how
 * IELTS Writing is assessed. It is NOT the official band descriptor text and
 * must never be replaced with it (see CLAUDE.md, "Original content only").
 * Any edit to this file changes grades: bump GRADER_VERSION in prompt.ts.
 *
 * Where an examiner convention is uncertain, the conservative (non-inflating)
 * reading is used and marked "CONSERVATIVE:" in a comment.
 */

import type { TaskType, TaskVariant, Task1AcademicVariant, Task1GeneralVariant, Task2Variant } from "./contract.ts";
import { TASK_RULES } from "./contract.ts";

export interface BandLevel {
  band: 9 | 8 | 7 | 6 | 5 | 4 | 3;
  text: string;
}

// ───────────────────────── Shared criteria (both tasks) ─────────────────────────

export const COHERENCE_BANDS: BandLevel[] = [
  { band: 9, text: "You follow the writer effortlessly from first line to last; you never notice the joins between ideas. Paragraph breaks fall exactly where they should. Nothing to fix." },
  { band: 8, text: "The order of ideas makes sense at every point. Links between sentences and back-references are almost always right; a rare clumsy join at most. Paragraph breaks are well placed and there are enough of them." },
  { band: 7, text: "The text moves forward logically and you always know where it is going. Varied linking words, mostly well chosen, perhaps one too many in places or one missing. In Task 2 each body paragraph is built around one identifiable idea. Words like 'this', 'they', 'such' point clearly to what they replace." },
  { band: 6, text: "You can follow the whole text, but the joins are visible: a connector opens almost every sentence, or a link inside or between sentences is wrong. Sometimes it is unclear what 'it' or 'this' refers to. Paragraphs are there, but a break may fall in an odd place or a paragraph may mix ideas." },
  { band: 5, text: "There is some order, but the reader sometimes loses the thread. Few connectors, or the same ones repeated, or used with the wrong meaning. The same nouns come back again and again because pronouns and synonyms are not used. In Task 2, paragraphs may be missing or not match the ideas." },
  { band: 4, text: "The reader has to work out the order of ideas; there is no clear line of development. Connectors are mostly the simplest ones (and, but, because, so) and are sometimes wrong. Paragraphing is absent or confusing." },
  { band: 3, text: "Ideas appear in no logical order. Almost no connectors, and the ones present often signal the wrong relationship." },
];

export const LEXICAL_BANDS: BandLevel[] = [
  { band: 9, text: "Vocabulary reads like that of a skilled writer: exact, natural, varied. Any slip is the kind a careful native writer might make." },
  { band: 8, text: "Plenty of vocabulary, used easily to say exactly what is meant, including less common words and idiomatic phrases that fit. A word choice or collocation is off now and then; spelling or word-form mistakes are rare." },
  { band: 7, text: "Enough variety to be flexible and fairly precise. Some less common words and phrases appear, used with a sense of which words go together and which register fits (e.g. 'a sharp decline', 'tackle the issue'). Occasional wrong word, spelling or word form, never hiding the meaning." },
  { band: 6, text: "Vocabulary is sufficient for the task. The writer reaches for less common words but sometimes misuses them or pairs them awkwardly. Some spelling and word-form mistakes, though the meaning stays clear." },
  { band: 5, text: "A small working vocabulary that just covers the task, with obvious repetition. Spelling and word-form mistakes are noticeable and sometimes make the reader stop and re-read." },
  { band: 4, text: "Only everyday words, repeated, sometimes unsuited to the task. Word forms and spelling are poorly controlled and the mistakes make reading hard work." },
  { band: 3, text: "A handful of words and fixed phrases, poorly controlled; mistakes often change or hide the meaning." },
];

export const GRAMMAR_BANDS: BandLevel[] = [
  { band: 9, text: "Any structure the writer needs is there and correct; mistakes are rare slips." },
  { band: 8, text: "A broad variety of structures. The large majority of sentences are completely correct; errors or odd forms are only occasional." },
  { band: 7, text: "Complex structures of several kinds (relative and participle clauses, conditionals, passives) are used and generally controlled. Many sentences are entirely correct, though some grammar or punctuation errors remain." },
  { band: 6, text: "Simple and complex sentences are mixed. There are grammar and punctuation errors, but they seldom make the meaning unclear. Some sentences are fully correct, but not most of them." },
  { band: 5, text: "A narrow set of structures. Complex sentences are tried but go wrong noticeably more often than simple ones. Errors are frequent, punctuation is often faulty, and some errors slow the reader down." },
  { band: 4, text: "Very few structures; subordinate clauses hardly appear. Some sentences are correct, but most contain errors, and punctuation is often wrong." },
  { band: 3, text: "Attempts at sentences, but errors in grammar and punctuation are in nearly every line and distort the meaning." },
];

/** The distinctions examiners lean on when two adjacent bands both seem possible. */
export const BOUNDARY_NOTES: Record<"coherence" | "lexical" | "grammar", string[]> = {
  coherence: [
    "6 vs 7: mechanical stacking of connectors (Firstly / Moreover / In addition / Furthermore at the start of most sentences) holds a script at 6 even if every connector is grammatically correct. 7 needs logical progression inside paragraphs, not just labels between them.",
    "6 vs 7 (Task 2): every body paragraph needs one clear central idea; a paragraph that drifts across two or three ideas points to 6.",
    "5 vs 6: 5 when the reader has to reconstruct the order of ideas or when the same noun is repeated because pronouns and substitution are not used.",
    "Task 2 with no paragraphing at all is hard to place above 5 on this criterion.",
  ],
  lexical: [
    "6 vs 7: 7 needs some less common vocabulary used with correct collocation and style; ambitious words used wrongly do not earn 7.",
    "Memorised 'impressive' phrases and idioms that do not fit the context are a weakness, not range.",
    "Spelling errors in common words weigh more than in rare words. Errors that make meaning unclear pull towards 5.",
    "Words copied from the task wording do not demonstrate range.",
  ],
  grammar: [
    "6 vs 7: estimate the share of error-free sentences. Roughly half or more error-free with a variety of complex forms suggests 7; complex forms present but errors in many sentences suggests 6.",
    "5 vs 6: at 5 complex sentences are mostly faulty and errors are frequent enough to slow reading.",
    "Punctuation counts here: comma splices and run-on sentences are grammar errors.",
    "A script of only simple sentences, even if accurate, cannot score above 5–6 for range.",
  ],
};

// ───────────────────────── Task criterion by task type ─────────────────────────

export const TASK_ACHIEVEMENT_ACADEMIC: BandLevel[] = [
  { band: 9, text: "Nothing the task asks for is missing; the choice of what to report and how to present it could not be improved." },
  { band: 8, text: "Everything the task asks for is there. The important features stand out clearly and are backed by well-chosen figures; a minor point may be left out." },
  { band: 7, text: "There is a clear overview of the main trends, contrasts or stages. The important features are picked out and stated clearly with accurate figures, although they could be developed a little more." },
  { band: 6, text: "An overview is present and the information chosen is sensible. Important features are covered well enough, but some details are irrelevant, poorly chosen or wrong." },
  { band: 5, text: "Responds to the visual but runs through details mechanically with no clear overview, or describes without figures to back it up. Important features are not covered well enough; minor details may take over." },
  { band: 4, text: "An attempt is made, but some important features are missing or mixed up with minor details. Parts are unclear, irrelevant, repeated or wrong." },
  { band: 3, text: "Does not really answer the task and may have misread the visual. Very little relevant content, often repeated." },
];

export const TASK_ACHIEVEMENT_GENERAL: BandLevel[] = [
  { band: 9, text: "The letter does everything asked: its purpose is obvious at once, the tone is exactly right for the reader, and all three points are developed naturally." },
  { band: 8, text: "Everything asked is covered: all three points are clear and well expanded, the purpose is clear, and the tone suits the reader throughout with at most a small lapse." },
  { band: 7, text: "All requirements met. The purpose is clear and the tone is right for the reader and consistent. All three points are clearly there, though one could be expanded more." },
  { band: 6, text: "The requirements are dealt with. All three points appear, but one is thin. The purpose is mostly clear. The tone slips in places." },
  { band: 5, text: "The letter broadly responds, but the points are handled thinly or one is only touched on, and irrelevant detail may take space. The purpose is sometimes unclear. The tone varies and is sometimes wrong for the reader; the letter format may be off in places." },
  { band: 4, text: "An attempt, but at least one bullet point is left out. The reader cannot easily tell why the letter was written. Tone or format does not suit the reader." },
  { band: 3, text: "Does not really answer the task and may have misunderstood the situation. The purpose of the letter cannot be identified; very little relevant content." },
];

export const TASK_RESPONSE: BandLevel[] = [
  { band: 9, text: "Every part of the question is answered completely. The writer's answer is fully worked out, and each idea is relevant, explained in depth and convincingly supported." },
  { band: 8, text: "All parts of the question get enough attention. The answer is well worked out, with relevant ideas that are explained and supported; only an occasional weaker point." },
  { band: 7, text: "Every part of the question is answered and the writer's view is clear from start to finish. Main ideas are explained and supported, but some support is too general or drifts from the point." },
  { band: 6, text: "Every part is answered, but not evenly. A relevant view is given, but the conclusion may be unclear or simply repeat earlier points. Main ideas are relevant, but some are not explained enough or are unclear." },
  { band: 5, text: "Only part of the question is really answered; the essay format may be off in places. A view is stated but not clearly developed, and there may be no real conclusion. Few main ideas, not explained enough; some irrelevant detail." },
  { band: 4, text: "The question is answered only in a minimal way, or the essay drifts away from it. The writer's view is hard to pin down. Main ideas are difficult to find and may be repeated, irrelevant or unsupported." },
  { band: 3, text: "No part of the question is adequately answered and there is no identifiable view. Few ideas, mostly undeveloped or irrelevant." },
];

export const TASK_BANDS_BY_TYPE: Record<TaskType, BandLevel[]> = {
  task1_academic: TASK_ACHIEVEMENT_ACADEMIC,
  task1_general: TASK_ACHIEVEMENT_GENERAL,
  task2: TASK_RESPONSE,
};

/** Rules that apply to every script, every criterion. */
export const GLOBAL_RULES: string[] = [
  "Bands 1 and 2: almost no assessable language (isolated words, or nothing connected to the task). A script of 20 words or fewer is band 1 on every criterion.",
  "Band 0: no attempt, written entirely in a language other than English, or shown to be wholly memorised and unrelated to the task.",
  "Task 2 counts twice as much as Task 1 in the Writing band, but each task is marked on its own here.",
  "Each criterion is judged independently. Do not let a weak Task Achievement/Response pull the language criteria down, or strong vocabulary pull the task criterion up.",
  "Mark what is on the page. Do not reward what the candidate probably meant or might know.",
];

export const LENGTH_RULES: Record<TaskType, string> = {
  task1_academic:
    "Minimum 150 words. A shorter answer is penalised under Task Achievement only (it cannot cover the key features adequately); the language criteria judge what is written. Far below the minimum (under 100 words) Task Achievement is at most 5. Words copied from the task wording are not credited. Longer answers are not rewarded for length; irrelevant detail is a weakness.",
  task1_general:
    "Minimum 150 words. A shorter letter is penalised under Task Achievement only, usually because bullet points are not developed. Far below the minimum (under 100 words) Task Achievement is at most 5. Words copied from the task wording are not credited.",
  task2:
    "Minimum 250 words. A shorter essay is penalised under Task Response only, because ideas cannot be developed enough. Far below the minimum (under 167 words) Task Response is at most 5. Words copied from the question are not credited. Very long essays gain nothing for length and often lose control of language.",
};

/** Ratio of the minimum below which a script is "severely" under length (see postprocess). */
export const SEVERE_UNDER_LENGTH_RATIO = 2 / 3;

// ───────────────────────── Variant guides and checklists ─────────────────────────

export interface ChecklistDef {
  /** Stable id (shown in GradeReport.checklist). */
  id: string;
  /** Short English label for the UI. */
  label: string;
  /** What the grader must check, for the prompt. */
  check: string;
  /**
   * True when the item may not apply to every question of this variant (e.g.
   * "verdict" only when the question asks which side outweighs). The model may
   * answer "not_applicable"; the server then drops the item from the report.
   */
  conditional?: boolean;
  /**
   * Ceilings on the TASK criterion when this item is not met. Enforced by the
   * server as a consistency rule (postprocess.ts), and told to the model.
   */
  caps?: { no?: number; partly?: number };
}

export interface VariantGuide {
  variant: TaskVariant;
  taskType: TaskType;
  /** Human name for the prompt. */
  name: string;
  /** What a strong answer must do. */
  mustDo: string[];
  /** The classic ways candidates lose marks. */
  commonLosses: string[];
  checklist: ChecklistDef[];
}

// Task 1 Academic: items shared by the four single-visual data variants.
const T1_OVERVIEW: ChecklistDef = {
  id: "overview",
  label: "Clear overview of the main features",
  check: "Is there an overview (usually 1–2 sentences, in the introduction or a separate paragraph) that states the most important trends, differences or proportions WITHOUT specific figures? A conclusion that only repeats details is not an overview.",
  caps: { no: 5, partly: 6 },
};
const T1_KEY_FEATURES: ChecklistDef = {
  id: "key_features",
  label: "Key features selected and highlighted",
  check: "Are the most significant features (highest/lowest, biggest changes, exceptions) selected and reported, rather than every number listed in order?",
  caps: { no: 5, partly: 6 },
};
const T1_DATA: ChecklistDef = {
  id: "data_support",
  label: "Accurate figures support the description",
  check: "Are key features supported with figures, and are those figures and units accurate to the visual? Mark not_applicable only when no visual or description is available.",
  conditional: true,
  caps: { no: 5 },
};
const T1_COMPARISONS: ChecklistDef = {
  id: "comparisons",
  label: "Relevant comparisons made",
  check: "Are categories, groups or time points compared with each other where that is relevant, rather than described one by one in isolation?",
  caps: { no: 6 },
};
const T1_OBJECTIVE: ChecklistDef = {
  id: "objective",
  label: "Objective: no opinions, causes or predictions",
  check: "Does the answer stay with what the visual shows, without personal opinion, explanations of causes, or speculation beyond the data?",
  caps: { no: 6 },
};

const DATA_MUST_DO = [
  "One-sentence introduction that paraphrases what the visual shows (not copied from the task).",
  "An overview of the two or three most important features with no figures.",
  "Body paragraphs that group information logically (by trend, by category or by time) and support each key feature with accurate figures and units.",
  "Comparisons between categories or time points where relevant, using comparative structures (twice as many, slightly higher than, the largest share).",
  "Neutral, objective reporting: no opinion, no reasons, no prediction beyond the data. No conclusion with new information is needed.",
];

const DATA_LOSSES = [
  "No overview, or an 'overview' that is just another detail with figures.",
  "Listing every figure in sequence instead of selecting key features.",
  "Wrong figures, wrong units (per cent vs percentage points, thousands vs millions) or misread axes.",
  "Copying the task sentence as the introduction.",
  "Explaining causes or giving opinions ('this is because people are lazy').",
  "Under 150 words, or wasting words on irrelevant detail.",
];

const ACADEMIC_GUIDES: Record<Task1AcademicVariant, VariantGuide> = {
  line_graph: {
    variant: "line_graph",
    taskType: "task1_academic",
    name: "Academic Task 1: line graph",
    mustDo: [
      ...DATA_MUST_DO,
      "Describe the overall direction of each line across the whole period, then the significant movements: peaks, troughs, crossing points, periods of stability.",
      "Use accurate trend language (rose steadily, fell sharply, levelled off, fluctuated) and the right tense for the period (past for completed years, future forms only for projections shown as such).",
    ],
    commonLosses: [
      ...DATA_LOSSES,
      "Describing year by year instead of identifying trends.",
      "Missing where lines cross or where the ranking changes.",
      "Using present tense for past data or treating projections as facts.",
    ],
    checklist: [T1_OVERVIEW, T1_KEY_FEATURES, T1_DATA, T1_COMPARISONS, T1_OBJECTIVE],
  },
  bar_chart: {
    variant: "bar_chart",
    taskType: "task1_academic",
    name: "Academic Task 1: bar chart",
    mustDo: [
      ...DATA_MUST_DO,
      "Identify the largest and smallest categories and the most striking contrasts; if the chart covers two or more years, report the changes between them.",
      "Group similar categories instead of giving one sentence per bar.",
    ],
    commonLosses: [
      ...DATA_LOSSES,
      "Describing each bar separately with no grouping or ranking.",
      "Treating a comparison chart as if it showed change over time (or the reverse).",
    ],
    checklist: [T1_OVERVIEW, T1_KEY_FEATURES, T1_DATA, T1_COMPARISONS, T1_OBJECTIVE],
  },
  pie_chart: {
    variant: "pie_chart",
    taskType: "task1_academic",
    name: "Academic Task 1: pie chart(s)",
    mustDo: [
      ...DATA_MUST_DO,
      "Report proportions with accurate language (just over a quarter, the largest share, roughly one in five) as well as percentages.",
      "With two or more pies, compare the same segment across pies and say which segments grew or shrank.",
    ],
    commonLosses: [
      ...DATA_LOSSES,
      "Describing each pie in isolation with no comparison between them.",
      "Confusing a fall in share with a fall in absolute amount (a pie shows proportions only).",
    ],
    checklist: [T1_OVERVIEW, T1_KEY_FEATURES, T1_DATA, T1_COMPARISONS, T1_OBJECTIVE],
  },
  table: {
    variant: "table",
    taskType: "task1_academic",
    name: "Academic Task 1: table",
    mustDo: [
      ...DATA_MUST_DO,
      "Select from the table: highest and lowest values, notable exceptions, and clear patterns across rows or columns. A table invites listing; resist it.",
    ],
    commonLosses: [
      ...DATA_LOSSES,
      "Reading the table row by row and reporting every cell.",
      "Missing the pattern that links the rows or columns (e.g. the largest change, an outlier).",
    ],
    checklist: [T1_OVERVIEW, T1_KEY_FEATURES, T1_DATA, T1_COMPARISONS, T1_OBJECTIVE],
  },
  mixed: {
    variant: "mixed",
    taskType: "task1_academic",
    name: "Academic Task 1: two different visuals (mixed)",
    mustDo: [
      ...DATA_MUST_DO,
      "Cover BOTH visuals with their own key features, usually one body paragraph each.",
      "Give an overview that covers both visuals and, where the data allows, link them (e.g. the category that grew most in one is the largest share in the other).",
    ],
    commonLosses: [
      ...DATA_LOSSES,
      "Describing only one visual, or one in detail and the other in a single sentence.",
      "An overview that mentions only one of the visuals.",
      "Treating the two visuals as unrelated when the task presents them together.",
    ],
    checklist: [
      { ...T1_OVERVIEW, check: "Is there an overview that states the main features of BOTH visuals without specific figures?" },
      {
        id: "both_visuals",
        label: "Both visuals reported",
        check: "Are the key features of each visual reported with reasonable balance (not one visual in detail and the other in a sentence)?",
        caps: { no: 5, partly: 6 },
      },
      {
        id: "link",
        label: "Link drawn between the visuals",
        check: "Does the answer connect the two visuals where the data gives a natural link? Mark not_applicable if the visuals have no meaningful connection.",
        conditional: true,
      },
      T1_DATA,
      T1_OBJECTIVE,
    ],
  },
  process: {
    variant: "process",
    taskType: "task1_academic",
    name: "Academic Task 1: process diagram",
    mustDo: [
      "Introduction paraphrasing what the process is.",
      "Overview: how many main stages, where it starts and ends, and what kind of process it is (man-made/linear or natural/cyclical).",
      "Every stage reported, in the correct order, with the key materials or outputs named.",
      "Clear sequencing language (first, next, after this, once…, before being…, finally) and, for man-made processes, the passive voice where the agent is unimportant ('the bottles are sorted').",
      "No data comparisons (there are no figures to compare) and no opinions or invented detail; quantities and temperatures given only if shown.",
    ],
    commonLosses: [
      "Missing or merging stages, or putting them in the wrong order.",
      "No overview of the number of stages, start and end point.",
      "Active voice with invented agents ('the workers sort the bottles') throughout a man-made process.",
      "Copying the labels word for word as a list instead of writing connected sentences.",
      "Adding explanations, advantages or opinions about the process.",
    ],
    checklist: [
      {
        ...T1_OVERVIEW,
        label: "Overview of the process",
        check: "Is there an overview stating the number of main stages and/or the start and end points, and the type of process?",
      },
      {
        id: "all_stages",
        label: "Every stage covered in order",
        check: "Are all the stages shown in the diagram reported, in the correct order, without inventing stages?",
        caps: { no: 5, partly: 6 },
      },
      {
        id: "sequencing",
        label: "Clear sequencing language",
        check: "Is the order of stages signalled clearly and with variety (not 'then… then… then…')?",
      },
      {
        id: "passive",
        label: "Passive voice used where natural",
        check: "For a man-made process, is the passive used where the agent is unimportant? Mark not_applicable for a natural cycle where active verbs are natural.",
        conditional: true,
      },
      {
        id: "objective",
        label: "No invented data, comparisons or opinions",
        check: "Does the answer avoid data comparisons, invented figures, explanations and opinions not shown in the diagram?",
        caps: { no: 6 },
      },
    ],
  },
  map: {
    variant: "map",
    taskType: "task1_academic",
    name: "Academic Task 1: map(s)",
    mustDo: [
      "Introduction paraphrasing what the maps show and the two time points (or the two proposals).",
      "Overview of the most significant changes (e.g. the area became more residential, farmland disappeared, the layout was modernised) or, for proposals, the main differences.",
      "Report the main changes with change language: was demolished, was replaced by, was converted into, was extended, a new X was built, remained unchanged.",
      "Accurate location language: to the north of, in the south-east corner, opposite, next to, alongside the river, between.",
      "Tenses that match the time frame: past simple/passive for past-to-present; future or conditional forms for proposed plans.",
    ],
    commonLosses: [
      "Describing each map separately instead of comparing them.",
      "No overview of the overall change.",
      "Vague or wrong location language, or misreading which feature moved where.",
      "Ignoring features that stayed the same when that is a key point, or listing every small feature.",
      "Wrong tense for proposals ('the hotel was built' for a plan).",
    ],
    checklist: [
      {
        ...T1_OVERVIEW,
        label: "Overview of the main changes",
        check: "Is there an overview stating the most significant overall changes (or differences between plans) without listing details?",
      },
      {
        id: "main_changes",
        label: "Main changes reported",
        check: "Are the main changes between the maps reported (additions, removals, conversions, extensions), with what stayed the same where significant?",
        caps: { no: 5, partly: 6 },
      },
      {
        id: "location_language",
        label: "Clear location language",
        check: "Is each change located clearly and correctly (compass points, prepositions of place, landmarks)?",
      },
      {
        id: "accuracy",
        label: "Features named and placed accurately",
        check: "Are features identified correctly and placed where they are on the map? Mark not_applicable only when no map or description is available.",
        conditional: true,
        caps: { no: 6 },
      },
      {
        id: "comparisons",
        label: "Maps compared, not described separately",
        check: "Does the answer compare the two maps feature by feature or area by area, rather than describing each map separately?",
        caps: { no: 6 },
      },
    ],
  },
};

const LETTER_COMMON_MUST_DO = [
  "State the purpose of the letter clearly in the first one or two sentences.",
  "Cover ALL THREE bullet points, each developed with relevant detail (usually one paragraph each). Inventing realistic details is fine and expected.",
  "Keep one tone throughout that fits the recipient and the situation.",
  "Use an opening and closing that match the relationship, and end with a closing line that fits the purpose.",
  "Write as a letter (no title, no addresses needed); the reader must know what you want them to do.",
];

const LETTER_COMMON_LOSSES = [
  "A bullet point missed or covered in a single vague sentence.",
  "Purpose unclear until the middle of the letter, or never stated.",
  "Tone that shifts (formal phrases next to slang) or does not fit the reader.",
  "Wrong opening/closing for the relationship (e.g. 'Yours faithfully' to a friend, 'Hi mate' to a company).",
  "Memorised letter templates that do not fit the situation.",
  "Under 150 words, usually because the bullet points are not developed.",
];

function letterChecklist(toneLabel: string, toneCheck: string, openingCheck: string): ChecklistDef[] {
  return [
    {
      id: "purpose",
      label: "Purpose clear from the start",
      check: "Is the reason for writing clear in the opening sentences and consistent through the letter?",
      caps: { no: 5, partly: 6 },
    },
    {
      id: "bullet_1",
      label: "Bullet point 1 covered and developed",
      check: "Is the FIRST bullet point addressed with relevant detail? 'partly' if mentioned but not developed; 'no' if missing.",
      caps: { no: 5, partly: 6 },
    },
    {
      id: "bullet_2",
      label: "Bullet point 2 covered and developed",
      check: "Is the SECOND bullet point addressed with relevant detail? 'partly' if mentioned but not developed; 'no' if missing.",
      caps: { no: 5, partly: 6 },
    },
    {
      id: "bullet_3",
      label: "Bullet point 3 covered and developed",
      check: "Is the THIRD bullet point addressed with relevant detail? 'partly' if mentioned but not developed; 'no' if missing.",
      caps: { no: 5, partly: 6 },
    },
    { id: "tone", label: toneLabel, check: toneCheck, caps: { no: 5, partly: 6 } },
    {
      id: "opening_closing",
      label: "Opening and closing fit the reader",
      check: openingCheck,
      caps: { no: 6 },
    },
  ];
}

// CONSERVATIVE: a bullet point that is missing entirely is a band-4 feature in a
// strict reading; the deterministic ceiling is set at 5 (the model is told that
// 4 is likely) so that the server never pushes a band lower than an examiner might.
const LETTER_GUIDES: Record<Task1GeneralVariant, VariantGuide> = {
  letter_formal: {
    variant: "letter_formal",
    taskType: "task1_general",
    name: "General Training Task 1: formal letter (to a company, official or someone you do not know)",
    mustDo: [
      ...LETTER_COMMON_MUST_DO,
      "Formal register: no contractions, no slang, polite indirect requests ('I would be grateful if you could…').",
      "Opening 'Dear Sir or Madam,' (name unknown) or 'Dear Mr/Ms Surname,'; closing 'Yours faithfully,' or 'Yours sincerely,' respectively, followed by a full name.",
    ],
    commonLosses: [...LETTER_COMMON_LOSSES, "Contractions, chatty phrases or emotional language in a complaint.", "Demanding or rude tone instead of firm and polite."],
    checklist: letterChecklist(
      "Formal tone throughout",
      "Is the register consistently formal and polite (no contractions, slang or chatty asides), and firm but courteous where complaining or requesting?",
      "Formal greeting and sign-off that match each other (Dear Sir or Madam → Yours faithfully; Dear Mr X → Yours sincerely), followed by a full name?",
    ),
  },
  letter_semi_formal: {
    variant: "letter_semi_formal",
    taskType: "task1_general",
    name: "General Training Task 1: semi-formal letter (to someone you know but not closely: a manager, neighbour, landlord, teacher)",
    mustDo: [
      ...LETTER_COMMON_MUST_DO,
      "Semi-formal register: polite and respectful but personal; occasional contractions are acceptable; no slang.",
      "Opening 'Dear Mr/Mrs/Ms Surname,' (or first name if that is how you address them); closing 'Yours sincerely,', 'Kind regards,' or 'Best regards,' with your name.",
    ],
    commonLosses: [...LETTER_COMMON_LOSSES, "Sliding into informal chat with a manager or landlord.", "Over-formal, stiff phrasing to a neighbour you know."],
    checklist: letterChecklist(
      "Polite semi-formal tone",
      "Is the register polite and respectful yet personal, consistent through the letter, without slang or stiff legal phrasing?",
      "Greeting with the person's name and a polite sign-off (Yours sincerely / Kind regards / Best regards) with the writer's name?",
    ),
  },
  letter_informal: {
    variant: "letter_informal",
    taskType: "task1_general",
    name: "General Training Task 1: informal letter (to a friend or family member)",
    mustDo: [
      ...LETTER_COMMON_MUST_DO,
      "Informal, warm register: contractions, phrasal verbs, direct questions and friendly expressions are natural.",
      "Opening 'Dear/Hi + first name,'; closing such as 'Best wishes,', 'Take care,', 'Love,' or 'See you soon,' with your first name.",
    ],
    commonLosses: [...LETTER_COMMON_LOSSES, "Formal phrases to a friend ('I am writing to inform you…', 'Yours faithfully').", "Text-message style (u, gonna, lol) which is too casual even for a friend."],
    checklist: letterChecklist(
      "Friendly informal tone",
      "Is the register warm and natural for a friend (contractions, direct address) without formal set phrases or text-speak?",
      "Friendly greeting with a first name and an informal sign-off with the writer's first name?",
    ),
  },
};

// Task 2 shared checklist items.
const T2_DEVELOPED: ChecklistDef = {
  id: "developed",
  label: "Main ideas explained and supported",
  check: "Is each main idea extended with explanation and a relevant example or consequence, rather than listed or asserted? 'partly' if some ideas are thin or over-generalised.",
  caps: { no: 5, partly: 6 },
};
const T2_CONCLUSION: ChecklistDef = {
  id: "conclusion",
  label: "Conclusion that answers the question",
  check: "Is there a conclusion that sums up the answer to the question (not new ideas, not just repetition of the introduction)?",
  caps: { no: 6 },
};

const T2_COMMON_MUST_DO = [
  "Introduction that paraphrases the question and states the answer/position (thesis).",
  "Two or three body paragraphs, each with one clear central idea that is explained, extended and supported with a relevant example or consequence.",
  "Every part of the question answered; the essay answers THIS question, not the general topic.",
  "A conclusion that clearly sums up the answer.",
];

const T2_COMMON_LOSSES = [
  "Writing about the topic in general instead of the exact question asked.",
  "Ideas listed or asserted without explanation or support; over-generalised examples ('everyone knows that…').",
  "Memorised introductions and templates that do not fit the question.",
  "Copying the question as the introduction.",
  "Under 250 words, or a missing conclusion.",
];

const CLEAR_POSITION: ChecklistDef = {
  id: "clear_position",
  label: "Clear position held throughout",
  check: "Is the writer's position clear in the introduction, consistent in the body, and confirmed in the conclusion? 'partly' if it appears only at the end, wavers, or the extent of agreement is unclear.",
  caps: { no: 5, partly: 6 },
};

const TASK2_GUIDES: Record<Task2Variant, VariantGuide> = {
  opinion: {
    variant: "opinion",
    taskType: "task2",
    name: "Task 2: opinion (to what extent do you agree or disagree / do you agree or disagree)",
    mustDo: [
      ...T2_COMMON_MUST_DO,
      "State a clear position on the statement (agree, disagree, or partly agree with a clearly defined extent) in the introduction and keep it throughout.",
      "All body paragraphs support that position; if the other side is mentioned it is answered, not left hanging.",
    ],
    commonLosses: [
      ...T2_COMMON_LOSSES,
      "Discussing both sides neutrally without saying where the writer stands.",
      "Position stated in the introduction but contradicted or forgotten in the body or conclusion.",
      "'To what extent' answered with no indication of extent.",
    ],
    checklist: [
      CLEAR_POSITION,
      {
        id: "answers_question",
        label: "Answers the exact statement",
        check: "Does the essay respond to the specific claim in the question (all its key words), not only the general topic?",
        caps: { no: 5, partly: 6 },
      },
      T2_DEVELOPED,
      T2_CONCLUSION,
    ],
  },
  discussion: {
    variant: "discussion",
    taskType: "task2",
    name: "Task 2: discussion (discuss both views and give your own opinion)",
    mustDo: [
      ...T2_COMMON_MUST_DO,
      "Discuss the FIRST view with reasons, then the SECOND view with reasons (usually one paragraph each), presenting each fairly even if you disagree.",
      "Give your OWN opinion clearly: in the introduction and conclusion, and/or in the paragraph of the view you support.",
    ],
    commonLosses: [
      ...T2_COMMON_LOSSES,
      "One view developed and the other dismissed in a sentence.",
      "No personal opinion, or an opinion only in the last line.",
      "Mixing both views inside every paragraph so neither is clearly developed.",
    ],
    checklist: [
      { id: "view_1", label: "First view discussed", check: "Is the first view in the question explained with reasons/examples?", caps: { no: 5, partly: 6 } },
      { id: "view_2", label: "Second view discussed", check: "Is the second view in the question explained with reasons/examples?", caps: { no: 5, partly: 6 } },
      {
        id: "own_opinion",
        label: "Own opinion clearly given",
        check: "Does the writer state their own opinion clearly and consistently (introduction and/or conclusion)? 'partly' if vague or only in the final sentence.",
        caps: { no: 5, partly: 6 },
      },
      T2_DEVELOPED,
      T2_CONCLUSION,
    ],
  },
  advantages_disadvantages: {
    variant: "advantages_disadvantages",
    taskType: "task2",
    name: "Task 2: advantages and disadvantages (incl. 'do the advantages outweigh the disadvantages?')",
    mustDo: [
      ...T2_COMMON_MUST_DO,
      "Develop BOTH advantages and disadvantages with explanation and examples.",
      "When the question asks whether one outweighs the other, give a clear verdict in the introduction and conclusion and make the body support it (e.g. by showing why the disadvantages are less serious).",
    ],
    commonLosses: [
      ...T2_COMMON_LOSSES,
      "Only one side developed.",
      "No verdict when the question asks 'Do the advantages outweigh the disadvantages?'.",
      "A verdict that the body paragraphs do not support.",
    ],
    checklist: [
      { id: "advantages", label: "Advantages developed", check: "Are advantages explained with reasons/examples?", caps: { no: 5, partly: 6 } },
      { id: "disadvantages", label: "Disadvantages developed", check: "Are disadvantages explained with reasons/examples?", caps: { no: 5, partly: 6 } },
      {
        id: "verdict",
        label: "Clear verdict on which side outweighs",
        check: "If the question asks whether advantages outweigh disadvantages (or similar), is a clear verdict given and supported? Mark not_applicable if the question only asks for advantages and disadvantages.",
        conditional: true,
        caps: { no: 5, partly: 6 },
      },
      T2_DEVELOPED,
      T2_CONCLUSION,
    ],
  },
  problem_solution: {
    variant: "problem_solution",
    taskType: "task2",
    name: "Task 2: problem/solution (incl. causes + solutions, causes + effects)",
    mustDo: [
      ...T2_COMMON_MUST_DO,
      "Answer BOTH parts the question names (problems/causes AND solutions/effects), each developed in its own paragraph.",
      "Solutions should be specific (who does what, how) and respond to the problems or causes actually discussed.",
    ],
    commonLosses: [
      ...T2_COMMON_LOSSES,
      "One part developed and the other given one or two sentences.",
      "Vague solutions ('the government should do something').",
      "Solutions that do not match the problems or causes raised.",
      "Giving an opinion essay when the question asks for causes and solutions.",
    ],
    checklist: [
      {
        id: "part_1",
        label: "Problems or causes explained",
        check: "Is the first part the question asks for (problems or causes) explained with reasons/examples?",
        caps: { no: 5, partly: 6 },
      },
      {
        id: "part_2",
        label: "Solutions or effects developed",
        check: "Is the second part the question asks for (solutions or effects) developed specifically?",
        caps: { no: 5, partly: 6 },
      },
      {
        id: "linked",
        label: "Solutions match the problems",
        check: "Do the solutions respond to the problems or causes actually discussed? Mark not_applicable for a causes + effects question.",
        conditional: true,
      },
      T2_DEVELOPED,
      T2_CONCLUSION,
    ],
  },
  two_part: {
    variant: "two_part",
    taskType: "task2",
    name: "Task 2: two-part question (two direct questions)",
    mustDo: [
      ...T2_COMMON_MUST_DO,
      "Answer BOTH questions directly and fully, usually one body paragraph each, and state both answers in the introduction.",
      "Where a question asks for an opinion (e.g. 'Is this a good thing?'), give a clear one.",
    ],
    commonLosses: [
      ...T2_COMMON_LOSSES,
      "The second question answered in one sentence or not at all.",
      "Answering a different question (e.g. writing about advantages when asked 'why').",
    ],
    checklist: [
      { id: "question_1", label: "First question answered fully", check: "Is the first question answered directly and developed?", caps: { no: 5, partly: 6 } },
      { id: "question_2", label: "Second question answered fully", check: "Is the second question answered directly and developed?", caps: { no: 5, partly: 6 } },
      T2_DEVELOPED,
      T2_CONCLUSION,
    ],
  },
  positive_negative: {
    variant: "positive_negative",
    taskType: "task2",
    name: "Task 2: positive or negative development",
    mustDo: [
      ...T2_COMMON_MUST_DO,
      "Give a clear judgement (positive, negative, or mainly one with a stated reservation) in the introduction and keep it throughout.",
      "Support the judgement with developed reasons; any acknowledgement of the other side should not blur the judgement.",
    ],
    commonLosses: [
      ...T2_COMMON_LOSSES,
      "Listing positives and negatives without deciding.",
      "Explaining why the development happens instead of judging it.",
    ],
    checklist: [
      {
        id: "clear_judgement",
        label: "Clear judgement held throughout",
        check: "Does the writer clearly judge the development as positive or negative (or mainly one) and hold that judgement throughout? 'partly' if it is mixed without a clear lean or appears only at the end.",
        caps: { no: 5, partly: 6 },
      },
      {
        id: "reasons",
        label: "Judgement supported with reasons",
        check: "Is the judgement supported with developed reasons and examples linked to the development in the question?",
        caps: { no: 5, partly: 6 },
      },
      T2_DEVELOPED,
      T2_CONCLUSION,
    ],
  },
};

export const VARIANT_GUIDES: Record<TaskVariant, VariantGuide> = {
  ...ACADEMIC_GUIDES,
  ...LETTER_GUIDES,
  ...TASK2_GUIDES,
};

export function guideFor(variant: TaskVariant): VariantGuide {
  const g = VARIANT_GUIDES[variant];
  if (!g) throw new Error(`No rubric guide for variant ${String(variant)}`);
  return g;
}

export function checklistFor(variant: TaskVariant): ChecklistDef[] {
  return guideFor(variant).checklist;
}

// ───────────────────────── Ceilings (told to the model, enforced by the server) ─────────────────────────

/**
 * Plain-language ceilings for the prompt. The numeric ones are mirrored in
 * postprocess.ts (checklist caps, length, off-topic, ≤20 words, non-English).
 */
export function ceilingsFor(taskType: TaskType, variant: TaskVariant): string[] {
  const label = TASK_RULES[taskType].taskCriterionLabel;
  const out: string[] = [];
  for (const item of checklistFor(variant)) {
    if (item.caps?.no !== undefined) out.push(`"${item.label}" not met → ${label} at most ${item.caps.no}.`);
    if (item.caps?.partly !== undefined) out.push(`"${item.label}" only partly met → ${label} at most ${item.caps.partly}.`);
  }
  out.push(`Far below the word minimum (under ${Math.ceil(TASK_RULES[taskType].minWords * SEVERE_UNDER_LENGTH_RATIO)} words) → ${label} at most 5.`);
  out.push(`Response substantially off-topic or tangential → ${label} at most 4.`);
  out.push("20 words or fewer → band 1 on every criterion. Written in a language other than English → band 0 on every criterion.");
  if (taskType === "task1_general") {
    out.push(`A bullet point ignored completely usually means ${label} 4, at most 5.`);
  }
  return out;
}

// ───────────────────────── Prompt rendering ─────────────────────────

function renderBands(title: string, levels: BandLevel[]): string {
  return [`${title}:`, ...levels.map((l) => `  ${l.band}: ${l.text}`)].join("\n");
}

/**
 * Rubric section for the grader: the four criteria for this task type, the
 * boundary notes, length rules, and ONLY the guide for the given variant.
 */
export function renderRubricForPrompt(taskType: TaskType, variant: TaskVariant): string {
  const guide = guideFor(variant);
  const taskLabel = TASK_RULES[taskType].taskCriterionLabel;
  const parts: string[] = [];
  parts.push("MARKING GUIDE (our own working summary of the four public criteria; bands below 3 and above 9 are described in the global rules).");
  parts.push(renderBands(`${taskLabel} (key "task")`, TASK_BANDS_BY_TYPE[taskType]));
  parts.push(renderBands('Coherence and Cohesion (key "coherence")', COHERENCE_BANDS));
  parts.push(renderBands('Lexical Resource (key "lexical")', LEXICAL_BANDS));
  parts.push(renderBands('Grammatical Range and Accuracy (key "grammar")', GRAMMAR_BANDS));
  parts.push(
    [
      "Boundary decisions:",
      ...BOUNDARY_NOTES.coherence.map((s) => `  [coherence] ${s}`),
      ...BOUNDARY_NOTES.lexical.map((s) => `  [lexical] ${s}`),
      ...BOUNDARY_NOTES.grammar.map((s) => `  [grammar] ${s}`),
    ].join("\n"),
  );
  parts.push(["Global rules:", ...GLOBAL_RULES.map((s) => `  - ${s}`)].join("\n"));
  parts.push(`Length: ${LENGTH_RULES[taskType]}`);
  parts.push(
    [
      `THIS TASK: ${guide.name}`,
      "A strong answer:",
      ...guide.mustDo.map((s) => `  - ${s}`),
      "Typical ways candidates lose marks:",
      ...guide.commonLosses.map((s) => `  - ${s}`),
      `Ceilings on ${taskLabel} (apply them yourself; the server enforces them too):`,
      ...ceilingsFor(taskType, variant).map((s) => `  - ${s}`),
    ].join("\n"),
  );
  parts.push(
    [
      "CHECKLIST (return one verdict per id, exactly these ids, in this order):",
      ...guide.checklist.map(
        (c) => `  - id "${c.id}" — ${c.label}. ${c.check}${c.conditional ? " (may be not_applicable)" : " (never not_applicable)"}`,
      ),
    ].join("\n"),
  );
  return parts.join("\n\n");
}
