
CREATE TABLE public.university_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.university_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own grants"
  ON public.university_access_grants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert grants"
  ON public.university_access_grants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
