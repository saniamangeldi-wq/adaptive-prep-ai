
# Lessons System Overhaul — In-place addition to AdaptivePrep

Two parts: (A) small immediate fixes, (B) new prebuilt Lessons system.

## A. Immediate fixes (small)
1. In the Lessons overview card and Lesson player header, stop showing "~15 min" / duration estimates. Keep VAK style tag and status.
2. Delete the 3 existing AI-generated lessons in `video_lessons` for your account (Trigonometry: Rhythm of Ratios, Finding the Beat in Right Triangle Trig, SAT Math: Tuning Into Algebra).

## B. New prebuilt "Lessons" module

Reuses existing AdaptivePrep design system, sidebar (Lessons tab already exists at `/dashboard/lessons`), auth, profiles, VAK learning style already on `profiles`, and Supabase backend. Nothing rebuilt.

### Data model (new tables, seeded once — never regenerated per view)
- `prebuilt_lessons` — id, subject (`math` | `verbal`), section, topic, title, difficulty, objective, order_index
- `prebuilt_lesson_variants` — lesson_id, vak_style (`visual`|`auditory`|`reading_writing`|`kinesthetic`), content JSONB (slides/blocks/examples/narration text)
- `prebuilt_lesson_quizzes` — lesson_id, questions JSONB (stem, choices, answer, explanation)
- `student_lesson_progress` — user_id, lesson_id, status (`not_started`|`in_progress`|`completed`), quiz_score, last_slide_index, updated_at
- `student_lesson_bookmarks` — user_id, lesson_id

All tables with GRANTs + RLS scoped to `auth.uid()`. Lesson content is world-readable to `authenticated`.

### Content: 100 lessons
- 50 SAT Math (Algebra 12, Advanced Math 12, Problem Solving & Data 10, Geometry & Trig 12, Mixed Review 4)
- 50 SAT Verbal (Information & Ideas 12, Craft & Structure 12, Expression of Ideas 12, Standard English Conventions 12, Mixed Review 2)

Each lesson has: title, objective, 4 VAK variants (5–8 slides each with narration text + bullets + example), 5-question quiz with explanations.

**Content authoring approach (honest tradeoff):** hand-writing 100 lessons × 4 VAK variants × ~7 slides = ~2,800 slides of pedagogy. That is not realistic to produce inline in a single build turn at genuine SAT-tutor quality.

Two options — pick one before I build:

- **Option 1 — Author all 100 upfront (one-time generation, then permanently seeded).** I run a one-time seeding script that calls Lovable AI to author every lesson + 4 VAK variants + quiz, writes them to `prebuilt_lessons` / `prebuilt_lesson_variants` / `prebuilt_lesson_quizzes`, and never generates again. Students always read from the DB. Cost: ~$5–15 in Lovable AI credits, run once. Time: ~20–40 min of background function runs. This matches your requirement of "saved permanently, no on-demand generation for students."
- **Option 2 — I hand-write ~10 flagship lessons now** (2 per math section, 1 verbal per section) at high quality, and stub the remaining 90 titles/objectives so the catalog is full and each can be filled in later. Faster to ship, but not "100 preloaded lessons" today.

Recommend **Option 1**.

### UI (reuses current components)
- `/dashboard/lessons` — overview: two tabs (Math / Verbal), section filters, difficulty & completion filters, lesson cards (no duration).
- `/dashboard/lessons/:id` — lesson player. Reuses existing `LessonPlayer` slide/narration UI. Loads the VAK variant matching `profile.learning_style`. Auto-saves progress.
- Dashboard widget: "Recommended next lesson" card based on `student_lesson_progress` + VAK.
- Narration audio: on-demand TTS via existing `voice-speak` edge function (audio not stored — cheap and matches current infra). Slide text/quiz are stored permanently as required.

### Removed / cleaned up
- Old `VideoLessons.tsx` page becomes the new prebuilt Lessons page. Old `video_lessons` "New Lesson" generate flow is removed from the student UI (kept in DB in case you want it back for tutors later).

### Out of scope for this plan
- Reading passages for SAT Verbal will be short (150–250 words each) authored by the seeding pass, not licensed College Board texts.
- No PDF export, no printable worksheets in v1.

---

Confirm: **Option 1 (seed all 100 via one-time authoring pass) or Option 2 (10 hand-written + 90 stubs)?** Once you pick, I'll do the small fixes + build the schema + run the seeding + wire the UI.
