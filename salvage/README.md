# Salvage: what's worth keeping from AdaptivePrep

Audit date: 2026-11-23. Repo: 1,286 commits (Feb–Jul 2026, all generated in Lovable, with no commits since 2026-07-11). About 51k lines of TS/TSX, 39 edge functions and 53 migrations. The site at adaptiveprep.org redirects to adaptivetestprep.org.

**Verdict:** don't sell the platform. Cut it to roughly 40% of its current size and use it as the delivery tool for a paid SAT service aimed at Kazakh- and Russian-speaking families. Then rent it to tutoring centers. The code has little resale value without revenue. The data is either not yours to sell or not verified. The Kazakh/Russian localization plus a real tutor (you) is the one thing competitors can't copy cheaply.

## What's in this folder

| Path | What | Status |
|---|---|---|
| `data/quarantine-question-bank/questions.json` | 1,568 SAT items (937 R&W, 631 Math; 175 grid-in) parsed from the `*_chunk_*` SQL files | **Do not sell or publish.** See the legal note below |
| `data/universities_UNVERIFIED.json` | 200 universities (QS rank, tuition, acceptance, scholarships) from `seed-universities` | AI-written from memory. Verify before any use |
| `data/flashcard-data.ts` | Premade math/vocab/grammar decks | Keep after a human check |
| `data/i18n/` | en / ru / kk UI strings | **Keep. This is the moat** |
| `code/test-engine/` | Timer, question nav, question card, SAT config, test generator, take-test and results pages | Keep. This is the core product |
| `code/math-render/` | KaTeX rendering for questions and AI answers | Keep |
| `code/ai-coach/` | `student-chat` edge function, shared helpers, performance analysis, sanitizer | Keep, but cap usage, make it text-only and drop web search |
| `code/email-infra/` | Transactional email queue, unsubscribe, suppression, migration | Keep (it works and is boring) |
| `code/billing/` | Pricing and tier-limit config | Rewrite to 3 plans |
| `code/seo/` | Score calculator and question-bank pages, SEO component, sitemap, llms.txt | Keep. These bring free traffic |
| `code/supabase-schema/types.ts` | Generated DB types, for reference while pruning | Reference only |
| `finance/model.py` | 90-day revenue model (floor / base / stretch) | Update weekly with real numbers |
| `90-DAY-PLAN.md` | The plan | — |

## Legal note on the question bank (read before doing anything with it)

All 1,568 items are tagged `opensat-*`. The explanation format ("Choice B is correct… Choice A is incorrect because…") and the screen-reader math wording ("11 x cubed") match College Board's SAT Suite Question Bank. I could not confirm OpenSAT's source or license. College Board's terms bar commercial and test-prep use of its materials without written permission, and they bar using its content to train AI. **Treat this as College Board content.** It's fine for internal testing while you build. Before you charge money, replace it with original items, or get written permission through College Board's copyright request form. Also delete `process-sat-pdf` / `admin/UploadTests`, which exist to ingest official test PDFs.

## Keep / cut / freeze (by area, lines of code)

| Area | LOC | Decision | Why |
|---|---|---|---|
| Test engine + results | ~1.4k + pages | **Keep** | It's the product |
| Score calculator / QB pages | ~270 | **Keep + expand** | Free SEO tools that bring visitors |
| AI coach (student-chat) | ~4k UI + 863 fn | **Keep, trimmed** | Socratic tutor is a real feature. Drop model selector, web search, fetch-url, document generation |
| Tutor/teacher dashboards, assignments, grades | ~3k | **Keep** | This is what centers will rent |
| Auth, i18n, email, PWA | — | **Keep** | Works |
| VAK learning styles, cognitive baseline, VAK lessons | ~1.5k + data | **Delete** | Learning-styles matching isn't supported by research. Informed parents and schools see it as a red flag, and it multiplies content cost by 4 |
| AI-generated lessons + narration (5 fns, LessonPlayer) | ~2.3k + ~1.1k | **Delete** | This is the "AI slop" itself. Replace with short recorded walkthroughs by you |
| Voice (ElevenLabs ×4, voice-speak/transcribe, VoiceChat, STT/TTS hooks, voice minutes) | ~1.5k | **Delete** | Costs money on every use, and no student pays extra for it |
| University Match (17 components) | 5.7k | **Freeze** (hide from nav) | 11% of the code with unverified data. It could return later as a free lead magnet once the data is verified |
| Spaces | 1.3k | **Delete** | Unclear job. It duplicates assignments |
| Gamification (XP, badges, leaderboard, daily challenges) | ~1k | **Delete** (keep streak) | Polish for a product nobody pays for yet |
| School quote builder, Revenue calculator, founding member, donation banner, trial banner | ~1k | **Delete** | Premature. You have no school customers yet |
| `mcp` edge function, `fetch-url`, `web-search` | ~400 | **Delete** | Attack surface with no user benefit |
| Pricing: 4 student + 3 tutor + 3 school tiers, 18 Stripe links | — | **Collapsed to 3 (done on `relaunch`)** | Free · Pro · Tutor, plus center by quote. 6 Stripe links remain |

## Sell / rent / reuse: what each asset can realistically earn

| Asset | Sell? | Rent? | Reuse? | Realistic value |
|---|---|---|---|---|
| Codebase | Weak. Buyers pay for revenue, not code | **Yes**, as white-label for tutoring centers | Yes | $0–low thousands as a sale (my estimate, not checked against marketplace data). $250–450/mo per center as a rental |
| Question bank | **No** (not yours) | No | Internal testing only | Legal risk if monetized |
| University dataset | No (unverified; QS rankings are QS's data) | No | Lead magnet after verification | Low |
| kk/ru localization + your teaching | — | — | **Core** | Hardest thing for a competitor to copy |
