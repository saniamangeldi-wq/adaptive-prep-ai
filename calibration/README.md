# Calibration: the grader's quality gate

The checker only earns money if its band estimates are believable. This folder
holds the evidence: scripts whose bands were set by trained IELTS examiners,
and a script that sends each one to the deployed grader and measures the error.

## The gate (from CLAUDE.md)

- **Do not charge money** until the average absolute error on the overall band
  is **0.5 or less** across **at least 30** examiner-scored scripts.
- **A grader change that makes the error worse does not merge.** Any change to
  rubric text, prompts, post-processing or the grader model/settings bumps
  `GRADER_VERSION` (`supabase/functions/_shared/ielts/prompt.ts`) and must be
  re-run here first. Keep the printed result in the PR description.

"Overall" here means the band for that one task (the mean of the four criteria,
rounded), which is what each official sample is scored with.

## Running it

`run-calibration.mjs` **cannot run inside a sandbox without network access or
keys**. Run it on your own machine against a deployed function (Node 18+, no
dependencies):

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_ANON_KEY="<anon key>"
export CALIBRATION_USER_TOKEN="<access token of a signed-in test user>"
node calibration/run-calibration.mjs                 # all scripts in calibration/scripts/
node calibration/run-calibration.mjs --dir ~/private-calibration --out results.json
node calibration/run-calibration.mjs --include-fictional --allow-few   # smoke test with the example
```

- Get a user token by signing in as a test user in the web app and copying
  `session.access_token` (browser devtools: `supabase.auth.getSession()`), or
  with `supabase.auth.signInWithPassword` in a small script. Tokens expire
  after about an hour.
- Each grading spends that user's credits (5 per script). A `tier_3` test user
  gets 200 credits a day, i.e. 40 scripts; the runner stops cleanly on HTTP 402.
- Exit codes: `0` gate passed · `1` overall average error above 0.5 · `2`
  configuration error / no scripts · `3` fewer than 30 scored scripts (the gate
  cannot be judged yet; pass `--allow-few` to see the numbers anyway).

The runner prints, per criterion and for the overall band: mean absolute error,
mean signed error (positive = the grader is **too generous**), and the share of
scripts within half a band. Watch the signed error: a grader that is
systematically generous is worse for students than one that is noisy.

## Adding examiner-scored scripts

One JSON file per script (or an array of entries in one file) in
`calibration/scripts/`, or in any folder passed with `--dir`.

```jsonc
{
  "id": "unique-id",                // stable, e.g. "official-ac-2019-t2-03"
  "fictional": false,               // true ONLY for format examples; skipped unless --include-fictional
  "source": {
    "kind": "official_sample",       // official_sample | examiner_scored_original
    "reference": "where it comes from (publication, page, URL)",
    "licence": "how we may use it (see 'Copyright' below)"
  },
  "task": { /* a WritingTask exactly as in contract.ts; usually source "custom" */ },
  "customVisual": { "description": "for Academic Task 1 without bank data: the chart's figures in words" },
  "script": "the candidate's answer, exactly as written, mistakes included",
  "examiner": {
    "overall": 6.5,                 // REQUIRED: the examiner's band for this task
    "task": 6, "coherence": 7, "lexical": 6.5, "grammar": 6   // optional; include when published
  },
  "notes": "anything unusual (e.g. under length, examiner comment summary)"
}
```

Rules:

- Copy the script **exactly**, including the candidate's errors and paragraph
  breaks. Do not correct anything.
- For Academic Task 1, give the visual: either real `visuals` in the task (if
  you rebuild the chart data faithfully) or `customVisual.description` with all
  the figures. Without it the grader marks `visual_not_available` and the
  comparison is not fair.
- Set `task.variant` correctly; it selects the rubric section.
- Spread the set: both tasks, Academic and General Training, every variant,
  and bands from about 4 to 8. A set of only band-6 essays hides inflation at
  the ends.
- `calibration/scripts/example-fictional-001.json` shows the format. Its bands
  are invented; it is **not** calibration data.

## Where examiner-scored scripts can legitimately come from

- **Official sample scripts with examiner comments** published by the IELTS
  partners (British Council, IDP, Cambridge University Press & Assessment):
  free "sample candidate writing scripts and examiner comments" documents for
  Academic and General Training, and the sample answers with examiner bands and
  comments at the back of the official Cambridge IELTS practice-test books.
  These give a band for each script and often a comment per criterion.
- **Examiner-scored originals**: scripts written by our own students (with
  their consent) and scored independently by a certified IELTS examiner, ideally
  two examiners with any disagreement resolved. This is the best long-term
  source because we own it and it matches our users.

### Copyright

Official samples are copyrighted. Do **not** commit them to this repository
(CLAUDE.md: original content only). Keep them in a private folder outside the
repo (or one that is git-ignored) and point the runner at it with `--dir`. Only
our own examiner-scored originals, with consent, may be committed to
`calibration/scripts/`.
