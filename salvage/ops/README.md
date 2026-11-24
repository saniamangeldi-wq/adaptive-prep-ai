# Operating plan (from 2026-11-24, 90 days to 2027-02-21)

Owner mandate: Claude runs strategy, product, marketing copy and customer-service drafts. Sani has **no budget and little time**, does not review code, and does not teach. Goal: **≥ $10,000**.

## Constraints (hard)
- **No spend.** No paid ads, no Lovable credits, no paid tools. Free tiers only.
- **No Lovable.** Code changes happen in this repo; AI runs on Gemini via `AI_PROVIDER=gemini` once deployed.
- **Claude never sends messages, posts or takes payments.** Claude drafts; Sani sends (target: ≤ 20 min/day).
- **No made-up facts** on public pages or in messages (no fake results, testimonials or credentials).

## The model (no teaching by Sani)
1. **B2B first:** tutoring centres and independent SAT tutors already have students. Offer: free 30-day pilot → Tutor plan $59/mo (₸29,500) or centre licence $250/mo. Value: adaptive diagnostic, skill reports, weekly parent reports in RU/KZ, less marking.
2. **Partner-taught SAT Intensive:** a partner tutor teaches the 8-week group on revenue share (partner 60% / AdaptivePrep 40%). Recruit the partner from the B2B outreach. Claude prepares lesson plans, homework sets and parent reports.
3. **Free acquisition for families:** Instagram/Telegram/WhatsApp content in RU/KZ, OLX listings, SEO pages → free diagnostic → Pro (₸4,990/mo) or the group.

## Cadence
- **Monday:** weekly review + this week's outreach batch and content (scheduled task writes `salvage/ops/week-YYYY-MM-DD.md`).
- **Thursday:** follow-ups for anyone who replied or went quiet; 2 more posts.
- **Sani daily (≤ 20 min):** send the drafted messages in the week file, paste replies back into a Claude session, mark leads in Supabase `cohort_leads`.

## Blockers only Sani can clear
- [ ] Check whether Supabase project `cgoskszhxymcdmiajaai` appears at supabase.com/dashboard (decides how we deploy without Lovable).
- [ ] Kaspi details for payments (or a Kaspi Pay link).
- [ ] Merge PR #14 once deploy path is known.
