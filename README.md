# AdaptivePrep

Digital SAT preparation for Kazakh- and Russian-speaking students: adaptive practice tests, score reports, a Socratic AI coach, and dashboards for tutors and tutoring centers. UI in English, Russian and Kazakh.

Live: https://adaptivetestprep.org (adaptiveprep.org redirects there).

## Stack

- React 18 + Vite + TypeScript, Tailwind + shadcn/ui, i18next (en / ru / kk)
- Supabase (Postgres + RLS, Auth, Edge Functions in `supabase/functions`)
- Stripe Payment Links (`src/lib/stripe-links.ts`); Kaspi planned for KZ customers

## Run locally

```sh
npm ci
npm run dev      # http://localhost:8080
npm run build
npm run lint
npm test
npx tsc -p tsconfig.app.json --noEmit   # typecheck (vite build does not typecheck)
```

`.env` holds the Supabase URL and publishable key (both public by design). Server secrets live in Supabase, not in this repo.

## Plans we sell

| Plan | Price | Profile tier |
|---|---|---|
| Free | — | `tier_0` |
| Pro | $10 / ₸4,990 per month | `tier_2` |
| Tutor | $59 / ₸29,500 per month | `tier_1` (tutor role) |
| Tutoring center | quote | — |

Legacy tiers (student Basic/Elite, tutor Professional/Business) are no longer sold. Existing subscribers keep them, and the billing pages still show a subscriber's own plan. Config: `src/lib/pricing-config.ts`, `src/lib/tier-limits.ts`.

## Frozen features

`src/lib/features.ts` hides University Match, Spaces and the tutor leaderboard. Their code is kept, but they're removed from navigation and their routes redirect to `/dashboard`.

## Business plan and salvage

`salvage/` holds the audit, the 90-day plan (`salvage/90-DAY-PLAN.md`) and the revenue model. The practice questions currently in the database came from OpenSAT and look like College Board's own questions. Don't use them in anything paid or public; see `salvage/README.md`.
