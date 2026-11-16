# Handover

Last updated: 16 Nov 2026, by the lead session (Claude Fable 5.2). Next owner: Claude Opus.
Read `CLAUDE.md` first. Update this file at the end of every session.

## Where things stand

Branch `ielts-writing-only` holds the stripped app: sign-in, chat, IELTS Writing checker. `main` is still the old SAT app and the live site. **Nothing on this branch has been deployed or run against the real database or the AI gateway.**

| Area | State | Checked how |
| --- | --- | --- |
| Strip-down (343 → 124 files in `src/` including the new screens, 60 → 12 edge functions) | Done | Build, type-check, tests; viewed in a browser at 380 px and 1280 px with a mocked session |
| Grading engine, task bank (47 original tasks), drafts, slim chat function | Done | 117 unit tests; entry files type-checked with a Deno shim; **never executed** |
| Writing screens (home, editor, report, history), visuals, chat wired to reports | Code complete; the agent building them was cut off by a usage limit during final polish of the map visual | Build, type-check, 53 unit tests pass. **Not viewed in a browser by anyone after completion** |
| Calibration | Scaffold only (`calibration/`), zero scored scripts | Not run |

Commands (all pass at handover): `npm run build`, `npx tsc -p tsconfig.app.json --noEmit`, `npx vitest run` (15 files, 170 tests).

## Do these next, in order

1. **Look at the writing screens.** Run the built app with mocked function responses from `src/test/fixtures/ielts.ts` and view every screen at 380 px and 1280 px: every visual kind (line, bar, pie, table, mixed, process, map), both report fixtures, the editor's autosave states, the chat chip. Fix what is broken. The map panels (`src/components/writing/TaskVisuals.tsx`, ResizeObserver layout) were being edited when the agent stopped.
2. **First deployment check** (needs Sani; see "Going live"). In order:
   - Grade one bank Task 2 and one bank Academic Task 1. In the function logs find `grade: ok` and note `mode` (`tool` or `json`) and `attempts`. Confirm the row in `ielts_writing_reports` has the full report in `comments`.
   - Send a chat message with a `reportId`; confirm the reply streams and the conversation is saved.
   - Force a failure and confirm the credits come back.
3. **Calibration.** Sani collects 30+ examiner-scored scripts (see `calibration/README.md`). Run `calibration/run-calibration.mjs`. The gate in `CLAUDE.md` applies: no charging until the average error on the overall band is 0.5 or less.
4. **Payment.** Not built. The plan is time-boxed passes, activated by hand at first (see the Project doc `claude/adaptiveprep-foundation.md`). Needs Sani's decisions first.

## Not verified (the backend agent's list)

1. Whether the gateway accepts `tools` / `tool_choice` for the grading model. A JSON-mode fallback exists but only triggers on a 400 that mentions tools or schema.
2. Which auth header the gateway wants (`Lovable-API-Key` or `Authorization: Bearer`). Both are sent.
3. Whether `max_tokens` counts the model's hidden reasoning tokens, and whether temperature 0 is honoured.
4. Whether base64 `image_url` parts reach the model (student-uploaded chart photos).
5. Whether the chat stream keeps the exact `data:` / `[DONE]` format `src/hooks/useAIChat.ts` parses. The old `<think>`-tag stripping was dropped.
6. Whether a full grading fits in the edge function time limit (140 s budget; the retry runs only with 45 s left).
7. supabase-js behaviour against the live schema (`update().select().maybeSingle()`, the `updated_at` trigger).
8. Model ids in `_shared/ielts/models.ts` were copied from the old code and not checked against the gateway's current list.

## Going live (Sani decides when)

- Pushing needs the Claude GitHub App installed on `saniamangeldi-wq/adaptive-prep-ai`. At handover, pushes from the lead session were refused.
- Merging to `main` makes Lovable sync and deploy. That replaces the live SAT site for the existing 188 accounts. Safer first step: test the branch in a Lovable preview or a remix of the project, if Lovable allows a branch preview. This was not investigated.
- No database migration is needed. Old tables stay. Do not drop anything.
- Deleted edge functions may stay deployed in Lovable Cloud until removed there; harmless, but they still cost nothing only if nobody calls them.
- `public/sw.js` and `public/app-sw.js` are self-unregistering service workers so browsers with the old installable app clean themselves up. Keep them for a few months.
- `package.json` and the lockfiles were deliberately not touched. Unused dependencies remain (`@lovable.dev/mcp-js`, `vite-plugin-pwa`, `@elevenlabs/react`, `pdfjs-dist`, and others). Prune them in a session that can run Lovable's own install.

## Decisions waiting for Sani

- **Domain:** code uses both `adaptiveprep.org` and `adaptivetestprep.org` (`src/components/seo/PageSeo.tsx`, `index.html`). The welcome email links to `adaptive-prep-ai.lovable.app`. Pick one.
- **Existing subscribers:** the billing page is gone. `Terms.tsx` now says to cancel by emailing hello@adaptiveprep.org. Confirm that mailbox exists, and review the Terms (free-trial and credit-pack clauses are still there).
- **Free allowance:** every signed-in user gets the old daily credits (15 a day on the free tier = 3 gradings; new accounts start on the old trial values set by the database trigger). Decide the real free limit when payment is designed.
- **Russian and Kazakh interface strings** added in Settings and navigation were machine-written; a native speaker should check them.
- **Public repo:** the GitHub repo is public. Decide whether it should be private.

## Design decisions already taken (change only with a reason)

- **Rounding:** a task's overall band is the mean of the four criteria rounded DOWN to the half band (7, 7, 7, 6 → 6.5). The rule for a single task is not published; this follows what IELTS teachers report and avoids inflation. `roundToHalfBand` (quarter points up) is kept for comparison in calibration. See `_shared/ielts/bandMath.ts`.
- **Server-side ceilings** (`_shared/ielts/postprocess.ts`, `rubric.ts`): not English → all criteria 0; 20 words or fewer → all 1; under two thirds of the minimum length → task criterion at most 5; off-topic → task criterion at most 4; required checklist item "no" → 5, "partly" → 6. Applied ceilings are listed in `GradeReport.adjustments` and shown in the report.
- **Quotes** the model gives that are not in the script are dropped, never shown with invented positions.
- **Bank tasks:** the server uses its own copy of a bank task and ignores what the client sends.
- **Credits:** `consume_ai_credits` cannot refund, so `credits.ts` refunds with a guarded update. Costs are in `contract.ts` (`CREDIT_COST`).
- **Chat:** `student-chat` does not write `ai_conversations`; the web hook does.
- **Grader version:** `w1.0.0`. Bump it on any change to rubric, prompt or post-processing.
- **Contract:** version 1, with one additive field (`GradeReport.adjustments`).

## Known gaps

- No report-a-problem button (the old one was SAT-shaped and was deleted; `report-bug` function remains).
- No no-account "free band check" on the landing page (would need an unauthenticated model endpoint with abuse limits).
- No error profile or drills, no share link, no payment, no progress beyond the simple history chart.
- Uploaded chart images live only on the student's device; a report graded with an image cannot show that image later.
- The landing page is English only.

## Working in this repo from a cloud session

- `package-lock.json` points 174 packages at Lovable's private registry mirror, which cloud sessions cannot reach, and it is out of sync with `package.json`. To install: copy the lockfile aside, replace `https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/` with `https://registry.npmjs.org/` in it, run `npm install`, then restore the original lockfile. Do not commit lockfile changes.
- Edge functions cannot run here. Put logic in `supabase/functions/_shared/ielts/` and test it from `src/test/ielts/`.
- The old app is at git `main` if you need to look something up.
