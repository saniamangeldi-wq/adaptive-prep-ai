-- Enquiries from the SAT Intensive page. Anyone can submit one (the page is
-- public); nobody can read them through the API. Read them in the Supabase
-- dashboard (Table editor → cohort_leads) or with the service role.

CREATE TABLE IF NOT EXISTS public.cohort_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cohort text NOT NULL CHECK (char_length(cohort) <= 20),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  contact text NOT NULL CHECK (char_length(trim(contact)) BETWEEN 3 AND 100),
  grade text CHECK (grade IS NULL OR char_length(grade) <= 20),
  target_score integer CHECK (target_score IS NULL OR target_score BETWEEN 400 AND 1600),
  language text CHECK (language IS NULL OR language IN ('ru', 'kk', 'en')),
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  source text CHECK (source IS NULL OR char_length(source) <= 100),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'call_booked', 'paid', 'lost'))
);

ALTER TABLE public.cohort_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an enquiry" ON public.cohort_leads;
CREATE POLICY "Anyone can submit an enquiry"
  ON public.cohort_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new');

REVOKE ALL ON public.cohort_leads FROM anon, authenticated;
GRANT INSERT ON public.cohort_leads TO anon, authenticated;

CREATE INDEX IF NOT EXISTS cohort_leads_created_at_idx ON public.cohort_leads (created_at DESC);
