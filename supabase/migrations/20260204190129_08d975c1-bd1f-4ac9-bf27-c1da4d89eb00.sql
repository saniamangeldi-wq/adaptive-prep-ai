-- Add study preferences columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS study_subjects jsonb DEFAULT '["SAT"]'::jsonb,
ADD COLUMN IF NOT EXISTS grade_level text,
ADD COLUMN IF NOT EXISTS primary_goal text;

-- Create study_subjects reference table
CREATE TABLE IF NOT EXISTS study_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('test_prep', 'high_school', 'college', 'general')),
  icon text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE study_subjects ENABLE ROW LEVEL SECURITY;

-- Anyone can read study subjects (public reference data)
CREATE POLICY "Anyone can view study subjects"
ON study_subjects FOR SELECT
USING (true);

-- Insert default subjects
INSERT INTO study_subjects (name, category, icon, description, sort_order) VALUES
('SAT', 'test_prep', '📝', 'Digital SAT preparation', 1),
('ACT', 'test_prep', '📊', 'ACT test preparation', 2),
('AP Calculus', 'test_prep', '📐', 'Advanced Placement Calculus', 3),
('AP English', 'test_prep', '📖', 'Advanced Placement English', 4),
('Math', 'high_school', '🔢', 'Algebra, Geometry, Pre-Calculus', 5),
('Science', 'high_school', '🧪', 'Biology, Chemistry, Physics', 6),
('English', 'high_school', '📚', 'Grammar, Writing, Literature', 7),
('History', 'high_school', '🏛️', 'US History, World History', 8),
('Essay Writing', 'general', '✍️', 'College essays, creative writing', 9),
('Homework Help', 'general', '📝', 'Any subject homework assistance', 10)
ON CONFLICT (name) DO NOTHING;