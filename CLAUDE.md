# AdaptivePrep — AI study assistant with an IELTS Writing checker

Read this first, then `HANDOVER.md` for current status and the next tasks.

## What this product is

An AI study assistant on the existing AdaptivePrep domain, accounts and database. Direction set by Sani on 16 Nov 2026 (late):

1. **Landing page** that sells it plainly.
2. **Chat-first dashboard** after sign-in (Google or email). The layout follows the conventions people already know from AI chat apps (history in a sidebar, a centred composer on a new chat), in AdaptivePrep's own visual identity. It is NOT a copy of Claude, Perplexity or any other product: no borrowed logos, wordmarks, colours, fonts, icons, copy or pixel-matched screens.
3. **IELTS Writing checker**: every writing task and variant, estimated band on the four criteria, feedback tied to the student's own sentences. Reachable from the dashboard.
4. **The existing payment plans** (Free, $5, $10, $21 a month through the existing Stripe links and webhook). Prices and Stripe products do not change without Sani.

Owner: Sani (solo, limited budget). Money goal: USD 3,000 profit within 90 days of December 2026; plan at https://claude.ai/artifact/3wyykvgpTyMjyqtJFCo17J. Every decision favours low running cost and few moving parts.

## Later, not now

Sani wants the assistant to connect to Google (Drive, Calendar and other Google data) and to Apple equivalents in the future. Do not build this yet and do not show "coming soon" UI for it. Keep the chat code structured so tools/connectors can be added (one place where the request to `student-chat` is built; one place where the server assembles context). Before any work on it, tell Sani: Google requires app verification for Drive and Calendar scopes (a security review for the restricted ones), and Apple offers no general web API for iCloud Drive or Calendar comparable to Google's, so the Apple side needs its own research.

## Scope lock

- Do not add features outside the list above. SAT, flashcards, lessons, roles (tutor/teacher/school), learning-style quizzes, gamification, university match, voice, image generation, "coming soon" pages: all removed on purpose. Do not bring them back.
- If a request needs something outside scope, say so and ask Sani before building.
- No fake numbers, placeholder panels or invented testimonials anywhere in the UI.
- Bands are always labelled **estimated**. The product is not affiliated with or endorsed by the IELTS partners; the footer says so.
- Original content only: no task prompts, charts or sample answers copied from Cambridge, British Council or IDP materials. Rubric text is written in our own words, never pasted from the official descriptors.
- Plan descriptions on the pricing page must state only what a tier really gives in this product (daily credits and what they buy). Never list a feature that no longer exists.

## Stack

React 18 + Vite + TypeScript + Tailwind + shadcn/ui. Supabase (Lovable Cloud): auth, Postgres, edge functions (Deno). Model calls go through the Lovable AI Gateway and happen only inside edge functions.

## Layout

```
supabase/functions/_shared/ielts/   Pure TS shared by server and web (no Deno/browser APIs)
  contract.ts                       Types + constants. The single source of truth.
supabase/functions/ielts-grade-writing/        Grades a script → GradeReport
supabase/functions/ielts-generate-writing-task/ Returns a task from the bank, or generates one
supabase/functions/ielts-draft/                Autosave (save / get / list / discard)
supabase/functions/student-chat/               The coach
src/                                           Web app; imports shared code via `@ielts/*`
calibration/                                   Examiner-scored scripts + error script (the quality gate)
```

## Rules for the grader

- The model proposes criterion bands with evidence; the **server** computes the overall band, offsets, tag counts and flags. Never trust a model-supplied overall.
- Invalid model output is an error (`grader_invalid_output`), never a default band.
- Any change to rubric text, prompts or post-processing bumps `GRADER_VERSION`.
- Calibration gate: do not charge money until the average error on the overall band is 0.5 or less across at least 30 examiner-scored scripts in `calibration/`. A grader change that makes the error worse does not merge.
- Model names live in one file (`_shared/ielts/models.ts`). Cheap model for chat and task generation, strong model for grading.

## Database

The live database is shared with the old app and still holds its ~80 tables. **Do not drop or alter existing tables.** This code is written to run on the existing schema with no migration: reports go in `ielts_writing_reports` (full report JSON in `comments`), drafts in `ielts_sessions`, chats in `ai_conversations`, daily caps via the `consume_ai_credits` RPC. New migrations must be additive and need Sani's go-ahead before they are applied.

## Working rules

- `npm run build`, `npx tsc -p tsconfig.app.json --noEmit` and `npm test` must pass before a commit.
- Branch: `ielts-writing-only`. `main` is the old live app; merging to `main` deploys through Lovable, so only Sani decides when.
- One task per session, small commits, update `HANDOVER.md` at the end of every session.
- Edge functions cannot be run locally in most sessions (no gateway key). Keep logic that can be tested in `_shared/ielts/` as pure functions with unit tests.
