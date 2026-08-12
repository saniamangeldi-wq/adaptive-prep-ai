ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS abandoned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abandoned_at timestamptz,
  ADD COLUMN IF NOT EXISTS penalty_questions integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS abandon_warnings integer NOT NULL DEFAULT 0;

CREATE TABLE public.question_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text UNIQUE,
  amount_cents integer NOT NULL DEFAULT 100,
  currency text NOT NULL DEFAULT 'usd',
  questions_granted integer NOT NULL DEFAULT 98,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.question_topups TO authenticated;
GRANT ALL ON public.question_topups TO service_role;

ALTER TABLE public.question_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topups"
ON public.question_topups FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_question_topups_updated_at
BEFORE UPDATE ON public.question_topups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_test_attempts_abandoned
  ON public.test_attempts (user_id, abandoned, abandoned_at DESC);