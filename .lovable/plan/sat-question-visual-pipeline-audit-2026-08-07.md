# SAT Question Visual Pipeline Audit

## Findings

**1. Where questions are generated and stored**
- Bulk import: `supabase/functions/process-sat-pdf/index.ts` (PDF text extraction + AI structuring) writes into the `sat_tests` table.
- Single-question generation: `supabase/functions/generate-sat-question/index.ts`.
- Repair/backfill: `supabase/functions/restructure-sat-media/index.ts` (Gemini reconstructs `table` and inline `<svg>` `figure` from flattened prose), triggered from `src/pages/admin/UploadTests.tsx`.
- Storage model: questions live as a JSONB array in `sat_tests.questions`. There is **no separate questions table and no media table**.

**2. Current schema (relevant)**
- `sat_tests`: 16 columns; `questions jsonb`, `is_official`, `section`, `difficulty`, RLS-protected, `is_official` forced false for non-service-role by trigger `enforce_sat_tests_is_official`.
- `test_modules`, `module_attempts`, `test_attempts` reference tests/attempts; none carry media.
- Storage buckets: `portfolios`, `conversation-uploads`, `generated-documents`. **No bucket holds SAT question images.**

**3. Measured data state (live DB)**
- 1,768 stored questions total.
- 1 question has a `figure`; 1 has a `table`; 0 have `image_url`; 0 have `visual_unavailable = true`.
- 191 questions contain a visual reference phrase ("the graph", "the table above", etc.).
- 29 questions still contain verbalized math tokens like `Superscript` / `Baseline`.

So ~190 questions reference a visual that was never captured, which exactly matches the "every visual question shows Source visual unavailable" report.

**4. Where visual metadata is created**
Only inside the AI prompt output of `process-sat-pdf` (`figure`, `table`, `stimulus` fields) and `restructure-sat-media`. The PDF extractor is text-only — it never rasterizes or crops page images, so figures from the source PDF are structurally lost at import time.

**5. Where questions are selected for delivery**
`src/lib/test-generator.ts` (assembly, dedup, normalization) consumed by `src/pages/TakeTest.tsx` and `src/pages/TakeSATTest.tsx`. Selection does not filter or flag questions with missing visuals.

**6. Where "Source visual unavailable" is rendered**
`src/components/test/QuestionMedia.tsx` → `VisualFallback()` (line ~70). It is triggered by `shouldShowVisualFallback()` in `src/lib/sat-content.ts` (line ~106), whose final clause fires whenever the text mentions a visual and no `figure`/`table` exists. Given the data above, this fires for essentially all visual questions.

**7. Math storage and rendering**
Stored as raw strings in `question.text` / `stimulus` / `options`. Normalization: `normalizeMathTokens()` in `src/lib/sat-content.ts`; rendering: `src/components/MathRenderer.tsx` (KaTeX with `throwOnError: false`) and `src/components/ai/MarkdownMath.tsx`. The normalizer covers `left parenthesis`, `equals`, `squared`, `cubed`, `StartFraction` — but **not** the MathML-speech family: `Superscript`, `Baseline`, `Subscript`, `StartRoot ... EndRoot` variants with `Baseline`, `negative`. Hence `x Superscript negative 2 Baseline` leaks through.

**8. Edge functions for validation / bug reporting**
- `supabase/functions/report-bug/index.ts` exists and already creates GitHub issues (`searchGitHubIssues` / create issue, repo `saniamangeldi-wq/adaptive-prep-ai`), deduping by title. UI entry: `src/components/ReportIssueButton.tsx`.
- **No question-validation edge function exists.**

**9. GitHub issue creation**
Yes — implemented in `report-bug`, but it requires `GITHUB_TOKEN`, which is **not present in the project secrets**, so issue creation currently throws.

**10. Does the frontend verify media actually loads?**
Partially. `QuestionMedia.tsx` has an `onError` handler on `<img>` that flips to the fallback, and validates SVG shape before injecting. There is no verification of URL reachability before delivery and no telemetry when a fallback renders.

**11. RLS on reporting tables**
No reporting table exists (`question_reports`, `question_issues` both absent). Any new table will need explicit `GRANT`s plus RLS policies.

## Relevant Files

- `src/components/test/QuestionMedia.tsx` — fallback + figure/table rendering
- `src/lib/sat-content.ts` — normalization, `shouldShowVisualFallback`, table validation
- `src/lib/question-table.ts` — flattened-table recovery
- `src/lib/test-generator.ts` — `Question` type, selection/assembly
- `src/components/MathRenderer.tsx` — KaTeX rendering
- `src/components/test/QuestionCard.tsx`, `src/components/test/sat/SATQuestionCard.tsx` — question UI
- `supabase/functions/process-sat-pdf/index.ts` — import pipeline (root of data loss)
- `supabase/functions/restructure-sat-media/index.ts` — figure/table reconstruction
- `supabase/functions/report-bug/index.ts`, `src/components/ReportIssueButton.tsx`
- `src/pages/admin/UploadTests.tsx` — backfill trigger
- Tables: `sat_tests`, `test_modules`, `test_attempts`, `module_attempts`

## Root Cause Hypotheses

1. **Primary — data, not rendering.** The PDF import path never captured images or structured tables, so ~190 of 1,768 questions reference visuals that do not exist in the record. The renderer is behaving correctly; it has nothing to draw. The `restructure-sat-media` backfill has effectively not been applied at scale (1 figure, 1 table across the corpus).
2. **Secondary — over-broad fallback.** `shouldShowVisualFallback` triggers on prose phrases alone ("in the table above"), so even questions that are answerable without a visual, or whose data is recoverable from text, get a discouraging grey box.
3. **Math tokens.** `normalizeMathTokens` lacks rules for the `Superscript/Subscript/Baseline/negative` speech family used by the OpenSAT source.

## Proposed Minimal Fix

1. Extend `normalizeMathTokens` in `src/lib/sat-content.ts` to convert `Superscript X Baseline` → `^{X}`, `Subscript X Baseline` → `_{X}`, and `negative N` → `-N`, with regression tests. (Cheap, fully deterministic.)
2. Run `restructure-sat-media` across the full corpus in batches from `src/pages/admin/UploadTests.tsx`, and mark questions it cannot reconstruct with `visual_unavailable = true`.
3. Filter at delivery: in `src/lib/test-generator.ts`, deprioritize/exclude questions where `visual_unavailable` is true, so practice sets stop serving unanswerable items.
4. Only if 1-3 leave gaps: add a lightweight `question_reports` table (with GRANTs + RLS: users insert their own rows, admins read all) and log fallback renders, plus set `GITHUB_TOKEN` so `report-bug` works again.

## Risks and Questions

- Reconstructing geometry diagrams with an LLM risks producing *wrong* figures; safer to mark those `visual_unavailable` and filter them than to render a plausible-but-incorrect diagram.
- Filtering ~190 questions shrinks the usable pool; is that acceptable, or should we re-ingest from source PDFs with real image extraction?
- Do you still have the original OpenSAT PDFs? Real image cropping at import (page render → crop → upload to a new public `sat-media` bucket) is the only fully correct fix, but it is a larger job.
- `GITHUB_TOKEN` is not configured — should reporting go to GitHub, or to a database table only?
