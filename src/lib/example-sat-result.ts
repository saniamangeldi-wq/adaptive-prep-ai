// Presentation-only fixture: never insert this into test_attempts or progress.
export const canViewExampleSatResult = (email?: string | null) =>
  ['sani.amangeldi@gmail.com', 'sani.amangeldi09@gmail.com'].includes(email?.trim().toLowerCase() ?? '');

export const exampleSatResult = {
  overall: 1190,
  verbal: 520,
  math: 670,
  mathTopics: [
    { name: 'Algebra', total: 15, mistakes: 2, review: 'Review linear equations, systems of equations, and inequalities.' },
    { name: 'Advanced Math', total: 15, mistakes: 2, review: 'Review quadratic equations, equivalent expressions, and nonlinear functions.' },
    { name: 'Problem-Solving and Data Analysis', total: 8, mistakes: 0, review: 'Maintain your strength in ratios, percentages, and interpreting data.' },
    { name: 'Geometry and Trigonometry', total: 6, mistakes: 1, review: 'Review right-triangle trigonometry: sine, cosine, and tangent.' },
  ],
  verbalTopics: [
    { name: 'Information and Ideas', total: 15, mistakes: 3, review: 'Practice identifying central ideas and supporting evidence.' },
    { name: 'Craft and Structure', total: 14, mistakes: 4, review: 'Review words in context, text purpose, and cross-text connections.' },
    { name: 'Expression of Ideas', total: 12, mistakes: 3, review: 'Practice transitions and rhetorical synthesis.' },
    { name: 'Standard English Conventions', total: 13, mistakes: 8, review: 'Start here: sentence boundaries, punctuation, and subject–verb agreement.' },
  ],
} as const;