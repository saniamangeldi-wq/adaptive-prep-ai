# Intern Triage Guide — SAT Question Bug Reports

This guide explains how to handle bug reports that students submit via the "⚠️ Report Issue" button.

---

## Where Reports Go

1. **Database**: Every report is stored in the `sat_question_reports` table in Supabase.
2. **GitHub Issues**: Reports are auto-filed as GitHub issues in this repo with labels:
   - `bug:answer-key` (wrong correct answer)
   - `bug:wording` (unclear/confusing wording)
   - `bug:rendering` (images/math not loading)
   - `bug:duplicate` (duplicate question)
   - `bug:other` (other issues)

---

## Severity Levels

| Label | Severity | Priority | Action Required |
|-------|----------|----------|----------------|
| `bug:answer-key` | High | P1 | Immediate review — blocks student progress |
| `bug:rendering` | High | P1 | Check image/math rendering; fix ASAP |
| `bug:wording` | Medium | P2 | Ambiguity; may need rewording |
| `bug:other` | Medium | P2 | Requires manual review of details |
| `bug:duplicate` | Low | P3 | Track frequency; may merge reports |

---

## Triage Workflow

### Step 1: Check the Issue Title

Issue titles follow this format:
```
[Bug] {issue_type} — Question {question_id} ({mode})
```

Example:
```
[Bug] wrong_answer_key — Question qb_12345 (live-generated)
```

### Step 2: Read the Issue Body

Each issue contains:
- **Question Details**: ID, mode, model used, question text
- **User Report**: Issue type, selected answer, correct answer, explanation, free text
- **Context**: User tier, timestamp, user agent, session ID

### Step 3: Reproduce the Issue

1. **Find the question in Supabase**:
   ```sql
   SELECT * FROM sat_questions WHERE id = 'question_id_here';
   ```

2. **Test the question yourself**:
   - Solve it independently
   - Verify the correct answer
   - Check if wording is ambiguous
   - Test rendering (images, math LaTeX, etc.)

3. **Check for duplicate reports**:
   - Search GitHub issues for the same `question_id`
   - If multiple reports exist, the issue will already have comments showing frequency

### Step 4: Categorize the Outcome

| Outcome | Action |
|---------|--------|
| **Confirmed bug** | Leave issue open, add `confirmed` label, assign to Sania or a coder |
| **False alarm** | Add comment explaining why, close issue with `not a bug` label |
| **Needs more info** | Add comment asking for clarification, keep open |
| **Duplicate** | Close with comment linking to the original issue |

### Step 5: Fix the Question

**For pregenerated questions**:
1. Edit the question directly in Supabase:
   ```sql
   UPDATE sat_questions 
   SET stem = '...', choices_json = '...', correct_answer = '...', explanation = '...'
   WHERE id = 'question_id_here';
   ```
2. Set `active = false` if the question is broken beyond quick fix

**For live-generated questions**:
1. Mark the question as `quarantined` in the database:
   ```sql
   UPDATE sat_questions 
   SET validation_status = 'quarantined', active = false
   WHERE id = 'question_id_here';
   ```
2. Improve the generation prompt or validation rules to prevent similar issues

---

## Quick Reference: Common Issues

### Wrong Answer Key
**Symptoms**: Student selected an answer that's actually correct, or the explanation doesn't match the answer.

**Fix**:
1. Verify the correct answer independently
2. Update `correct_answer` and `explanation` in the database
3. If the question is fundamentally flawed, set `active = false`

### Unclear Wording
**Symptoms**: Multiple students report the same question as confusing; free text mentions ambiguity.

**Fix**:
1. Rewrite the stem or choices to be clearer
2. Add missing context if needed
3. Consider lowering difficulty rating if confusion stems from trickiness

### Rendering Bug
**Symptoms**: Images not loading, LaTeX math showing raw code, broken formatting.

**Fix**:
1. Check the `context` and `stem` fields for malformed LaTeX or image URLs
2. Fix the formatting in the database
3. If using generated images, verify the image generation pipeline

### Duplicate Question
**Symptoms**: Same question appears multiple times in a session or across users.

**Fix**:
1. Check if it's a pregenerated question being served repeatedly
2. If so, increase variety in the pregenerated bank or adjust the random selection query
3. If live-generated, this is expected — mark as `not a bug` and close

---

## Escalation

Escalate to Sania immediately if:
- A bug affects multiple questions (systemic issue)
- A student reports offensive or inappropriate content
- The bug involves user data, authentication, or payment
- You're unsure whether a question violates College Board copyright

---

## Tools

- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Issues**: https://github.com/saniamangeldi-wq/adaptive-prep-ai/issues
- **Question Table**: `sat_questions` in Supabase SQL Editor

---

## Questions?

Ask in the team Telegram group or tag @saniamangeldi-wq in a GitHub comment.
