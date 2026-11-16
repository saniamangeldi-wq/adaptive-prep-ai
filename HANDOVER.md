# Handover

Last updated: 16 Nov 2026, by the design session (identity, shell, landing).
Read `CLAUDE.md` first. Update this file at the end of every session.

## In progress right now (started 16 Nov 2026, 23:15 Almaty)

Sani changed the direction (see `CLAUDE.md`, "What this product is"). Three pieces of work were started by sub-agents; if you are taking over mid-way, run `git status` and `git log` to see what landed, then finish whichever is incomplete:

1. **Design, landing page and chat-first dashboard: done (16 Nov 2026), checked in a browser with mocks.**
   - **Identity.** Tokens in `src/index.css` (light and dark; the theme follows the device, Settings has Match device / Light / Dark) and `tailwind.config.ts`. Paper-and-ink palette from the logo's teal (`--primary` 175 84% 25% light, 171 55% 52% dark), one colour per marking criterion (`--crit-task`, `--crit-coherence`, `--crit-lexical`, `--crit-grammar`, used by the report highlights, the legend and the history chart), `shadow-card` and `shadow-float` only. Decorative gradients, glows, the old midnight/sepia themes and the gradient `hero` button are gone (`hero` is now solid primary). Type: Golos Text for the interface, Literata for the student's own writing (editor, highlighted answer, rewrite, quoted examples in chat). Both self-hosted in `public/fonts/` with their OFL licences (Google Fonts is blocked from cloud sessions, and same-origin is faster); the mobile `html { font-size: 14px }` override was removed, so phones get 16 px text and no input zoom. Logo mark: `src/components/brand/Logo.tsx`, an SVG of the app icon's cap on a flat tile.
   - **Shell** (`src/components/dashboard/`): collapsible sidebar (rail when collapsed, remembered per device), a drawer on phones; New chat, Chat, Check an essay, History, recent chats grouped Today / Yesterday / Previous 7 days / Previous 30 days / Older (`conversationGroups.ts`, unit-tested) with open and delete; account menu with name, plan label and daily allowance from `usePlan`, Settings, Billing, Sign out. The open chat lives in the URL (`/dashboard?c=<id>`, with `&report=<id>` when a report is attached), so the sidebar, back button and reload agree.
   - **Chat** (`AICoach.tsx`, `StudentAICoach.tsx`): greeting with first name, large composer, suggestion chips including a shortcut to the checker (report-specific chips kept); conversation view with a 46 rem column, pinned one-row composer, Enter sends and Shift+Enter breaks, "Writing…" while streaming, copy and retry, inline error box. The request to `student-chat` is still built only in `useAIChat`.
   - **Landing** (`src/pages/Index.tsx`, `src/components/landing/`): outcome-first hero, Continue with Google / Sign up with email / Log in, a sample report and a sample chat built from the report's own markup and colours and labelled as samples (`landing/sample.ts`: our own text; the overall follows the round-down rule), the four criteria in our words, every task type read from `VARIANTS_BY_TASK`, three steps, `<Pricing />`, FAQ (free-plan line computed by `planUsage`), footer disclaimer and Terms. One animation: the sample highlight and its comment, off under reduced motion. Login, Signup, Forgot and Reset password restyled with Google first; their auth calls are unchanged.
   - **Checked:** `scripts/preview-with-mocks` with the new `landing` and `shell` scenarios at 380 and 1280 px, light and dark, plus the old public, home, editor-states, report, history and chat scenarios in light: no console errors.
   - **Left:** (a) fixed: the hard-coded `dark` class on `FullScreenSpinner` was removed. (b) The account menu shows the daily allowance, not "credits left today": `profiles.credits_remaining` is only reset on the first paid call of a new day, so before that it is yesterday's balance. To show a true balance, `usePlan` would need `credits_reset_at` and treat a reset before today (UTC) as a full allowance. (c) `src/lib/design-system.ts` (marked LOCKED by the old app) is no longer used by the shell; delete it when convenient. (d) `og-image.png`, the favicons and the apple icon still use the old artwork. (e) Not checked on a real phone; the keyboard case was simulated with a 380 x 420 viewport and `interactive-widget=resizes-content` in `index.html`.
