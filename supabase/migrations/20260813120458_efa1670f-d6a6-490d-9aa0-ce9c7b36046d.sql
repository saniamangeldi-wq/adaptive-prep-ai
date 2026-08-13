CREATE TABLE public.subscription_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  tier public.pricing_tier,
  reason text NOT NULL,
  feedback text,
  stripe_subscription_id text,
  access_until timestamptz,
  stripe_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_cancellations TO authenticated;
GRANT ALL ON public.subscription_cancellations TO service_role;

ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cancellations"
ON public.subscription_cancellations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_subscription_cancellations_user ON public.subscription_cancellations(user_id, created_at DESC);