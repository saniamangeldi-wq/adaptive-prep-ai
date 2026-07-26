# Lesson Journey Map

Turn `/dashboard/lessons` from a flat catalog into a Duolingo-style visual journey. Each SAT domain becomes its own mini-path; students must pass each lesson's quiz at ≥70% to unlock the next node.

## Structure

Two subjects (Math, Verbal), each split into domain paths:

- **Math**: Algebra → Advanced Math → Problem Solving & Data → Geometry & Trig
- **Verbal**: Information & Ideas → Craft & Structure → Expression of Ideas → Standard English Conventions

Within a domain, lessons are strictly sequential. Between domains, the next domain unlocks after the previous domain's final lesson is passed. No skip-ahead for v1.

## Unlock rule

- Node states: `locked`, `unlocked` (current), `completed`
- A lesson node unlocks only when the previous node in its domain is `completed`
- `completed` = quiz score ≥ 70% (already stored on `student_lesson_progress.quiz_score`)
- First lesson of the first domain (Algebra / Information & Ideas) is always unlocked
- First lesson of a later domain unlocks when the previous domain is 100% complete

## Visual — journey map

Duolingo-style vertical winding path per domain. Each domain is a section with its own header banner and a column of nodes zig-zagging left/right down the page.

```text
        (1) ─┐
             │
        ┌─ (2)
        │
        (3) ─┐
             │
        ┌─ (4) 🔒
```

Node visuals:
- Completed: filled teal circle + check icon
- Current: teal ring, pulsing glow, "Start" label
- Locked: muted gray circle + lock icon, not clickable

Between domains: a "domain gate" banner showing progress `7/12` and the next domain grayed until unlocked. Tapping a node opens the existing `LessonPlayer`; tapping a locked node shows a toast explaining what to finish first.

## Data

Reuses existing tables — no schema changes:
- `prebuilt_lessons.order_index` already defines sequence within a domain (`section` column groups domains)
- `student_lesson_progress.status` + `quiz_score` drives node state
- Progress-write happens at the end of the quiz; if score ≥ 70 mark `completed`, else keep `in_progress` and let the student retry

## UI changes

- Replace the current tabs+grid layout in `src/pages/VideoLessons.tsx` (or the current lessons page) with a `LessonJourney` component
- New components:
  - `LessonJourney.tsx` — subject switcher (Math/Verbal) + list of `DomainPath` sections
  - `DomainPath.tsx` — header, progress bar, vertical node column
  - `LessonNode.tsx` — the circle button with state styling
- Keep `LessonPlayer.tsx` and quiz flow unchanged; on quiz submit, upsert progress with pass/fail

## Out of scope

- Skip-ahead placement test
- Rewards / streak animations on the map (keeps existing gamification untouched)
- Reordering lessons per student