2. **Payment plans restored: done in code (16 Nov 2026), not yet seen in a browser.** `/pricing` (`PricingPage.tsx`, `landing/Pricing.tsx`), `/dashboard/billing` (`Billing.tsx`, `components/billing/CancelSubscriptionDialog.tsx`), `lib/stripe-links.ts` (student links byte-identical), `lib/pricing-config.ts` (names Free/Basic/Pro/Elite, $0/$5/$10/$21 plus the ₸ prices and the 3-month/yearly cycles), `lib/plan-features.ts` (plan bullets derived from `TIER_DAILY_CREDITS` and `CREDIT_COST`), `lib/billing-state.ts` (what each state offers), `lib/tier-limits.ts` (reduced to credits), `hooks/usePlan.ts`. Terms clause 3 has its original "from the Billing page" wording back. Tests: `src/test/app/billing.test.ts`. Tutor/school plans, top-ups, university match, donation banner, trial upsells, revenue calculator and all SAT/test/flashcard/lesson lines stay removed.
   **Left for Sani (read before taking money; details in the session report):**
   - `stripe-webhook` never sets `profiles.tier` on a payment (only `subscription_ends_at` and `is_trial = false`). As coded, a purchase does not change the plan. Nothing in the old repo sets it either. Decide: edit the webhook (map the paid price/link to a tier) or confirm a manual step exists.
   - Payments are matched to accounts by email only (`ilike` on `profiles.email`, `maybeSingle`). The payment links carry no user id.
   - Upgrading or downgrading through a payment link creates a second subscription; the old one stays. When either ends, `customer.subscription.deleted` drops the user to `tier_0` even if another subscription is still active.
   - The billing page says this honestly and asks users to email hello@adaptiveprep.org after switching. Confirm you want to make that promise.
   - Terms clauses that describe things the product does not have are listed in the report (free-trial-converts-to-paid, credit packs).
   - Browser check of `/pricing` and `/dashboard/billing` with `scripts/preview-with-mocks` still to do (item 3).
3. After both: browser check with `scripts/preview-with-mocks`, update this file, commit, push.

Still Sani's call and not done: replacing the live site (merging to `main`).

## Where things stand

Branch `ielts-writing-only` holds the stripped app: sign-in, chat, IELTS Writing checker. `main` is still the old SAT app and the live site. **Nothing on this branch has been deployed or run against the real database or the AI gateway.**

| Area | State | Checked how |
| --- | --- | --- |
| Strip-down (343 → 124 files in `src/` including the new screens, 60 → 12 edge functions) | Done | Build, type-check, tests; viewed in a browser at 380 px and 1280 px with a mocked session |
| Grading engine, task bank (47 original tasks), drafts, slim chat function | Done | 117 unit tests; entry files type-checked with a Deno shim; **never executed** |
| Writing screens (home, editor, report, history), visuals, chat wired to reports | Done; map labels reworked, data-loss paths closed | Viewed in Chrome at 380 px and 1280 px against a mocked Supabase (`scripts/preview-with-mocks`), every screen and state below |
| Web ↔ server agreement | Checked | `src/test/integration/`: the web's real request code (api.ts, useAIChat) against the server's own validators, bank, post-processing and row mapping, in process. Not checked against the deployed functions |
| Calibration | Scaffold only (`calibration/`), zero scored scripts | Not run |

Commands (all pass at handover): `npm run build`, `npx tsc -p tsconfig.app.json --noEmit`, `npx vitest run` (20 files, 281 tests).

## Contract changes

- `LIMITS.maxVisualDescriptionChars` (2000), additive. The server already enforced this limit; now the web uses the same constant.

## Do these next, in order

1. **First deployment check** (needs Sani; see "Going live"). In order:
   - Grade one bank Task 2 and one bank Academic Task 1. In the function logs find `grade: ok` and note `mode` (`tool` or `json`) and `attempts`. Confirm the row in `ielts_writing_reports` has the full report in `comments`.
   - Send a chat message with a `reportId`; confirm the reply streams and the conversation is saved.
   - Force a failure and confirm the credits come back.
2. **Calibration.** Sani collects 30+ examiner-scored scripts (see `calibration/README.md`). Run `calibration/run-calibration.mjs`. The gate in `CLAUDE.md` applies: no charging until the average error on the overall band is 0.5 or less.
3. **Payment.** Not built. The plan is time-boxed passes, activated by hand at first (see the Project doc `claude/adaptiveprep-foundation.md`). Needs Sani's decisions first.

## Not verified (the backend agent's list)

1. Whether the gateway accepts `tools` / `tool_choice` for the grading model. A JSON-mode fallback exists but only triggers on a 400 that mentions tools or schema.
2. Which auth header the gateway wants (`Lovable-API-Key` or `Authorization: Bearer`). Both are sent.
3. Whether `max_tokens` counts the model's hidden reasoning tokens, and whether temperature 0 is honoured.
4. Whether base64 `image_url` parts reach the model (student-uploaded chart photos).
5. Whether the real gateway stream matches the OpenAI-style `data:` / `[DONE]` format. The hook's parser is now tested against that format split at arbitrary byte boundaries (CRLF, keep-alive comments, a final usage chunk, a missing `[DONE]`), so only the gateway side is unverified. The old `<think>`-tag stripping was dropped.
6. Whether a full grading fits in the edge function time limit (140 s budget; the retry runs only with 45 s left).
7. supabase-js behaviour against the live schema (`update().select().maybeSingle()`, the `updated_at` trigger on `ielts_sessions`; draft restore relies on that trigger moving `updated_at` on every save).
9. Whether RLS lets the browser read its own `ielts_writing_reports` rows (report, history and chat pages read them directly; the policy in the migration says yes).
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

