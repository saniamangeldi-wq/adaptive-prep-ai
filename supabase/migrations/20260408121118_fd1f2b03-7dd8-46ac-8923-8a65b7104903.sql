
-- Video lessons table
CREATE TABLE public.video_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  difficulty_level TEXT DEFAULT 'medium',
  script_content TEXT,
  audio_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  vak_style TEXT,
  render_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lessons" ON public.video_lessons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own lessons" ON public.video_lessons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lessons" ON public.video_lessons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lessons" ON public.video_lessons FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view school student lessons" ON public.video_lessons FOR SELECT USING (public.is_same_school(auth.uid(), user_id));

CREATE TRIGGER update_video_lessons_updated_at BEFORE UPDATE ON public.video_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Study plans table
CREATE TABLE public.study_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  topics JSONB DEFAULT '[]'::jsonb,
  current_topic_index INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  generated_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans" ON public.study_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own plans" ON public.study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.study_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.study_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON public.study_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Study plan lessons (join table)
CREATE TABLE public.study_plan_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plan_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan lessons" ON public.study_plan_lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.study_plans WHERE id = study_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own plan lessons" ON public.study_plan_lessons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.study_plans WHERE id = study_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own plan lessons" ON public.study_plan_lessons FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.study_plans WHERE id = study_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own plan lessons" ON public.study_plan_lessons FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.study_plans WHERE id = study_plan_id AND user_id = auth.uid())
);

-- Video render jobs table
CREATE TABLE public.video_render_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID REFERENCES public.video_lessons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  render_engine TEXT DEFAULT 'remotion_lambda',
  render_config JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.video_render_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own jobs" ON public.video_render_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.video_render_jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_video_render_jobs_updated_at BEFORE UPDATE ON public.video_render_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Performance checkpoints table
CREATE TABLE public.performance_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  score_pct NUMERIC(5,2),
  weak_areas JSONB DEFAULT '[]'::jsonb,
  strong_areas JSONB DEFAULT '[]'::jsonb,
  source_type TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkpoints" ON public.performance_checkpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own checkpoints" ON public.performance_checkpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can view school student checkpoints" ON public.performance_checkpoints FOR SELECT USING (public.is_same_school(auth.uid(), user_id));

-- Indexes for performance
CREATE INDEX idx_video_lessons_user_id ON public.video_lessons(user_id);
CREATE INDEX idx_video_lessons_status ON public.video_lessons(status);
CREATE INDEX idx_study_plans_user_id ON public.study_plans(user_id);
CREATE INDEX idx_study_plans_status ON public.study_plans(status);
CREATE INDEX idx_video_render_jobs_user_id ON public.video_render_jobs(user_id);
CREATE INDEX idx_video_render_jobs_status ON public.video_render_jobs(status);
CREATE INDEX idx_performance_checkpoints_user_id ON public.performance_checkpoints(user_id);
CREATE INDEX idx_performance_checkpoints_subject ON public.performance_checkpoints(subject);
