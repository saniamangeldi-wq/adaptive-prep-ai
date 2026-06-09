# Conversion Features: Public Pricing + Post-Value Paywalls

Goal: turn the existing 87 visitors / 0 paying users into actual revenue by (1) making pricing visible to logged-out visitors and (2) triggering paywall modals only after free users have experienced value.

## What gets built

### 1. Public `/pricing` page
- New route accessible without login, linked from homepage nav + footer
- Three tiers only: **Free**, **Pro (Most Popular)**, **Elite** — Basic collapsed into Free for clarity
- Dual currency display ($/₸) using existing PRICING_CONFIG
- Monthly / Annual toggle with "Save ~40%" badge on annual
- **Founding Member banner** at top: "First 100 students get Pro at $5/mo forever — X spots left"
  - Real counter backed by DB count of `founding_member` flag on profiles
  - When 100 reached, banner hides and pricing returns to normal
- Each tier card: price, 5–7 feature bullets, CTA button (Sign up free / Start Pro trial / Go Elite)
- Logged-in users see "Current Plan" badge on their tier and an Upgrade CTA instead

### 2. Post-Value Paywall Modals (Free tier only)
Three contextual modals that fire after the user has felt value, not before:

| Trigger | Where | Message |
|---|---|---|
| 5th AI Coach message in a day | `/dashboard/coach` | "You're on a streak — unlock unlimited coaching with Pro" |
| Practice test completion | `/dashboard/tests/:id` results screen | "See your full weakness breakdown + 9 more tests with Pro" |
| 3rd university viewed | University Match drawer | "Compare unlimited universities with Pro" |

- Reusable `<UpgradeModal />` component with variant prop (`coach` / `tests` / `universities`)
- Dismissible, with "Maybe later" + "Start 7-day Pro trial" buttons
- Tracks dismissals in DB so we don't nag — max 1 trigger per modal per 48h
- Pro / Elite / trial users never see modals

### 3. Supporting plumbing
- Migration: add `founding_member boolean default false` to `profiles`, plus `paywall_dismissals` table (user_id, modal_variant, dismissed_at)
- Helper hook `useFoundingMemberCount()` returning live count + spots remaining
- Helper hook `useUpgradeModal(variant)` that knows when to fire based on usage + cooldown
- Wire trial CTAs into existing Stripe Payment Link flow (no new checkout code — uses existing subscription-checkout-method)

## Out of scope (separate next steps if you want them)
- 60-second SAT diagnostic landing page (option C from last message)
- School outreach email templates (option D)
- Removing/merging the Basic tier from existing billing pages — pricing page will hide it, but `/dashboard/billing` keeps current tiers until you confirm

## Technical notes
- Founding member discount enforced server-side via an edge function that creates a discounted Stripe Payment Link when count < 100; client only displays the count
- Modal triggers use existing Zustand stores (chat message count, test completion events, university views) — no new tracking infra
- Paywall_dismissals RLS: user can only read/insert their own rows; service_role full access
- Pricing page uses existing PageSeo, follows visual identity tokens (#0F1117 / #1A1D27 / teal #10B981)
- No changes to manual role switching, sidebar lock, or the 4-role model

## Order of build
1. Migration (founding_member column + paywall_dismissals table + grants/RLS)
2. `/pricing` public page + nav link + founding counter hook
3. `<UpgradeModal />` component + `useUpgradeModal` hook
4. Wire 3 trigger points (Coach, Tests results, University Match)
5. Edge function for founding-member discounted checkout link
