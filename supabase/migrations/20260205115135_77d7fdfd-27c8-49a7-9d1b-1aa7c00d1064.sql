-- Create table to store teacher subject/grade assignments
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  grade_levels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, teacher_user_id)
);

-- Enable RLS
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- School admins can manage teacher assignments
CREATE POLICY "School admins can manage teacher assignments"
ON public.teacher_assignments
FOR ALL
USING (public.is_school_admin(school_id, auth.uid()));

-- Teachers can view their own assignments
CREATE POLICY "Teachers can view own assignments"
ON public.teacher_assignments
FOR SELECT
USING (teacher_user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_teacher_assignments_school ON public.teacher_assignments(school_id);
CREATE INDEX idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_teacher_assignments_updated_at
BEFORE UPDATE ON public.teacher_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();