## Verification session (16 Nov 2026): what was found and fixed

Web ↔ server mismatches (all covered by `src/test/integration/`):
- Chat error notes ("out of credits", "something went wrong") were sent back to the coach as its own earlier replies and saved in `ai_conversations`. Now flagged `isError` and kept out of both.
- The coach prompt said the overall is rounded to the nearest half band; the server rounds down. Prompt fixed (`chat.ts`; not grader text, so no version bump).
- `too_long` for a large image or description showed "over 600 words"; a bank id the server no longer has showed "We could not find that". Messages fixed in `apiErrors.ts`.
- The missing-chart dialog in the editor had no length cap; the server rejects descriptions over 2000 characters.
- Grade function marked the draft completed even when the report insert failed, so the essay survived only in browser history state. Now the draft stays open, the device copy is kept, and the unsaved report page says the answer is still in Drafts.
- Browser grade timeout (120 s) was shorter than the server's grading budget (140 s): a slow but successful grading looked like a failure. Now 150 s.

Data-loss paths closed in the editor:
- Draft restore compared device and server clocks only; a device clock behind the server lost offline edits. The device copy now stores `serverUpdatedAt` (the server copy it last synced with) and wins whenever that copy is unchanged (`chooseDraft`).
- The editor remounts per session id (no timer of one draft can write into another), pushes the latest text to the server when the student leaves inside the app, shows "Not saved. Copy your text somewhere safe." when the browser refuses local storage, and treats a malformed id as a missing draft.
- Discarding a draft also deletes its device copies.

Visual fixes: map labels (new `src/lib/ielts/mapLayout.ts`: sized in pixels, wrapped, moved off other labels and shapes, numbered badges with a key for features too small to label); straight line-graph segments; report and history pages had double padding on phones; history chart axis now goes below 3 when a band does.

Looked at and fine: landing, login, signup, settings; writing home (task type, variant list, give me a task, own question with image and with description, drafts list, discard dialog); editor for line, bar, pie, table, mixed, process, cycle, branching process, both fixture and both bank maps, letter, Task 2; word counter, timer, saving / saved / offline states, restore after reload while offline, grading overlay, every `ApiError` code, missing-chart dialog, missing and malformed draft ids; report for both fixtures plus a server-built report with a ceiling (adjustments line), highlights and popover, unlocated comments, checklist, error types, rewrite, model answer, flags and low confidence, legacy row, malformed row, missing row, unsaved report; history empty, one, several with chart; chat with report chip, report starter prompts, a streamed reply.

Still open:
- `src/pages/Terms.tsx` still describes subscriptions, plans and trials (left for Sani's review, see Decisions).
- On phones, the issues in the report are reachable only through the highlights (tap) and the "Other comments" list; there is no separate full list. Not added (scope).
- Process diagrams with branches show the steps in order plus a "How the steps connect" list rather than drawn arrows. Readable; a drawn diagram would be new work.

## Browser check with mocks

```
npm run build
npx vite-node scripts/preview-with-mocks/dump-fixtures.ts > /tmp/ielts-fixtures.json
python3 scripts/preview-with-mocks/run.py --out /tmp/ielts-shots            # all screens, 380 and 1280 px
python3 scripts/preview-with-mocks/run.py --only editor --widths 380          # a subset
python3 scripts/preview-with-mocks/run.py --only landing,shell --schemes light,dark   # landing, shell, both themes
```
Needs Python Playwright and Chrome (`/usr/bin/google-chrome` by default). It starts `vite preview` on 127.0.0.1:4173, answers every `*.supabase.co` call from `mock_server.py`, and writes screenshots and `errors.txt` to `--out` (keep that outside the repo). It fails only on crashes and console errors; look at the screenshots for layout. Scenarios are plain functions in `run.py`; mock behaviour (offline saves, held saves, grade errors, unsaved report) is switched through `MockState`.

## Working in this repo from a cloud session

- `package-lock.json` points 174 packages at Lovable's private registry mirror, which cloud sessions cannot reach, and it is out of sync with `package.json`. To install: copy the lockfile aside, replace `https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/` with `https://registry.npmjs.org/` in it, run `npm install`, then restore the original lockfile. Do not commit lockfile changes.
- Edge functions cannot run here. Put logic in `supabase/functions/_shared/ielts/` and test it from `src/test/ielts/`.
- The old app is at git `main` if you need to look something up.
