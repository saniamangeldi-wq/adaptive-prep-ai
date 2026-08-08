# Multi-model question verification: viability + the fix that actually closes Aug 13

## Short answer

The idea is sound as a **one-time offline repair + audit pass**, and a bad idea as a **60-second wait at test start**.

- Making a student wait 60s while three models re-check a test is expensive (44 questions x 3 models per test, per student, every time), slow, non-deterministic (two students can get different verdicts on the same item), and it still cannot invent a chart that was never stored.
- Running the same three models **once, offline, over the whole 1,768-question bank**, writing repaired content back to the database, is cheap in comparison, reviewable, and permanent. Delivery then stays instant.

So: yes to multi-model checking, no to doing it at runtime.

## But multi-model is not what the screenshots need

Measured against the live bank right now:

- 1,768 questions total.
- Only **3** contain `^{` / `^(` in the stored data, and **0** contain "greater than or =".
- Yet the screenshots show exactly those strings on screen.

That means the broken math in images 201, 203, 205-208 is **not bad data** — it is our own renderer. `normalizeMathTokens` in `src/lib/sat-content.ts` converts speech tokens into **ASCII** (`^(x)`, `^{2}`, `greater than or =`) and hands that to KaTeX, which has nothing to typeset, so the ASCII leaks to the page. Image 205 proves it: option D is stored as real LaTeX and renders beautifully; options A-C went through the normalizer and render as junk.

No amount of AI re-checking fixes that. It is a deterministic bug in one file, and it accounts for most of what you screenshotted.

Separately, **249** questions do contain genuine speech-math in the data (`Superscript`, `StartFraction`, `percent sign`) and **3** have flattened numeric runs like image 202's `x y 3 21 5 47 8 86` — those are real data problems, and that is where AI repair earns its keep.

## Plan

### Phase 1 — Fix the renderer (deterministic, no AI, fixes the majority)
Change `normalizeMathTokens` to emit **LaTeX**, not ASCII: `^{-2}` instead of `^(-2)`, `\ge`, `\le`, `\times`, `\frac{}{}`, and wrap converted spans in `$...$` so `MathRenderer` typesets them. Add regression tests using the exact strings from the screenshots (`33(0.4)^x`, `(x-1)^2 = -4`, `f(t)=8000(0.65)^t`, `y = 200(4)^x`).

### Phase 2 — Offline multi-model repair pass (your idea, batched)
New admin-only edge function `repair-sat-questions` that walks the bank in batches:
1. **Gemini 3 Pro** rewrites each flagged question into clean LaTeX + structured `table`/`figure` JSON.
2. **GPT-5.5** independently re-solves it and verifies the stated correct answer.
3. **Perplexity Sonar** is used only where a factual/source claim needs checking (a small minority).
4. Agreement on answer + valid structure -> write back, mark `verified`. Disagreement -> mark `needs_review`, never ship.

Runs from `src/pages/admin/UploadTests.tsx` next to the existing backfill button, with progress and a per-batch report. Results recorded in the existing `question_validation_state` / `visual_health_events` tables.

### Phase 3 — Visuals
Charts and graphs that were never captured cannot be regenerated truthfully. For those: reconstruct a **table** when the data is recoverable from text, otherwise quarantine so they never reach a student. Reconstructing a geometry diagram with an LLM risks a confidently wrong figure and is off the table unless you supply the source PDFs.

### Phase 4 — Gate and re-audit
Re-run `scripts/audit-practice-set.ts` across the whole corpus, publish counts (ok / degraded / quarantined), and only questions marked `verified` enter live practice sets.

## Cost and time

Phase 1 is hours and free. Phase 2 is a single pass over ~250-400 flagged items rather than all 1,768, so it's a modest one-off spend through the built-in AI gateway with no key needed. Nothing recurring per student, no 60s wait.

## Technical notes

- Files touched: `src/lib/sat-content.ts` (LaTeX output), `src/lib/__tests__/sat-content.test.ts`, new `supabase/functions/repair-sat-questions/index.ts`, `src/pages/admin/UploadTests.tsx` (trigger + progress), `src/lib/test-generator.ts` (only serve `verified`).
- Model routing per the platform gateway: Gemini 3 Pro for rewriting, GPT-5.5 for independent verification, Sonar for factual spot-checks.
- Every write is idempotent and reversible; original text is preserved alongside the repaired version.

## Open questions

1. Do you have the original OpenSAT PDFs? That is the only way to restore real charts/graphs rather than quarantining them.
2. If two models disagree on an answer, hold the question back (safe, smaller pool) or flag it for you to adjudicate?
