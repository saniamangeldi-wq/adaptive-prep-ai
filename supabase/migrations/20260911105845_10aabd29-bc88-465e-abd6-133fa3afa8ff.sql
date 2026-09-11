ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS attempt_source text,
  ADD COLUMN IF NOT EXISTS wrong_question_ids text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS skipped_question_ids text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.test_attempts
  ADD CONSTRAINT test_attempts_attempt_source_check
  CHECK (attempt_source IS NULL OR attempt_source IN ('practice', 'mock'));

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_source_completed
  ON public.test_attempts (user_id, attempt_source, completed_at DESC)
  WHERE completed_at IS NOT NULL AND abandoned = false;