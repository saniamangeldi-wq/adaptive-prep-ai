
-- Prebuilt Lessons module: schema
CREATE TABLE public.prebuilt_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL CHECK (subject IN ('math','verbal')),
  section TEXT NOT NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prebuilt_lessons TO authenticated, anon;
GRANT ALL ON public.prebuilt_lessons TO service_role;
ALTER TABLE public.prebuilt_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prebuilt lessons"
  ON public.prebuilt_lessons FOR SELECT
  USING (true);
CREATE INDEX prebuilt_lessons_subject_idx ON public.prebuilt_lessons(subject, section, order_index);

CREATE TABLE public.prebuilt_lesson_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.prebuilt_lessons(id) ON DELETE CASCADE,
  vak_style TEXT NOT NULL CHECK (vak_style IN ('visual','auditory','reading_writing','kinesthetic')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, vak_style)
);
GRANT SELECT ON public.prebuilt_lesson_variants TO authenticated, anon;
GRANT ALL ON public.prebuilt_lesson_variants TO service_role;
ALTER TABLE public.prebuilt_lesson_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read variants"
  ON public.prebuilt_lesson_variants FOR SELECT
  USING (true);
CREATE INDEX prebuilt_lesson_variants_lesson_idx ON public.prebuilt_lesson_variants(lesson_id);

CREATE TABLE public.prebuilt_lesson_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.prebuilt_lessons(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id)
);
GRANT SELECT ON public.prebuilt_lesson_quizzes TO authenticated, anon;
GRANT ALL ON public.prebuilt_lesson_quizzes TO service_role;
ALTER TABLE public.prebuilt_lesson_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quizzes"
  ON public.prebuilt_lesson_quizzes FOR SELECT
  USING (true);

CREATE TABLE public.student_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.prebuilt_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started','in_progress','completed')),
  last_slide_index INT NOT NULL DEFAULT 0,
  quiz_score INT,
  quiz_total INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_lesson_progress TO authenticated;
GRANT ALL ON public.student_lesson_progress TO service_role;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson progress"
  ON public.student_lesson_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX student_lesson_progress_user_idx ON public.student_lesson_progress(user_id);

CREATE TABLE public.student_lesson_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.prebuilt_lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_lesson_bookmarks TO authenticated;
GRANT ALL ON public.student_lesson_bookmarks TO service_role;
ALTER TABLE public.student_lesson_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson bookmarks"
  ON public.student_lesson_bookmarks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_prebuilt_lessons_updated_at
  BEFORE UPDATE ON public.prebuilt_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_lesson_progress_updated_at
  BEFORE UPDATE ON public.student_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
