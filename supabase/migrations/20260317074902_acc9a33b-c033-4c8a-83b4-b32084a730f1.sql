
-- Add new columns to existing university_database table for expanded data
ALTER TABLE public.university_database
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS qs_rank INTEGER,
  ADD COLUMN IF NOT EXISTS times_rank INTEGER,
  ADD COLUMN IF NOT EXISTS acceptance_rate_label TEXT,
  ADD COLUMN IF NOT EXISTS sat_range TEXT,
  ADD COLUMN IF NOT EXISTS ielts_min NUMERIC,
  ADD COLUMN IF NOT EXISTS toefl_min INTEGER,
  ADD COLUMN IF NOT EXISTS living_cost_usd INTEGER,
  ADD COLUMN IF NOT EXISTS offers_full_scholarship BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scholarship_name TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_coverage TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_url TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_open_to TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_deadline TEXT,
  ADD COLUMN IF NOT EXISTS popular_majors TEXT[],
  ADD COLUMN IF NOT EXISTS international_student_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS campus_setting TEXT,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'seeded',
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_university_database_qs_rank ON public.university_database(qs_rank);
CREATE INDEX IF NOT EXISTS idx_university_database_country ON public.university_database(country);
CREATE INDEX IF NOT EXISTS idx_university_database_scholarship ON public.university_database(offers_full_scholarship);
CREATE INDEX IF NOT EXISTS idx_university_database_acceptance ON public.university_database(acceptance_rate);
