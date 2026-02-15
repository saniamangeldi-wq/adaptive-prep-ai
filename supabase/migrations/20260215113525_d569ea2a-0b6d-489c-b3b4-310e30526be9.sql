
-- Create student_badges table for achievement tracking
CREATE TABLE public.student_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own badges"
ON public.student_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges"
ON public.student_badges FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_student_badges_user ON public.student_badges(user_id);
CREATE UNIQUE INDEX idx_student_badges_unique ON public.student_badges(user_id, badge_type);
