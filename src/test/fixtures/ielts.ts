/**
 * Fixtures for tests and manual browser checks ONLY. Nothing in the shipped app may import this file.
 * All task wording and sample scripts here are original.
 */
import {
  CONTRACT_VERSION,
  type DraftRecord,
  type GradeReport,
  type InlineIssue,
  type WritingTask,
} from "@ielts/contract.ts";
import type { ReportRowLike } from "@/lib/ielts/reportRow";
import { countParagraphs, countWords } from "@/lib/ielts/words";

// ───────────────────────── Tasks ─────────────────────────

export const taskLine: WritingTask = {
  id: "fx-line-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "line_graph",
  prompt:
    "The graph shows the average number of hours per week that people in three age groups spent cycling in one city between 2005 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "line",
      title: "Average weekly hours spent cycling, by age group",
      unit: "hours",
      categoryKey: "year",
      series: ["Under 25", "25 to 54", "55 and over"],
      data: [
        { year: "2005", "Under 25": 4.5, "25 to 54": 2.0, "55 and over": 0.8 },
        { year: "2010", "Under 25": 4.0, "25 to 54": 2.6, "55 and over": 1.1 },
        { year: "2015", "Under 25": 3.2, "25 to 54": 3.4, "55 and over": 1.9 },
        { year: "2020", "Under 25": 2.8, "25 to 54": 4.1, "55 and over": 3.0 },
      ],
    },
  ],
  topic: "transport",
  minWords: 150,
  timeMinutes: 20,
};

