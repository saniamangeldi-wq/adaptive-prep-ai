## 🗓️ 30-Day Build Plan: AI Micro-Lessons Engine

### Week 1: Foundation (Days 1-7)
1. **Database schema** — Create `lessons`, `study_plans`, `lesson_progress` tables
2. **Analysis engine** — Edge function: test results → weak topics ranked by priority
3. **Lesson generation edge function** — AI generates structured micro-lessons (concept → worked example → key takeaway → practice questions)
4. **Basic lesson viewer UI** — Page that renders a generated lesson with markdown + interactive questions

### Week 2: Voice & Interactivity (Days 8-14)
5. **TTS narration per lesson section** — ElevenLabs TTS reads each section aloud
6. **Interactive practice questions** — Embed quizzes within lessons using existing QuestionWidget
7. **Lesson completion tracking** — Mark sections done, track quiz scores, save progress
8. **Study plan dashboard** — Ordered lesson list with progress bars and next-up indicators

### Week 3: Adaptive Loop (Days 15-21)
9. **Re-assessment trigger** — Mini-assessment after completing a study plan
10. **Plan regeneration** — AI analyzes new results, generates updated plan
11. **Difficulty adaptation** — Rolling-window logic (80% → advance, <50% → simplify)
12. **Teacher assignment integration** — Teachers can assign specific lesson topics

### Week 4: Polish & Differentiation (Days 22-30)
13. **VAK-aware lesson variants** — Adjust lesson style based on VAK profile
14. **Session recording** — Browser MediaRecorder API for lesson session capture
15. **Analytics for teachers** — Lesson completion, scores, time spent, weak areas
16. **Mobile optimization & testing** — Ensure lessons work on phones/tablets

### Existing Infrastructure to Leverage
- AI chat streaming + edge functions + credit system
- ElevenLabs TTS + STT integration
- Test results & scoring data
- VAK learning style profiles
- Question rendering components
- Spaces architecture

### New Components to Build
- Lesson data model + generation logic
- Study plan algorithm (test gaps → ordered lessons)
- Lesson player UI (structured, not chat-based)
- Adaptive re-assessment loop