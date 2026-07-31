CREATE OR REPLACE FUNCTION public.consume_ai_credits(
  p_user_id uuid,
  p_cost integer,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (credits_remaining integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles AS p
  SET
    credits_remaining = (
      CASE
        WHEN p.credits_reset_at IS NULL OR p.credits_reset_at::date < p_now::date
          THEN CASE WHEN p.is_trial THEN 75 ELSE CASE p.tier
            WHEN 'tier_1' THEN 40
            WHEN 'tier_2' THEN 100
            WHEN 'tier_3' THEN 200
            ELSE 15
          END END
        ELSE p.credits_remaining
      END
    ) - p_cost,
    credits_reset_at = CASE
      WHEN p.credits_reset_at IS NULL OR p.credits_reset_at::date < p_now::date
        THEN p_now
      ELSE credits_reset_at
    END
  WHERE user_id = p_user_id
    AND p_user_id = auth.uid()
    AND p_cost > 0
    AND (
      CASE
        WHEN p.credits_reset_at IS NULL OR p.credits_reset_at::date < p_now::date
          THEN CASE WHEN p.is_trial THEN 75 ELSE CASE p.tier
            WHEN 'tier_1' THEN 40
            WHEN 'tier_2' THEN 100
            WHEN 'tier_3' THEN 200
            ELSE 15
          END END
        ELSE p.credits_remaining
      END
    ) >= p_cost
  RETURNING p.credits_remaining;
$$;

CREATE OR REPLACE FUNCTION public.refund_ai_credits(
  p_user_id uuid,
  p_cost integer
)
RETURNS TABLE (credits_remaining integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + p_cost
  WHERE user_id = p_user_id
    AND p_user_id = auth.uid()
    AND p_cost > 0
  RETURNING profiles.credits_remaining;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_credits(uuid, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer, timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.refund_ai_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_ai_credits(uuid, integer) TO authenticated;
