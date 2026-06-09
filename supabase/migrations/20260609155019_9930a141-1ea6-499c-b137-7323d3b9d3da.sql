
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_member boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.paywall_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  variant text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paywall_dismissals TO authenticated;
GRANT ALL ON public.paywall_dismissals TO service_role;

ALTER TABLE public.paywall_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own paywall dismissals"
  ON public.paywall_dismissals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own paywall dismissals"
  ON public.paywall_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS paywall_dismissals_user_variant_idx
  ON public.paywall_dismissals (user_id, variant, dismissed_at DESC);

CREATE OR REPLACE FUNCTION public.get_founding_member_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.profiles WHERE founding_member = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_founding_member_count() TO anon, authenticated;
