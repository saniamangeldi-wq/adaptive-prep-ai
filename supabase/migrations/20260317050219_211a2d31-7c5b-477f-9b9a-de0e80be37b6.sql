CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_name TEXT,
  city TEXT,
  country TEXT,
  enrollment_date TEXT,
  confidence_score INTEGER,
  verdict TEXT,
  total_needed_usd NUMERIC,
  projected_savings_usd NUMERIC,
  gap_usd NUMERIC,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own financial reports"
  ON public.financial_reports FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);