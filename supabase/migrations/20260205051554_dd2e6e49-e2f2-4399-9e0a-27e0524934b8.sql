
-- Add graduation year to university preferences
ALTER TABLE public.university_preferences 
ADD COLUMN graduation_year integer;

COMMENT ON COLUMN public.university_preferences.graduation_year IS 'Year the student expects to graduate high school (e.g., 2025, 2026)';
