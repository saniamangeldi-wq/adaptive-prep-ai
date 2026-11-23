# 90 days: from AI-generated platform to $10k in revenue

Window: **Mon 2026-11-23 → Sun 2027-02-21.**
Target: **$10k gross, cumulative** (base case ≈ $9.1k, stretch ≈ $15.9k, floor ≈ $4.1k; see `finance/model.py`).

## The bet in one paragraph

Subscriptions alone won't reach $10k in 90 days. At $10/month you'd need about 1,000 paid subscriber-months, which means roughly 25–50k signups at typical free-to-paid conversion. You have no traffic to get there. The fastest honest path is a **paid live SAT cohort for Kazakh/Russian-speaking students, taught by you, with the platform as homework, diagnostics and progress reports for parents**. Then **rent the same platform to local tutoring centers**. Subscriptions become the cheap follow-on product, not the engine. You already run a paid IELTS group with parent updates, so this reuses something you know how to sell.

## Revenue mix (base case)

| Stream | Unit | Volume | $ |
|---|---|---|---|
| SAT Intensive cohort (6–8 wks, 2×/wk live + platform) | ₸75,000 (~$150) | 15 + 25 seats | 6,000 |
| Tutor/center licence (white-label, kk/ru) | $250/mo | 3 centers × 2 mo | 1,500 |
| Paid diagnostic + study plan call | $40 | 20 | 800 |
| Pro subscription (alumni + organic) | $10/mo | 80 sub-months | 800 |
| **Gross** | | | **9,100** |
| Costs (infra, LLM API, small ad test, ~4% payment fees) | | | ~1,100 |

The model is most sensitive to **cohort seats**: each extra seat adds $150. Getting to $10k needs only about 6 more seats than the base case, or one more center.

---

## Phase 1: Cut, clean, pre-sell (Days 1–14, Nov 23 → Dec 6)

The product isn't ready. Sell anyway, because pre-sales tell you whether to build.

**Product (about 20 hrs)**
- [ ] Create branch `relaunch`. Hide University Match, Spaces, Lessons and voice from navigation (feature flags, not deletion yet).
- [ ] Delete VAK onboarding, AI lesson generation, ElevenLabs functions, `mcp`/`fetch-url`/`web-search`, `process-sat-pdf`. Turn off their API keys so they stop costing money.
- [x] Collapse pricing to **Free / Pro ($10, ₸4,990) / Tutor ($59 for now; a cheaper per-seat price needs a new Stripe/Kaspi price)**. Stripe links cut from 18 to 6.
- [ ] Replace the Lovable README with a real one. Remove the duplicate lockfile (`bun.lock` + `bun.lockb` + `package-lock.json`, keep one).
- [ ] **Payments:** add Kaspi (Kaspi Pay / Kaspi QR). That's how most KZ parents pay. Keep Stripe only if your Stripe entity can actually take payments where you're registered (verify this).

