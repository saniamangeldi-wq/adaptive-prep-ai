// Presentation-only fixture: never insert this into test_attempts or progress.
export const canViewExampleSatResult = (email?: string | null) =>
  ['sani.amangeldi@gmail.com', 'sani.amangeldi09@gmail.com'].includes(email?.trim().toLowerCase() ?? '');

export type ExampleTopic = {
  name: string;
  total: number;
  mistakes: number;
  review: string;
  note?: string;
  priority?: boolean;
};

export type ExampleSatResultFixture = {
  id: string;
  label: string;
  overall: number;
  verbal: number;
  math: number;
  verbalCorrect: number;
  mathCorrect: number;
  nextFocus: string;
  headline: { title: string; body: string };
  mathTopics: ExampleTopic[];
  verbalTopics: ExampleTopic[];
};

const example1190: ExampleSatResultFixture = {
  id: '1190',
  label: 'Example SAT Results · 1190',
  overall: 1190,
  verbal: 520,
  math: 670,
  verbalCorrect: 36,
  mathCorrect: 39,
  nextFocus: 'Standard English Conventions, then algebra and advanced math.',
  headline: {
    title: 'Focus on Standard English Conventions',
    body: '5 of 13 correct (38%) — your lowest verbal domain. Review punctuation and sentence boundaries first. In math, four of your five mistakes came from algebra and advanced math.',
  },
  mathTopics: [
    { name: 'Algebra', total: 15, mistakes: 2, review: 'Review linear equations, systems of equations, and inequalities.' },
    { name: 'Advanced Math', total: 15, mistakes: 2, review: 'Review quadratic equations, equivalent expressions, and nonlinear functions.' },
    { name: 'Problem-Solving and Data Analysis', total: 8, mistakes: 0, review: 'Maintain your strength in ratios, percentages, and interpreting data.' },
    { name: 'Geometry and Trigonometry', total: 6, mistakes: 1, review: 'Review right-triangle trigonometry: sine, cosine, and tangent.', note: '1 trigonometry mistake · 0 geometry mistakes' },
  ],
  verbalTopics: [
    { name: 'Information and Ideas', total: 15, mistakes: 3, review: 'Practice identifying central ideas and supporting evidence.' },
    { name: 'Craft and Structure', total: 14, mistakes: 4, review: 'Review words in context, text purpose, and cross-text connections.' },
    { name: 'Expression of Ideas', total: 12, mistakes: 3, review: 'Practice transitions and rhetorical synthesis.' },
    { name: 'Standard English Conventions', total: 13, mistakes: 8, review: 'Start here: sentence boundaries, punctuation, and subject–verb agreement.', priority: true },
  ],
};

const example1180: ExampleSatResultFixture = {
  id: '1180',
  label: 'Example SAT Results · 1180',
  overall: 1180,
  verbal: 480,
  math: 700,
  verbalCorrect: 27,
  mathCorrect: 41,
  nextFocus: 'Standard English Conventions — 27 of your 30 mistakes are in Reading & Writing.',
  headline: {
    title: 'Focus on Standard English Conventions',
    body: '1 of 13 correct (8%) — your lowest verbal domain by a wide margin. Review sentence boundaries and punctuation first. Your math score is already strong, so nearly all of the growth is in Reading & Writing.',
  },
  mathTopics: [
    { name: 'Algebra', total: 15, mistakes: 1, review: 'Keep practicing linear systems; one question slipped on a sign error.' },
    { name: 'Advanced Math', total: 15, mistakes: 1, review: 'Review nonlinear systems and equivalent quadratic forms.' },
    { name: 'Problem-Solving and Data Analysis', total: 8, mistakes: 1, review: 'Practice two-way tables and marginal frequency.' },
    { name: 'Geometry and Trigonometry', total: 6, mistakes: 0, review: 'Maintain your strength in circles, angles, and right-triangle trigonometry.' },
  ],
  verbalTopics: [
    { name: 'Information and Ideas', total: 15, mistakes: 5, review: 'Practice central ideas and quantifying evidence from data sources.' },
    { name: 'Craft and Structure', total: 14, mistakes: 6, review: 'Review words in context and author purpose across paired passages.' },
    { name: 'Expression of Ideas', total: 12, mistakes: 4, review: 'Practice transitions and rhetorical synthesis in student-note tasks.' },
    { name: 'Standard English Conventions', total: 13, mistakes: 12, review: 'Start here: sentence boundaries, apostrophes, and subject–verb agreement.', priority: true },
  ],
};

export const exampleSatResults: Record<string, ExampleSatResultFixture> = {
  '1190': example1190,
  '1180': example1180,
};

export const exampleSatResult = exampleSatResults['1190'];

export const getExampleSatResult = (id?: string): ExampleSatResultFixture | undefined =>
  id ? exampleSatResults[id] : example1190;
