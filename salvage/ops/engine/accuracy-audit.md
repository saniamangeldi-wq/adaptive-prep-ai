# Accuracy audit (2026-11-24, branch relaunch-v2, read-only review)

V = verified in code, P = proposal.

## Findings (V)
- `generate-sat-question` calls Gemini directly (GEMINI_API_KEY, gemini-2.5-flash-lite) with a Groq llama-3.1-8b fallback; does not use `_shared/ai.ts`. One call per item; "self-check" happens inside the same generation (not independent). MC only, English-only explanation, no sub-skill/steps/hints.
- Validation (`validateQuestionStructure`, ~line 148) is structural only; inserts with hard-coded `validation_status: "passed"`, `active: true`. Insert uses the caller's anon client but `sat_questions` has SELECT-only RLS, so inserts likely fail. No caller in `src`.
- Students are served `sat_tests.questions` JSON (OpenSAT bank, `test-generator.ts:388`), never `sat_questions`.
- `repair-sat-questions` is the only re-solver (VERIFY_PROMPT ~line 41), only for flagged items; under AI_PROVIDER=gemini the "independent" solver maps to the same model family.
- `report-bug` creates GitHub issues, doesn't retire questions; `ReportIssueButton.tsx` is unused; `sat_question_reports` table unused.

## Grading bugs (V)
1. `test-generator.ts:663` calculateScore, `:230` isMissed, `:250` classifyQuestionOutcomes, `:842` review, `TestResults.tsx:90,251`: `lower().trim() ===`, so grid-in "3/4" vs "0.75", ".75", "1/2" vs ".5", "-.5", "1,000", "5.0" are marked wrong although the UI says fractions/decimals are fine.
2. `QuestionCard.tsx:159-166` strict `===` for review colouring.
3. `shuffleChoices` (`:261-271`) leaves malformed keys untouched; equivalent options ("0.5"/".5") are ambiguous.
4. `quiz-tracker/index.ts:16-26` numericEqual: no mixed numbers; only for text_input.
5. `QuestionWidget.tsx:197` offline fallback: plain `===`, so the verdict flips after server sync.
6. Coach quiz items (`quiz-tracker` insert ~223) store the chat model's key/explanation unverified. **Highest risk.**

## Proposed pipeline (P)
- Schema v2: section, domain, skill, sub_skill, difficulty 1-5, format mc|grid_in, passage, stem, choices, key (`"A"` or `{value, accept[]}`), math.expr_check {numeric answer, tol}, distractor_notes per wrong option, explanation {en,ru,kk}, steps[], hints[3 levels], misconception_tags, source, prompt_version, validation {status, checks, solver_answer, solver_model}.
- Accept only if ALL pass (regenerate at most once): schema + 4 non-equivalent choices + one key; blind independent solve agrees (grid-in compared with shared `isEquivalent`); math numeric answer checked by plain code + safe arithmetic parser on step lines (no eval); every distractor differs from key and has an error type; explanation's final answer matches key; R&W: only one option judged defensible; near-duplicate check (normalised hash + 5-gram Jaccard, reject ≥0.6, ≥0.5 vs OpenSAT bank); difficulty is a hypothesis recalibrated from student correct-rate after ~30 attempts; status provisional → active → quarantined automatically if ≥2 reports or correct-rate <15% / >97% at n≥30.
- Batch generation (~5 items/call), cache forever; never call AI per student view.
- Report loop: wire the existing report button into test review + coach → `sat_question_reports`; 2 reports deactivate the item.
- **Fix the grader first:** one shared `isCorrect(question, given)` used everywhere (calculateScore, isMissed, classifyQuestionOutcomes, review, TestResults, QuestionCard, QuestionWidget offline, quiz-tracker).

## Measuring (P)
200-item stratified blind sample, Wilson 95% CI; target ≥99% key-correct before paid launch; explanation-correct ≥98%; report rate <1/500 views; 50-item re-check per prompt/model change; 30-item gold set of corrupted keys, pipeline must reject ≥90%. Same-family solver shares biases, so the blind human sample is the real number.
