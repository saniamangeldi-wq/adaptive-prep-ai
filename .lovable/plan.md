

# Implementation Plan: SAT Practice Test System

## Overview
You're right - the "Start Test" button currently doesn't do anything! We need to build a complete test-taking system that includes:
- Sample SAT questions in the database
- A test-taking interface where you can answer questions
- Timer functionality (optional based on your toggle)
- Results/feedback screen after completing the test
- Saving your test attempts to track progress

---

## What Will Be Built

### 1. Sample SAT Questions
We'll add realistic SAT-style questions to the database covering:
- **Math**: Algebra, geometry, data analysis (multiple choice & grid-in)
- **Reading & Writing**: Passage comprehension, grammar, vocabulary

Questions will be tagged by difficulty (easy/normal/hard) and section type.

### 2. Test-Taking Interface
A new page where you can:
- See one question at a time with clear navigation
- Select answers (multiple choice A/B/C/D or enter numbers)
- See a timer counting down (if enabled)
- Navigate between questions (Previous/Next)
- Flag questions to review later
- Submit when done

### 3. Test Session Flow

```text
+------------------+     +------------------+     +------------------+
|  Configure Test  | --> |   Taking Test    | --> |  Results Screen  |
|  (current page)  |     |  (new page)      |     |  (new page)      |
+------------------+     +------------------+     +------------------+
        |                        |                        |
   Select options           Answer Qs              See score,
   Click "Start"            Use timer              feedback,
                            Navigate               weak areas
```

### 4. Results & Feedback
After submitting:
- Overall score and percentage
- Breakdown by topic/section
- Review incorrect answers with explanations
- Save attempt to your progress history

---

## Technical Implementation

### Database Changes
- Seed the `sat_tests` table with sample questions organized by difficulty and type
- Use the existing `test_attempts` table to track your progress

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/TakeTest.tsx` | Main test-taking interface with timer, navigation, and question display |
| `src/pages/TestResults.tsx` | Results page showing score, breakdown, and review |
| `src/components/test/QuestionCard.tsx` | Displays a single question with answer options |
| `src/components/test/TestTimer.tsx` | Countdown timer component |
| `src/components/test/QuestionNav.tsx` | Navigation panel showing all questions |
| `src/lib/test-generator.ts` | Logic to generate tests based on your configuration |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PracticeTests.tsx` | Wire up "Start Test" button to create test and navigate |
| `src/App.tsx` | Add routes for `/dashboard/tests/:testId` and `/dashboard/tests/:testId/results` |
| `src/contexts/AuthContext.tsx` | Add function to decrement `tests_remaining` |

---

## Question Format (in database)

```text
Each question stored in JSON format:
- id: unique identifier
- type: "multiple_choice" or "grid_in"
- section: "math" or "reading_writing"
- difficulty: "easy" | "normal" | "hard"
- text: The question text
- options: Array of choices (for multiple choice)
- correct_answer: The correct answer
- explanation: Why the answer is correct (shown in results)
- topic: Specific topic (e.g., "algebra", "grammar")
```

---

## User Flow Summary

1. **Configure** - Select test type, length, difficulty, timer (current page)
2. **Start** - Click "Start Test" to begin
3. **Take Test** - Answer questions, use timer, navigate freely
4. **Submit** - Review flagged questions, confirm submission
5. **Results** - See score, review mistakes, get feedback
6. **Progress** - Results saved to your Progress page

This will give you a fully functional SAT practice experience!