**Sales**
- [ ] Landing page for the **SAT Intensive** in Russian and Kazakh: dates, price, schedule, "what's included", your bio, a parent FAQ and a Kaspi pre-pay button. Pick the end date to land before a spring 2027 SAT date (check the exact date on College Board's site).
- [ ] Early-bird price ₸60,000 for the first 10 seats, deadline Dec 20.
- [ ] Message your existing IELTS students and parents, plus 3 school/parent Telegram/WhatsApp groups.
- [ ] Book 10 free 20-minute "SAT readiness" calls. Use the old question bank internally only, to run diagnostics during the calls.

**Kill criterion (Day 14):** fewer than 5 deposits means changing price or audience (IELTS + SAT bundle, or NIS/KTL schools) before building more.

## Phase 2: Rebuild the core with original content (Days 15–45, Dec 7 → Jan 6)

**Original question bank v1: 400 items (the legal foundation)**
- [ ] Write a skills taxonomy that mirrors the Digital SAT domains (4 R&W, 4 Math).
- [ ] Pipeline: LLM drafts → you review 100% → second check by answer-key script (for math, compute the answer in code) → publish. Target 25 approved items a day across 16 working days.
- [ ] Each item gets an original passage or stem, a full explanation, and an **explanation in Russian and Kazakh**. No other SAT bank offers that, so it's your differentiator.
- [ ] Swap the quarantined bank out of production. Keep it out of git history for future forks (`salvage/data/quarantine-question-bank` stays local only).

**Product**
- [ ] **Adaptive diagnostic** (2 × 27-question modules, routing like the Digital SAT) → score band + top 3 weak skills.
- [ ] **Parent report** (weekly email, RU/KZ): score trend, hours practiced, assignments done. Parents pay, so parents need to see value.
- [ ] Tutor dashboard: assign question sets by skill, see class heatmap. This is the thing centers rent.
- [ ] AI coach: text only, Socratic mode, hard daily cap per plan, cheapest model that passes your 30-question eval set. Log cost per user per day.
- [ ] Analytics: signups → diagnostic done → call booked → paid. Without this funnel you're guessing.

**Sales (running in parallel)**
- [ ] Cohort 1 closes ~Jan 5 (target 15 seats). Starts after the New Year holidays.
- [ ] List 30 tutoring centers in Almaty, Astana and Shymkent. Offer a free 30-day pilot with their own branding and 1 group. Goal: 5 pilots.

## Phase 3: Deliver, prove, scale what works (Days 46–90, Jan 7 → Feb 21)

- [ ] **Run Cohort 1.** Weekly mock-section on platform, live class 2×/week, parent report every Sunday.
- [ ] Collect proof: diagnostic-to-week-6 score delta per student, 3 written parent testimonials, 1 video.
- [ ] **Cohort 2 pre-sale** (target 25 seats) from week 3 of Cohort 1, using real score gains as the pitch. Price ₸75,000–90,000.
- [ ] Convert pilots → paid: $250/mo for up to 30 students. Goal: 3 paying centers.
- [ ] Alumni → Pro subscription at ₸4,990/mo for continued practice until test day.
- [ ] **SEO (slow-burning, but nearly free):** free Digital SAT score calculator, "SAT в Казахстане" guide, test-center list, NU/abroad admissions guide, all in RU/KZ. Target ~10 pages. (This is where the University Match data could come back, once verified.)
- [ ] Day 90 review: compare actuals vs. `finance/model.py`. Decide next quarter: more cohorts (service), more centers (B2B SaaS), or both.

---

## Weekly scoreboard (track every Monday)

| Metric | Wk 2 | Wk 6 | Wk 9 | Wk 13 |
|---|---|---|---|---|
| Cohort deposits | 5 | 15 | 15 + 10 (C2) | 40 total |
| Original items approved | 0 | 400 | 500 | 600 |
| Centers in pilot / paying | 0 / 0 | 5 / 0 | 5 / 2 | – / 3 |
| Diagnostic completions | 10 | 60 | 120 | 200 |
| Cumulative gross $ | 600 | 3,000 | 5,500 | 9,000–10,000 |
| AI cost per active user / mo | — | <$0.50 | <$0.50 | <$0.50 |

## Risks that would change the plan

1. **Your time is the constraint.** Cohorts + item review + sales at the same time is about 30–35 hrs/week. If you can't commit that, cut the stretch goals and run one cohort.
2. **Payments:** if Kaspi integration slips, take Kaspi transfers manually for Cohort 1. Don't let tooling block revenue.
3. **Content quality:** a wrong answer key in a paid product hurts trust more than having fewer items. Review 100% of them; don't sample.
4. **Legal:** keep the quarantined College Board-style items out of anything paid or public.
5. **Assumptions not verified:** exchange rate (~₸500/$, from your own config), the Stripe-vs-Kaspi situation, spring SAT dates, and your current user and revenue numbers, which I couldn't see.
