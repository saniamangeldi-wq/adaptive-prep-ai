ALTER TABLE public.university_database
  ADD COLUMN IF NOT EXISTS sat_p25 integer,
  ADD COLUMN IF NOT EXISTS sat_p75 integer,
  ADD COLUMN IF NOT EXISTS gpa_avg numeric,
  ADD COLUMN IF NOT EXISTS test_optional boolean NOT NULL DEFAULT false;