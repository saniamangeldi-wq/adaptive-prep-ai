# Hidden IELTS module (Reading + Writing) and a paid trial funnel

## What you get

A complete IELTS Reading and Writing practice area that nobody can see unless you switch it on — starting with only your account. Speaking and Listening are laid out as clearly marked "not available yet" placeholders so a school can see the roadmap, and so turning them on later is a small job rather than a rebuild.

Alongside it, a free-trial-to-paid funnel: a landing page for IELTS, a 7-day trial with no card required, in-app value moments, reminder emails, and a checkout at day 7.

## Access control

Two independent switches, either one grants access:

1. Per-account flag on the user's profile — set on for `sani.amangeldi@gmail.com` and nobody else.
2. Per-school flag — a school admin setting that grants everyone in that school.

Everything is hidden when neither applies: no menu item, no landing page link, and the pages themselves refuse to open by direct URL. The IELTS landing page stays off the sitemap and off search engines until you decide to launch it.

## Reading section

- Passage sets generated on demand at Academic and General Training level, three passages per full set, with a 60-minute timed mode and an untimed practice mode.
- The real IELTS question types: multiple choice, True/False/Not Given, Yes/No/Not Given, matching headings, matching information, sentence completion, summary completion, short answer.
- Auto-marking, raw score out of 40, converted to an estimated band using the standard published conversion, with per-question explanations and passage line references.
- Results saved so students can review mistakes later, in the same spirit as the SAT mistake bank.

## Writing section

- Task 1 (Academic: chart/graph/table/process description; General: letter) and Task 2 (essay), with word counts, timers, and a live word counter.
- Task 1 Academic charts are generated as real visuals, reusing the chart component already in the app.
- On submit, a full band-score report: estimated band for Task Achievement, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy, plus an overall band, specific inline comments, and a model answer at a higher band for comparison.
- Reports are saved to a writing history so progress over time is visible.

## Speaking and Listening

Visible in the IELTS area as locked cards explaining they are coming, with no half-working behaviour. The data structures are built to hold all four skills so adding them later is additive.

## The funnel

Model: free trial, then paid — the standard pattern used across the education-software market. We build our own copy, layout and pricing; we do not copy any competitor's text, images, or design. That keeps it clean legally: pricing models and funnel structure are not protectable, but wording and visual design are.

Flow:

1. IELTS landing page — what it does, sample question, sample band report, clear price, one call to action.
2. Sign-up starts a 7-day IELTS trial, no card. Trial state and end date stored per user.
3. First session pushes the student to one Reading set and one Writing task so they hit the value moment early.
4. Day 3 and day 6 reminder emails through the existing email system, plus an in-app banner counting down.
5. Day 7 the module locks behind an upgrade screen; past reports stay readable so the work isn't lost.
6. Checkout through the existing Stripe setup with a new IELTS plan. Same no-refunds terms already in place.
7. Cancellation reuses the existing cancel-with-feedback flow.

Schools get a separate "request a quote" path rather than self-checkout, matching how school pricing already works.

## Technical notes

- New tables: `ielts_sessions` (skill, mode, config, timing, status), `ielts_answers` (per-question responses and marks), `ielts_writing_reports` (criterion bands, comments, model answer), `ielts_trials` (start, end, converted). RLS scoped to the owning student, with tutor/teacher read access mirroring existing roster policies, plus GRANTs.
- Access flags: `profiles.ielts_enabled` and `schools.ielts_enabled`, checked through a `SECURITY DEFINER` function `has_ielts_access(uid)` used by both RLS and the UI gate.
- New edge functions: `ielts-generate-reading`, `ielts-grade-writing`, `ielts-generate-task1-chart`. All go through the Lovable AI Gateway with strict JSON schemas; grading uses a high-reasoning model, generation a faster one. Credit consumption reuses `consume_ai_credits`.
- Frontend: `src/pages/ielts/` (Overview, Reading, Writing, Results, Landing), routes gated by an `IeltsRoute` wrapper that redirects to 404 when access is absent, so the feature is invisible rather than "forbidden".
- Reuses `ChartWidget`, `QuestionCard` patterns, `MarkdownMath`, existing timer components, existing email queue, existing Stripe checkout and webhook.
- Landing page carries `noindex` until launch, and is excluded from `sitemap.xml`.

## Build order

1. Access flags, `has_ielts_access`, route gating, your account switched on.
2. Reading: generation, delivery, marking, band estimate, review.
3. Writing: task delivery, Task 1 chart generation, band report, history.
4. Speaking/Listening locked placeholders.
5. Trial state, in-app banner, reminder emails, lock screen.
6. Landing page and Stripe checkout for the IELTS plan.
