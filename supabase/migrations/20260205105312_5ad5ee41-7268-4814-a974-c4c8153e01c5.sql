-- Assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  total_points integer DEFAULT 100,
  subject text,
  grade_level text,
  created_by uuid NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  tutor_id uuid,
  status text CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'published',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  file_url text,
  text_content text,
  score integer,
  feedback text,
  graded_by uuid,
  graded_at timestamp with time zone,
  status text CHECK (status IN ('submitted', 'graded', 'late', 'missing')) DEFAULT 'submitted'
);

-- Grades table
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  tutor_id uuid,
  subject text NOT NULL,
  grade_value decimal(5,2),
  grade_letter text,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  graded_by uuid,
  graded_at timestamp with time zone DEFAULT now(),
  term text,
  notes text
);

-- Curriculum table
CREATE TABLE public.curriculum_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  subject text NOT NULL,
  grade_level text,
  description text,
  learning_objectives text[],
  resources jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Calendar events table
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  tutor_id uuid,
  title text NOT NULL,
  description text,
  event_type text CHECK (event_type IN ('exam', 'lesson', 'assignment', 'meeting', 'holiday')),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  location text,
  subject text,
  grade_level text,
  created_by uuid,
  attendees uuid[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Student groups (for tutors)
CREATE TABLE public.student_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Group members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.student_groups(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, student_id)
);

-- Student points for leaderboard
CREATE TABLE public.student_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  tutor_id uuid,
  points integer DEFAULT 0,
  assignments_completed integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_assignments_school ON public.assignments(school_id);
CREATE INDEX idx_assignments_tutor ON public.assignments(tutor_id);
CREATE INDEX idx_assignments_created_by ON public.assignments(created_by);
CREATE INDEX idx_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_grades_student ON public.grades(student_id);
CREATE INDEX idx_grades_school ON public.grades(school_id);
CREATE INDEX idx_calendar_school ON public.calendar_events(school_id);
CREATE INDEX idx_calendar_tutor ON public.calendar_events(tutor_id);
CREATE INDEX idx_curriculum_school ON public.curriculum_items(school_id);
CREATE INDEX idx_student_groups_tutor ON public.student_groups(tutor_id);
CREATE INDEX idx_student_points_student ON public.student_points(student_id);

-- Enable RLS on all tables
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignments
CREATE POLICY "School members can view school assignments"
ON public.assignments FOR SELECT
USING (
  school_id IS NOT NULL AND public.is_school_member(school_id, auth.uid())
);

CREATE POLICY "Tutor students can view tutor assignments"
ON public.assignments FOR SELECT
USING (
  tutor_id IS NOT NULL AND public.is_tutor_of_student(tutor_id, auth.uid())
);

CREATE POLICY "Creators can view own assignments"
ON public.assignments FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Teachers and tutors can create assignments"
ON public.assignments FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update assignments"
ON public.assignments FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete assignments"
ON public.assignments FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for submissions
CREATE POLICY "Students can view own submissions"
ON public.assignment_submissions FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Assignment creators can view submissions"
ON public.assignment_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments 
    WHERE assignments.id = assignment_submissions.assignment_id 
    AND assignments.created_by = auth.uid()
  )
);

CREATE POLICY "Students can submit assignments"
ON public.assignment_submissions FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own submissions"
ON public.assignment_submissions FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Graders can update submissions"
ON public.assignment_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assignments 
    WHERE assignments.id = assignment_submissions.assignment_id 
    AND assignments.created_by = auth.uid()
  )
);

-- RLS Policies for grades
CREATE POLICY "Students can view own grades"
ON public.grades FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "School admins can view school grades"
ON public.grades FOR SELECT
USING (
  school_id IS NOT NULL AND public.is_school_admin(school_id, auth.uid())
);

CREATE POLICY "Tutors can view their students grades"
ON public.grades FOR SELECT
USING (
  tutor_id IS NOT NULL AND auth.uid() = tutor_id
);

CREATE POLICY "Teachers can create grades"
ON public.grades FOR INSERT
WITH CHECK (auth.uid() = graded_by);

CREATE POLICY "Graders can update grades"
ON public.grades FOR UPDATE
USING (auth.uid() = graded_by);

-- RLS Policies for curriculum
CREATE POLICY "School members can view curriculum"
ON public.curriculum_items FOR SELECT
USING (public.is_school_member(school_id, auth.uid()));

CREATE POLICY "School admins can create curriculum"
ON public.curriculum_items FOR INSERT
WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "School admins can update curriculum"
ON public.curriculum_items FOR UPDATE
USING (public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "School admins can delete curriculum"
ON public.curriculum_items FOR DELETE
USING (public.is_school_admin(school_id, auth.uid()));

-- RLS Policies for calendar events
CREATE POLICY "School members can view school events"
ON public.calendar_events FOR SELECT
USING (
  school_id IS NOT NULL AND public.is_school_member(school_id, auth.uid())
);

CREATE POLICY "Tutor students can view tutor events"
ON public.calendar_events FOR SELECT
USING (
  tutor_id IS NOT NULL AND public.is_tutor_of_student(tutor_id, auth.uid())
);

CREATE POLICY "Event creators can view own events"
ON public.calendar_events FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "School admins can create events"
ON public.calendar_events FOR INSERT
WITH CHECK (
  (school_id IS NOT NULL AND public.is_school_admin(school_id, auth.uid()))
  OR auth.uid() = created_by
);

CREATE POLICY "Event creators can update events"
ON public.calendar_events FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Event creators can delete events"
ON public.calendar_events FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for student groups
CREATE POLICY "Tutors can view own groups"
ON public.student_groups FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can create groups"
ON public.student_groups FOR INSERT
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update own groups"
ON public.student_groups FOR UPDATE
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete own groups"
ON public.student_groups FOR DELETE
USING (auth.uid() = tutor_id);

-- RLS Policies for group members
CREATE POLICY "Tutors can view group members"
ON public.group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.student_groups 
    WHERE student_groups.id = group_members.group_id 
    AND student_groups.tutor_id = auth.uid()
  )
);

CREATE POLICY "Students can view own memberships"
ON public.group_members FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Tutors can add group members"
ON public.group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_groups 
    WHERE student_groups.id = group_members.group_id 
    AND student_groups.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can remove group members"
ON public.group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.student_groups 
    WHERE student_groups.id = group_members.group_id 
    AND student_groups.tutor_id = auth.uid()
  )
);

-- RLS Policies for student points
CREATE POLICY "Students can view own points"
ON public.student_points FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view their students points"
ON public.student_points FOR SELECT
USING (tutor_id IS NOT NULL AND auth.uid() = tutor_id);

CREATE POLICY "School admins can view school points"
ON public.student_points FOR SELECT
USING (
  school_id IS NOT NULL AND public.is_school_admin(school_id, auth.uid())
);

CREATE POLICY "Tutors can create student points"
ON public.student_points FOR INSERT
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update student points"
ON public.student_points FOR UPDATE
USING (auth.uid() = tutor_id);

-- Update triggers
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curriculum_updated_at
BEFORE UPDATE ON public.curriculum_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_points_updated_at
BEFORE UPDATE ON public.student_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();