export const taskBar: WritingTask = {
  id: "fx-bar-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "bar_chart",
  prompt:
    "The bar chart shows the percentage of households with a home garden in four cities in two different years.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "bar",
      title: "Households with a home garden (%)",
      unit: "%",
      categoryKey: "city",
      series: ["2000", "2020"],
      data: [
        { city: "Arden", "2000": 62, "2020": 48 },
        { city: "Brook", "2000": 35, "2020": 41 },
        { city: "Calder", "2000": 51, "2020": 29 },
        { city: "Dunmore", "2000": 70, "2020": 66 },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskPie: WritingTask = {
  id: "fx-pie-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "pie_chart",
  prompt:
    "The pie chart shows how a small community library spent its yearly budget.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "pie",
      title: "Library spending by category",
      unit: "%",
      categoryKey: "category",
      series: ["Share"],
      data: [
        { category: "Staff", Share: 45 },
        { category: "Books and journals", Share: 25 },
        { category: "Building costs", Share: 15 },
        { category: "Computers", Share: 10 },
        { category: "Events", Share: 5 },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskTable: WritingTask = {
  id: "fx-table-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "table",
  prompt:
    "The table gives information about the average monthly cost of renting a one-bedroom flat in five towns in two years.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "table",
      title: "Average monthly rent, one-bedroom flat",
      unit: "euros",
      categoryKey: "town",
      series: ["2010", "2022", "Change"],
      data: [
        { town: "Ashby", "2010": 420, "2022": 610, Change: "+45%" },
        { town: "Barrow", "2010": 380, "2022": 395, Change: "+4%" },
        { town: "Corley", "2010": 510, "2022": 880, Change: "+73%" },
        { town: "Derwent", "2010": 450, "2022": 470, Change: "+4%" },
        { town: "Elmford", "2010": 600, "2022": 1020, Change: "+70%" },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskMixed: WritingTask = {
  id: "fx-mixed-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "mixed",
  prompt:
    "The bar chart shows the number of visitors to a science museum each month, and the pie chart shows where the visitors came from.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "bar",
      title: "Visitors per month (thousands)",
      unit: "thousands",
      categoryKey: "month",
      series: ["Visitors"],
      data: [
        { month: "Jan", Visitors: 12 },
        { month: "Feb", Visitors: 14 },
        { month: "Mar", Visitors: 18 },
        { month: "Apr", Visitors: 24 },
        { month: "May", Visitors: 22 },
        { month: "Jun", Visitors: 30 },
      ],
    },
    {
      kind: "pie",
      title: "Origin of visitors",
      unit: "%",
      categoryKey: "origin",
      series: ["Share"],
      data: [
        { origin: "Local", Share: 52 },
        { origin: "Rest of the country", Share: 33 },
        { origin: "Abroad", Share: 15 },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskProcess: WritingTask = {
  id: "fx-process-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "process",
  prompt:
    "The diagram shows how used glass bottles are recycled into new bottles.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "process",
      title: "Recycling glass bottles",
      cyclic: false,
      steps: [
        { id: "s1", label: "Bottles collected", detail: "from bottle banks and kerbside bins" },
        { id: "s2", label: "Sorted by colour" },
        { id: "s3", label: "Crushed into small pieces", detail: "called cullet" },
        { id: "s4", label: "Mixed with raw materials" },
        { id: "s5", label: "Melted in a furnace" },
        { id: "s6", label: "Moulded into new bottles" },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskCycle: WritingTask = {
  id: "fx-cycle-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "process",
  prompt: "The diagram shows the life cycle of a frog.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "process",
      title: "Life cycle of a frog",
      cyclic: true,
      steps: [
        { id: "a", label: "Eggs laid in water" },
        { id: "b", label: "Tadpoles hatch" },
        { id: "c", label: "Legs grow", detail: "tail begins to shrink" },
        { id: "d", label: "Adult frog" },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskProcessBranching: WritingTask = {
  id: "fx-process-02",
  source: "bank",
  taskType: "task1_academic",
  variant: "process",
  prompt: "The diagram shows how a small water works treats river water.\n\nSummarise the information by selecting and reporting the main features.",
  bullets: [],
  visuals: [
    {
      kind: "process",
      title: "Treating river water",
      cyclic: false,
      steps: [
        { id: "in", label: "River water pumped in" },
        { id: "sc", label: "Screen removes large objects" },
        { id: "se", label: "Settling tank" },
        { id: "fi", label: "Sand filter" },
        { id: "sl", label: "Sludge removed" },
        { id: "ch", label: "Chlorine added" },
      ],
      links: [
        { from: "in", to: "sc" },
        { from: "sc", to: "se" },
        { from: "se", to: "fi", label: "clear water" },
        { from: "se", to: "sl", label: "solids" },
        { from: "fi", to: "ch" },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskMap: WritingTask = {
  id: "fx-map-01",
  source: "bank",
  taskType: "task1_academic",
  variant: "map",
  prompt:
    "The maps show a village in 1995 and the same village today.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  bullets: [],
  visuals: [
    {
      kind: "map",
      title: "Pinebrook village",
      panels: [
        {
          label: "1995",
          features: [
            { id: "r1", label: "Main road", type: "road", x: 0, y: 46, w: 100, h: 8 },
            { id: "f1", label: "Farmland", type: "farmland", x: 0, y: 0, w: 58, h: 42 },
            { id: "h1", label: "Houses", type: "housing", x: 62, y: 8, w: 30, h: 30 },
            { id: "w1", label: "River", type: "water", x: 0, y: 84, w: 100, h: 14 },
            { id: "s1", label: "School", type: "building", x: 10, y: 60, w: 22, h: 18 },
          ],
        },
        {
          label: "Today",
          features: [
            { id: "r2", label: "Main road", type: "road", x: 0, y: 46, w: 100, h: 8 },
            { id: "h2", label: "New houses", type: "housing", x: 0, y: 4, w: 56, h: 36 },
            { id: "h3", label: "Houses", type: "housing", x: 62, y: 8, w: 30, h: 30 },
            { id: "w2", label: "River", type: "water", x: 0, y: 84, w: 100, h: 14 },
            { id: "s2", label: "School", type: "building", x: 10, y: 60, w: 22, h: 18 },
            { id: "p2", label: "Car park", type: "parking", x: 38, y: 60, w: 22, h: 18 },
            { id: "g2", label: "Park", type: "green", x: 66, y: 58, w: 30, h: 22 },
          ],
        },
      ],
    },
  ],
  minWords: 150,
  timeMinutes: 20,
};

export const taskLetter: WritingTask = {
  id: "fx-letter-01",
  source: "bank",
  taskType: "task1_general",
  variant: "letter_semi_formal",
  prompt:
    "You recently moved into a flat and the neighbour upstairs plays loud music in the evenings. You have not met this neighbour before.\n\nWrite a letter to the neighbour. In your letter:",
  bullets: ["introduce yourself and explain who you are", "describe how the noise affects you", "suggest what could be done about it"],
  visuals: [],
  minWords: 150,
  timeMinutes: 20,
};

export const taskTask2: WritingTask = {
  id: "fx-t2-opinion-01",
  source: "bank",
  taskType: "task2",
  variant: "opinion",
  prompt:
    "Some people believe that children should begin learning a foreign language at primary school rather than at secondary school.\n\nTo what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.",
  bullets: [],
  visuals: [],
  topic: "education",
  minWords: 250,
  timeMinutes: 40,
};

export const allTaskFixtures: WritingTask[] = [
  taskLine,
  taskBar,
  taskPie,
  taskTable,
  taskMixed,
  taskProcess,
  taskCycle,
  taskProcessBranching,
  taskMap,
  taskLetter,
  taskTask2,
];

// ───────────────────────── Reports ─────────────────────────

function locate(script: string, quote: string): { start: number | null; end: number | null } {
  const i = script.indexOf(quote);
  return i < 0 ? { start: null, end: null } : { start: i, end: i + quote.length };
}

function issue(script: string, quote: string, rest: Omit<InlineIssue, "quote" | "start" | "end">): InlineIssue {
  return { quote, ...locate(script, quote), ...rest };
}

export const task2Script = [
  "In recent years, many parents are asking if their children should start to learn foreign language in primary school. I agree with this idea in a large extent, because young children learn faster and it give them more opportunities in the future.",
  "Firstly, small children have a natural ability to copy sounds. For example, my cousin moved to Germany when she was six and after one year she speak German like a native speaker, while her mother still make many mistakes. Because of this, I belive that early start is the best way to get a good pronunciation.",
  "Secondly, learning a language early can help children in other subjects. They get used to think in different ways and this improve their memory. Also, knowing English or Chinese will be very important for jobs, so children who start early has an advantage when they are adults.",
  "However, some people say that primary school children have too many lessons already. This is true in some cases, but a language lesson can be fun if teachers use games and songs. It does not need to be another boring subject.",
  "In conclusion, I strongly agree that foreign language should be taught from primary school, as the benefits are bigger than the problems.",
].join("\n\n");

const t2 = task2Script;

export const reportTask2: GradeReport = {
  id: "11111111-1111-4111-8111-111111111111",
  contractVersion: CONTRACT_VERSION,
  graderVersion: "fixture-1",
  model: "fixture-model",
  createdAt: "2026-11-10T09:30:00.000Z",
  task: taskTask2,
  variantDetected: null,
  feedbackLang: "en",
  script: t2,
  wordCount: countWords(t2),
  paragraphCount: countParagraphs(t2),
  criteria: {
    task: {
      key: "task",
      label: "Task Response",
      band: 6,
      rationale:
        "You give a clear position in the introduction and keep to it. Your main ideas are relevant, but they are supported by one personal example and a general claim, so development is uneven.",
      evidence: ["I agree with this idea in a large extent", "my cousin moved to Germany when she was six"],
      toNextBand: "Develop one idea fully with a reason and a specific example, and answer the counter-view in more than two sentences.",
    },
    coherence: {
      key: "coherence",
      label: "Coherence and Cohesion",
      band: 6.5,
      rationale: "The answer is clearly organised in paragraphs and each paragraph has a main point. Linking is mostly accurate but a little mechanical (Firstly, Secondly, Also).",
      evidence: ["Firstly, small children have a natural ability", "However, some people say that"],
      toNextBand: "Vary your linking and make the reference between sentences clearer, for example by building on the previous idea instead of listing a new one.",
    },
    lexical: {
      key: "lexical",
      label: "Lexical Resource",
      band: 6,
      rationale: "There is enough vocabulary to discuss the topic, with some less common items (natural ability, advantage). There are some errors in word form and spelling, but meaning stays clear.",
      evidence: ["natural ability to copy sounds", "I belive"],
      toNextBand: "Use more precise topic words instead of repeating 'children' and 'learn', and check word forms.",
    },
    grammar: {
      key: "grammar",
      label: "Grammatical Range and Accuracy",
      band: 5.5,
      rationale: "A mix of simple and complex sentences is attempted, but errors with subject-verb agreement, articles and prepositions appear in most paragraphs and sometimes slow the reader down.",
      evidence: ["it give them more opportunities", "after one year she speak German"],
      toNextBand: "Fix present-tense agreement and articles first; they are the most frequent errors and the easiest to remove with a final check.",
    },
  },
  overallRaw: 6.0,
  overall: 6,
  checklist: [
    { id: "position", label: "Clear position throughout", met: "yes", note: "Agreement is stated at the start and in the conclusion." },
    { id: "both_sides", label: "Other view acknowledged", met: "partly", note: "The counter-view appears in one short paragraph." },
    { id: "examples", label: "Relevant examples", met: "partly", note: "One personal example; the others are general statements." },
    { id: "paragraphs", label: "Introduction, body and conclusion", met: "yes", note: "Five clear paragraphs." },
    { id: "length", label: "At least 250 words", met: countWords(t2) >= 250 ? "yes" : "no", note: `${countWords(t2)} words.` },
  ],
  flags: [],
  confidence: "high",
  summary:
    "A clear, well-organised answer with a consistent position. The main limits are uneven idea development and frequent small grammar errors, especially subject-verb agreement.",
  strengths: ["Clear position stated at the start and repeated in the conclusion", "Logical paragraphs with one main idea each", "A personal example that fits the argument"],
  priorities: [
    { title: "Fix present-tense agreement", why: "It appears in almost every paragraph and holds the grammar band down.", how: "After writing, underline every verb with he, she, it or a singular noun and check the -s ending." },
    { title: "Develop one idea fully", why: "Most ideas stop after one sentence.", how: "For each body paragraph, add a reason (because...) and one specific example." },
    { title: "Check articles and prepositions", why: "Small slips here make sentences sound unnatural.", how: "Check 'in a large extent' and 'learn foreign language' in particular." },
  ],
  issues: [
    issue(t2, "I agree with this idea in a large extent", { criterion: "lexical", tag: "collocation", explanation: "The fixed phrase is 'to a large extent'.", suggestion: "I agree with this idea to a large extent" }),
    issue(t2, "it give them", { criterion: "grammar", tag: "subject_verb_agreement", explanation: "'It' is singular, so the verb needs -s.", suggestion: "it gives them" }),
    issue(t2, "learn foreign language", { criterion: "grammar", tag: "articles", explanation: "A singular countable noun needs an article, or use the plural.", suggestion: "learn a foreign language" }),
    issue(t2, "she speak German like a native speaker, while her mother still make many mistakes", { criterion: "grammar", tag: "subject_verb_agreement", explanation: "Two verbs need the -s ending: 'she speaks' and 'her mother still makes'.", suggestion: "she spoke German like a native speaker, while her mother still made many mistakes" }),
    issue(t2, "speak German like a native speaker", { criterion: "grammar", tag: "verb_tense", explanation: "You are describing a past event, so use the past tense.", suggestion: "she spoke German like a native speaker" }),
    issue(t2, "I belive", { criterion: "lexical", tag: "spelling", explanation: "Spelling: believe.", suggestion: "I believe" }),
    issue(t2, "early start is the best way", { criterion: "grammar", tag: "articles", explanation: "Add an article.", suggestion: "an early start is the best way" }),
    issue(t2, "They get used to think", { criterion: "grammar", tag: "word_form", explanation: "After 'get used to' use the -ing form.", suggestion: "They get used to thinking" }),
    issue(t2, "this improve their memory", { criterion: "grammar", tag: "subject_verb_agreement", explanation: "'This' is singular, so the verb needs -s.", suggestion: "this improves their memory" }),
    issue(t2, "children who start early has an advantage", { criterion: "grammar", tag: "subject_verb_agreement", explanation: "'Children' is plural, so use 'have'.", suggestion: "children who start early have an advantage" }),
    // The quote below does not appear in the script, so it has no offsets.
    { quote: "this is very important for the world economy", start: null, end: null, criterion: "task", tag: "idea_development", explanation: "This claim is not developed. Say why it matters, with an example.", suggestion: "Knowing English can help graduates apply for jobs in international companies." },
  ],
  errorTagCounts: { subject_verb_agreement: 4, articles: 2, verb_tense: 1, collocation: 1, spelling: 1, word_form: 1, idea_development: 1 },
  rewrite: {
    original: "Secondly, learning a language early can help children in other subjects. They get used to think in different ways and this improve their memory.",
    improved:
      "Secondly, learning a language early can also help children in other subjects. Switching between two languages trains them to think in different ways, which improves their memory and concentration.",
    changes: ["Corrected 'get used to think' by rewriting the sentence", "Fixed the agreement error (improves)", "Used a relative clause to join the two ideas", "Added a more precise word (concentration)"],
  },
  modelAnswer:
    "Many parents now ask whether children should begin a foreign language in primary school. I agree to a large extent, because young learners acquire pronunciation more naturally and the habit of learning languages can help them throughout their education.\n\nFirst, young children are very good at imitating sounds. A cousin of mine moved abroad at six and spoke the new language fluently within a year, whereas her mother, who arrived at the same time, still struggled with pronunciation.\n\nIn conclusion, although the timetable is already full, short and playful language lessons are a sensible investment.",
};

const t1 =
  "The line graph shows the average number of hours per week that people in three age groups spent cycling in one city between 2005 and 2020. Under 25 spent 4.5 hours in 2005 and 2.8 hours in 2020. 25 to 54 spent 2 hours in 2005 and 4.1 hours in 2020. 55 and over spent 0.8 hours in 2005 and 3 hours in 2020.";

export const reportTask1Low: GradeReport = {
  id: "22222222-2222-4222-8222-222222222222",
  contractVersion: CONTRACT_VERSION,
  graderVersion: "fixture-1",
  model: "fixture-model",
  createdAt: "2026-11-12T14:05:00.000Z",
  task: taskLine,
  variantDetected: null,
  feedbackLang: "en",
  script: t1,
  wordCount: countWords(t1),
  paragraphCount: countParagraphs(t1),
  criteria: {
    task: {
      key: "task",
      label: "Task Achievement",
      band: 4.5,
      rationale: "The figures are reported correctly, but there is no overview and no comparison between the groups, so the main trends are not identified.",
      evidence: ["Under 25 spent 4.5 hours in 2005 and 2.8 hours in 2020."],
      toNextBand: "Add an overview sentence that names the main trend for each group, then compare the groups.",
    },
    coherence: {
      key: "coherence",
      label: "Coherence and Cohesion",
      band: 5,
      rationale: "The information is in a clear order, but it is one paragraph with almost no linking words.",
      evidence: ["Under 25 spent", "25 to 54 spent"],
      toNextBand: "Use linking words to compare (whereas, while) and split the text into an overview and a detail paragraph.",
    },
    lexical: {
      key: "lexical",
      label: "Lexical Resource",
      band: 4.5,
      rationale: "Vocabulary is limited and the question wording is repeated. Trend language (rise, fall, overtake) is missing.",
      evidence: ["spent 4.5 hours"],
      toNextBand: "Learn a set of verbs and nouns for change and use them instead of repeating 'spent'.",
    },
    grammar: {
      key: "grammar",
      label: "Grammatical Range and Accuracy",
      band: 5,
      rationale: "Sentences are correct but all have the same pattern, so there is little range.",
      evidence: ["55 and over spent 0.8 hours in 2005 and 3 hours in 2020."],
      toNextBand: "Combine two facts in one sentence with a comparison or a time clause.",
    },
  },
  overallRaw: 4.75,
  overall: 5,
  checklist: [
    { id: "overview", label: "Clear overview of the main trends", met: "no", note: "No overview sentence." },
    { id: "key_features", label: "Key features selected and compared", met: "partly", note: "Figures are listed but not compared." },
    { id: "data_accuracy", label: "Data reported accurately", met: "yes", note: "All figures match the graph." },
    { id: "length", label: "At least 150 words", met: "no", note: `${countWords(t1)} words.` },
  ],
  flags: ["severely_under_length", "copied_from_prompt"],
  confidence: "low",
  summary: "The figures are accurate but the answer is very short, copies the question's opening and has no overview, so the estimate is low and less reliable.",
  strengths: ["All figures are accurate"],
  priorities: [
    { title: "Write an overview", why: "It is the main requirement of the task and it is missing.", how: "After the first sentence, write one sentence saying which group rose, which fell, and which ended highest." },
    { title: "Reach the minimum length", why: "A very short answer limits every criterion.", how: "Add a paragraph that compares the groups at the start and at the end." },
  ],
  issues: [
    issue(t1, "The line graph shows the average number of hours per week that people in three age groups spent cycling in one city between 2005 and 2020.", { criterion: "task", tag: "task_coverage", explanation: "This repeats the question almost word for word. Paraphrase it.", suggestion: "The graph compares how long three age groups cycled each week in one city over fifteen years." }),
    issue(t1, "spent 4.5 hours", { criterion: "lexical", tag: "repetition", explanation: "'Spent' is repeated in every sentence. Use trend verbs.", suggestion: "fell from 4.5 hours" }),
  ],
  errorTagCounts: { task_coverage: 1, repetition: 1 },
  rewrite: null,
  modelAnswer: null,
};

// ───────────────────────── Database rows ─────────────────────────

export function rowFromReport(report: GradeReport): ReportRowLike & Record<string, unknown> {
  return {
    id: report.id ?? "row-without-id",
    user_id: "00000000-0000-0000-0000-000000000001",
    session_id: null,
    created_at: report.createdAt,
    updated_at: report.createdAt,
    task_type: report.task.taskType,
    prompt: report.task.prompt,
    chart: null,
    essay: report.script,
    word_count: report.wordCount,
    overall_band: report.overall,
    criteria: report.criteria,
    comments: report,
    model_answer: report.modelAnswer,
  };
}

/** A row written by the old app: flat comments, no contractVersion. */
export const legacyRow: ReportRowLike & Record<string, unknown> = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: "00000000-0000-0000-0000-000000000001",
  session_id: null,
  created_at: "2026-09-20T10:00:00.000Z",
  updated_at: "2026-09-20T10:00:00.000Z",
  task_type: "task2",
  prompt: "Some people think public transport should be free. Discuss both views and give your opinion.",
  chart: null,
  essay: "Public transport is very important in big cities. Some people think it must be free. Other people disagree because it is expensive for the government.",
  word_count: 27,
  overall_band: 5.5,
  criteria: {
    task: { band: 5, comment: "Both views are mentioned but not developed.", label: "Task Response" },
    coherence: { band: 5.5, comment: "Simple but clear organisation.", label: "Coherence and Cohesion" },
    lexical: { band: 5.5, comment: "Basic vocabulary.", label: "Lexical Resource" },
    grammar: { band: 6, comment: "Mostly accurate simple sentences.", label: "Grammatical Range and Accuracy" },
  },
  comments: {
    summary: "A short answer that covers both views only briefly.",
    strengths: ["Clear topic sentence"],
    improvements: ["Develop each view with an example"],
    corrections: [{ original: "it must be free", suggestion: "it should be free", reason: "'Should' is more natural for an opinion." }],
  },
  model_answer: "",
};

export const malformedRows: Array<ReportRowLike & Record<string, unknown>> = [
  { ...legacyRow, id: "bad-1", criteria: null, comments: null },
  { ...rowFromReport(reportTask2), id: "bad-2", comments: { contractVersion: 1, task: "oops" } },
  { ...rowFromReport(reportTask2), id: "bad-3", comments: { ...reportTask2, criteria: { task: { band: "six" } } } },
];

// ───────────────────────── Drafts ─────────────────────────

export const draftFixture: DraftRecord = {
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  task: taskTask2,
  script: "In recent years, many parents are asking if their children should start to learn foreign language in primary school.",
  secondsUsed: 312,
  updatedAt: "2026-11-15T08:00:00.000Z",
};
