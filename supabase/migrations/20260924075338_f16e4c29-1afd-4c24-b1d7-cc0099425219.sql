CREATE TABLE public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid,
  subject text NOT NULL DEFAULT 'SAT',
  topic text NOT NULL DEFAULT 'General',
  total_questions integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_sessions TO authenticated;
GRANT ALL ON public.quiz_sessions TO service_role;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own quiz sessions" ON public.quiz_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_quiz_sessions_user ON public.quiz_sessions(user_id, status);
CREATE INDEX idx_quiz_sessions_conv ON public.quiz_sessions(conversation_id);
CREATE TRIGGER update_quiz_sessions_updated_at BEFORE UPDATE ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.quiz_questions (
  question_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  subject text,
  topic text,
  subtopic text,
  sequence_number integer NOT NULL,
  total_questions integer NOT NULL DEFAULT 10,
  question_text text NOT NULL,
  input_type text NOT NULL,
  options jsonb,
  correct_answer text,
  explanation text,
  evaluation_criteria jsonb,
  rendered_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quiz_questions_session ON public.quiz_questions(session_id, sequence_number);
CREATE INDEX idx_quiz_questions_user ON public.quiz_questions(user_id);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  question_id uuid NOT NULL,
  subject text,
  topic text,
  subtopic text,
  sequence_number integer,
  total_questions integer,
  question_text text,
  input_type text,
  options jsonb,
  selected_answer text,
  correct_answer text,
  is_correct boolean,
  status text NOT NULL DEFAULT 'submitted',
  score numeric,
  evaluation text,
  hint_used boolean NOT NULL DEFAULT false,
  explanation_opened boolean NOT NULL DEFAULT false,
  attempt_number integer NOT NULL DEFAULT 1,
  response_time_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_attempts_unique UNIQUE (user_id, session_id, question_id, attempt_number)
);
GRANT SELECT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own quiz attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_session ON public.quiz_attempts(session_id);
CREATE INDEX idx_quiz_attempts_question ON public.quiz_attempts(question_id);
CREATE INDEX idx_quiz_attempts_topic ON public.quiz_attempts(topic);
CREATE INDEX idx_quiz_attempts_subtopic ON public.quiz_attempts(subtopic);

CREATE TABLE public.quiz_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  question_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_events TO authenticated;
GRANT ALL ON public.quiz_events TO service_role;
ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own quiz events" ON public.quiz_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_quiz_events_user ON public.quiz_events(user_id, created_at DESC);
CREATE INDEX idx_quiz_events_question ON public.quiz_events(question_id);