# Legacy prompts (archive, not used by the app)

Sani asked to keep every AI prompt from the old AdaptivePrep app. These are the
original source files of every old edge function that contained a prompt, copied
unchanged from `main` (commit 3b5ebcd) on 16 Nov 2026 and renamed to `.ts.txt`
so nothing builds or deploys them.

- The prompts in use today live in `supabase/functions/_shared/ielts/prompt.ts`
  (grader), `rubric.ts` (marking knowledge), `chat.ts` (coach) and `taskGen.ts`.
- `student-chat.ts.txt` holds the old coach identity and per-subject prompts.
- `ielts-grade-writing.ts.txt` and `ielts-generate-writing-task.ts.txt` are the
  old IELTS prompts that the current ones replaced.
- The rest (SAT, lessons, flashcards, university advisor, reports) belong to
  features that were removed. Do not wire them back in without Sani's go-ahead
  (see the scope lock in `CLAUDE.md`).
