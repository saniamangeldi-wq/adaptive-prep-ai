
-- Add VAK assessment fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vak_visual_pct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vak_auditory_pct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vak_kinesthetic_pct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vak_primary_style text,
ADD COLUMN IF NOT EXISTS vak_secondary_style text,
ADD COLUMN IF NOT EXISTS vak_sub_type text,
ADD COLUMN IF NOT EXISTS vak_tier_taken text,
ADD COLUMN IF NOT EXISTS vak_last_taken_at timestamptz,
ADD COLUMN IF NOT EXISTS vak_progress jsonb;
