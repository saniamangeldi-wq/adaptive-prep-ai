
-- Student levels table
CREATE TABLE public.student_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  rank_title TEXT NOT NULL DEFAULT 'Beginner',
  unlocked_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own level" ON public.student_levels FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own level" ON public.student_levels FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own level" ON public.student_levels FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Tutors can view student levels" ON public.student_levels FOR SELECT USING (is_tutor_of_student(auth.uid(), student_id));
CREATE POLICY "Teachers can view student levels" ON public.student_levels FOR SELECT USING (is_teacher_of_student(auth.uid(), student_id));
CREATE POLICY "School admins can view school student levels" ON public.student_levels FOR SELECT USING (is_same_school(auth.uid(), student_id));

-- Leaderboard: all authenticated users can see all levels (collaborative/public leaderboard)
CREATE POLICY "Authenticated users can view leaderboard" ON public.student_levels FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_student_levels_updated_at BEFORE UPDATE ON public.student_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily challenges table
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view challenges" ON public.daily_challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can insert challenges" ON public.daily_challenges FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX idx_daily_challenges_date ON public.daily_challenges(challenge_date);

-- Daily challenge completions
CREATE TABLE public.daily_challenge_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, challenge_id)
);

ALTER TABLE public.daily_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own completions" ON public.daily_challenge_completions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can complete challenges" ON public.daily_challenge_completions FOR INSERT WITH CHECK (auth.uid() = student_id);
