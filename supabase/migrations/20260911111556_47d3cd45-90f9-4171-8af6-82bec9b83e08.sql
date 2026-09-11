ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ielts_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS ielts_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_ielts_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.ielts_enabled = true
  ) OR EXISTS (
    SELECT 1 FROM public.school_members sm
    JOIN public.schools s ON s.id = sm.school_id
    WHERE sm.user_id = _user_id AND sm.status = 'active' AND s.ielts_enabled = true
  );
$$;

CREATE TABLE IF NOT EXISTS public.ielts_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill text NOT NULL CHECK (skill IN ('reading','writing')),
  variant text NOT NULL DEFAULT 'academic' CHECK (variant IN ('academic','general')),
  mode text NOT NULL DEFAULT 'practice' CHECK (mode IN ('practice','timed')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_score integer,
  band numeric(3,1),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ielts_sessions TO authenticated;
GRANT ALL ON public.ielts_sessions TO service_role;
ALTER TABLE public.ielts_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own IELTS sessions"
ON public.ielts_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND public.has_ielts_access(auth.uid()));

CREATE POLICY "Tutors and teachers view their students IELTS sessions"
ON public.ielts_sessions FOR SELECT TO authenticated
USING (
  public.is_tutor_of_student(auth.uid(), user_id)
  OR public.is_teacher_of_student(auth.uid(), user_id)
);

CREATE TRIGGER update_ielts_sessions_updated_at
BEFORE UPDATE ON public.ielts_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ielts_sessions_user ON public.ielts_sessions (user_id, skill, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ielts_writing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.ielts_sessions(id) ON DELETE SET NULL,
  task_type text NOT NULL CHECK (task_type IN ('task1_academic','task1_general','task2')),
  prompt text NOT NULL,
  chart jsonb,
  essay text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_band numeric(3,1),
  comments jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ielts_writing_reports TO authenticated;
GRANT ALL ON public.ielts_writing_reports TO service_role;
ALTER TABLE public.ielts_writing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own IELTS writing reports"
ON public.ielts_writing_reports FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND public.has_ielts_access(auth.uid()));

CREATE POLICY "Tutors and teachers view their students IELTS reports"
ON public.ielts_writing_reports FOR SELECT TO authenticated
USING (
  public.is_tutor_of_student(auth.uid(), user_id)
  OR public.is_teacher_of_student(auth.uid(), user_id)
);

CREATE TRIGGER update_ielts_writing_reports_updated_at
BEFORE UPDATE ON public.ielts_writing_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ielts_reports_user ON public.ielts_writing_reports (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ielts_trials (
  user_id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  converted boolean NOT NULL DEFAULT false,
  reminder_day3_sent_at timestamptz,
  reminder_day6_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ielts_trials TO authenticated;
GRANT ALL ON public.ielts_trials TO service_role;
ALTER TABLE public.ielts_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own IELTS trial"
ON public.ielts_trials FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users start their own IELTS trial"
ON public.ielts_trials FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ielts_trials_updated_at
BEFORE UPDATE ON public.ielts_trials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.profiles SET ielts_enabled = true WHERE email = 'sani.amangeldi@gmail.com';