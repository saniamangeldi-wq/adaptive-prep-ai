# Roadmap: Getting from "1" to "3" on readiness

The audit rated Student readiness 2/5 and Tutor/School readiness 1/5. The gap is not features — it is trust: numbers that aren't real, tests that lose your work, and questions that can't render. Below is what raises each score, in order.

## Where things stand (verified)

- Question delivery: 1,592 deliverable, 134 quarantined, 39 needs review, 3 degraded. Quarantined questions are correctly held out of live tests, but that pool still needs shrinking.
- `src/pages/TakeSATTest.tsx` has no persistence: a refresh mid-test loses answers, timer, and position.
- There is no per-student detail page for tutors or teachers (only a students list at `/dashboard/students`).
- `src/components/dashboard/TutorDashboard.tsx` shows hardcoded values ("0", "--") for Active Students, Avg. Improvement, Sessions This Week, and Student Satisfaction.

## Tutor / School: 1 → 2 (credibility)

1. Replace every hardcoded tutor metric with a real query, and show honest empty states ("No students yet") instead of fake zeros. Drop "Student Satisfaction" entirely until session ratings exist.
2. Same treatment for the teacher and school-admin dashboards.
3. Remove or clearly label any remaining placeholder panels (Schedule, Recent Activity) so nothing looks functional when it isn't.

## Tutor / School: 2 → 3 (usefulness)

4. Per-student detail page (`/dashboard/students/:studentId`): score trend over time, section breakdown (Math vs Reading/Writing), weakest domains, test history with dates and abandoned attempts flagged, and last-active date. Reachable from the students list and from the abandoned-tests panel.
5. Roll-up view: a sortable table of all students with latest score, change since first test, tests taken, and activity status — so a tutor can see who needs attention in one glance.

## Student: 2 → 3 (reliability)

6. Resumable tests: persist the in-progress session (current module, question index, answers, flags, remaining time) so a refresh, tab crash, or accidental navigation restores exactly where the student was. This is the single biggest trust issue in the product.
7. Shrink the quarantined pool: continue reconstruction batches and triage the remaining questions into recoverable vs permanently retired, so students stop hitting thin sections.
8. Make the test picker honest about pool size per domain, instead of silently serving repeats or short modules.

## Student: 3 → 4 (later, not in this plan)

Adaptive module-2 difficulty based on module-1 performance, per-question timing analytics, and a study plan that actually reacts to weak domains.

## Suggested order

Start with 6 (resumable tests), then 1–2 (honest metrics), then 4 (student detail page), then 7 (quarantine cleanup). Items 3, 5, 8 follow.

## Technical notes

- Resume: store session snapshots on the existing `test_attempts` row (a `session_state` JSONB column plus a server-side deadline timestamp) so the timer cannot be reset by clearing local storage; write on every answer/flag change, debounced.
- Tutor metrics: derive from `tutor_students` joined to `test_attempts` and `profiles`, excluding abandoned attempts, using the shared `src/lib/sat-score.ts` scoring so dashboards and student views never disagree.
- Student detail page: new route guarded by `is_tutor_of_student` / `is_teacher_of_student`; verify read policies on `test_attempts` allow the relationship before building the UI.
- No new tables needed except the `session_state` column; everything else is queries over existing data.
