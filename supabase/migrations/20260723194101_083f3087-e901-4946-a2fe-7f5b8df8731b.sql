
ALTER TABLE public.student_university_matches
  ADD COLUMN IF NOT EXISTS fit_score numeric,
  ADD COLUMN IF NOT EXISTS admit_probability numeric,
  ADD COLUMN IF NOT EXISTS admit_bucket text;

CREATE INDEX IF NOT EXISTS idx_sum_bucket ON public.student_university_matches(student_id, admit_bucket);
