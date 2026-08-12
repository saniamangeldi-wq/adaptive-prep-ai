ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS session_state jsonb,
  ADD COLUMN IF NOT EXISTS module_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_saved_at timestamptz;