# AdaptivePrep

An IELTS Writing checker with a plain chat coach.

- **IELTS Writing checker**: a student writes a task and receives an estimated band on the four public criteria, with feedback tied to their own sentences, explained in English, Russian or Kazakh.
- **Chat**: a writing coach that can answer questions about the student's writing and report.

AdaptivePrep is not affiliated with or endorsed by the IELTS partners. Band scores are estimates.

## Stack

React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Supabase (auth, Postgres, edge functions on Deno). Model calls happen only inside edge functions.

## Run

```sh
npm install
npm run dev        # dev server
npm run build      # production build
npx tsc -p tsconfig.app.json --noEmit
npm test           # vitest
```

The web app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`. Edge functions live in `supabase/functions/`; most of them cannot be run locally without a gateway key.

## Where to read next

- `CLAUDE.md`: what the product is, the scope lock, layout and working rules. Read it first.
- `HANDOVER.md`: current status and the next tasks.
