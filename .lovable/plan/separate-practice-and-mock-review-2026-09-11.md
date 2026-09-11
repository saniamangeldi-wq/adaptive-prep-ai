# Separate Practice and Mock Review

## Outcome

The Mistake Bank will no longer combine unanswered questions with wrong answers or combine practice sessions with full mock tests.

Students will see four distinct review groups:

- Practice Mistakes
- Practice Skipped
- Mock Mistakes
- Mock Skipped

Only questions answered incorrectly will be treated as mistakes. Each mistake will show the existing explanation and three verified follow-up questions from the question bank.

## Skipped-question policy

- A skipped practice question is not labeled as a mistake. It remains available under **Practice Skipped** so the student can return to it without creating a false knowledge-gap signal.
- A skipped mock-test question remains unanswered and scores as incorrect, matching Digital SAT behavior. It appears under **Mock Skipped**, separate from conceptual mistakes because it may indicate pacing rather than weak understanding.
- Skipped questions do not receive the three-question remediation set until the student attempts one and answers incorrectly.
- Abandoned tests remain excluded from progress and mistake history under the existing abandonment rules.

## Interface changes

- Replace the single mixed Mistake Bank list with a clear Practice / Mock selector.
- Within each source, provide separate **Mistakes** and **Skipped** views with counts.
- Keep section, topic, and search filters scoped to the active view.
- Wrong-answer cards show:
  - the student's answer and correct answer;
  - the existing step-by-step explanation;
  - a **Practice 3 similar questions** action.
- Skipped cards show a neutral unanswered state and a **Try this question** action, without presenting them as mistakes.
- Redo actions start a new session and preserve every prior attempt.

## Verified follow-up questions

For each actual mistake:

1. Select three deliverable, non-quarantined questions from the same SAT section and canonical topic.
2. Prefer the same difficulty, then nearby difficulty if fewer than three matches exist.
3. Exclude the original question and avoid duplicates within the set.
4. Prefer questions the student has not seen; otherwise use least-recently-seen matches.
5. Use only existing verified question-bank content—no AI-generated questions.
6. If fewer than three valid questions exist, show the available number honestly rather than padding with repeats.

## Technical details

- Add an explicit attempt source to completed attempts so future reads do not rely on fragile route assumptions: `practice` or `mock`.
- Save separate wrong and skipped question IDs when an attempt is completed. Historical rows will still be classified by comparing their served IDs, submitted answers, and linked test format.
- Extend attempt-history loading to preserve source and outcome per question instead of collapsing wrong and skipped into one value.
- Update mistake retrieval to accept both source and outcome filters.
- Add a verified-similar-question selector using section, canonical topic, difficulty, quarantine status, and the student's seen history.
- Update practice generation so “incorrect” uses actual wrong answers only; skipped-question review uses its own selection path.
- Keep mock scoring unchanged: unanswered questions remain not correct.
- Preserve all existing attempt rows and analytics; no history is reset, overwritten, or deleted.

## Validation

- Confirm wrong and skipped answers land in different groups.
- Confirm practice and mock records never appear together.
- Confirm abandoned sessions are excluded.
- Confirm each mistake provides up to three distinct verified questions and never returns the original.
- Confirm retakes create new attempt records and leave prior analytics intact.
- Confirm older attempts are classified correctly after the update.