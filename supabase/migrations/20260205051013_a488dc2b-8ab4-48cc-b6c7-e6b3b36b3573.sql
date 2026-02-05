
-- Add minimum grade requirement to university database
ALTER TABLE public.university_database 
ADD COLUMN min_grade_requirement integer DEFAULT 12;

-- Add a comment explaining the field
COMMENT ON COLUMN public.university_database.min_grade_requirement IS 'Minimum grade level required for admission (e.g., 11 or 12)';
