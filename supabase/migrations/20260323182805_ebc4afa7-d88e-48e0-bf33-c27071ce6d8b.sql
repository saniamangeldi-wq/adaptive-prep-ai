
-- Table to store flagged duplicate/similar accounts
CREATE TABLE public.duplicate_account_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  new_user_id uuid NOT NULL,
  existing_user_id uuid NOT NULL,
  new_email text NOT NULL,
  existing_email text NOT NULL,
  new_name text,
  existing_name text,
  similarity_reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(new_user_id, existing_user_id)
);

-- Enable RLS
ALTER TABLE public.duplicate_account_flags ENABLE ROW LEVEL SECURITY;

-- Only admins (school_admin role profiles) can view and manage flags
CREATE POLICY "Admins can view all flags"
  ON public.duplicate_account_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'school_admin'
    )
  );

CREATE POLICY "Admins can update flags"
  ON public.duplicate_account_flags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'school_admin'
    )
  );

-- Function to detect similar accounts on new profile creation
CREATE OR REPLACE FUNCTION public.detect_duplicate_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_record RECORD;
  new_email_prefix text;
  existing_email_prefix text;
BEGIN
  -- Extract email prefix (before @)
  new_email_prefix := lower(split_part(NEW.email, '@', 1));
  
  -- Remove dots and plus-aliases from gmail-style addresses for comparison
  -- e.g., sani.amangeldi+test@gmail.com -> saniamangeldi@gmail.com
  
  FOR existing_record IN
    SELECT user_id, email, full_name
    FROM public.profiles
    WHERE user_id != NEW.user_id
  LOOP
    existing_email_prefix := lower(split_part(existing_record.email, '@', 1));
    
    -- Check 1: Same email prefix (ignoring dots) on same domain
    IF replace(new_email_prefix, '.', '') = replace(existing_email_prefix, '.', '')
       AND lower(split_part(NEW.email, '@', 2)) = lower(split_part(existing_record.email, '@', 2))
    THEN
      INSERT INTO public.duplicate_account_flags (
        new_user_id, existing_user_id,
        new_email, existing_email,
        new_name, existing_name,
        similarity_reason
      ) VALUES (
        NEW.user_id, existing_record.user_id,
        NEW.email, existing_record.email,
        NEW.full_name, existing_record.full_name,
        'Same email prefix (dot variation)'
      ) ON CONFLICT (new_user_id, existing_user_id) DO NOTHING;
      CONTINUE;
    END IF;
    
    -- Check 2: Very similar email prefix (e.g., sani.amangeldi vs sani.amangeldi09)
    IF length(new_email_prefix) >= 5 AND length(existing_email_prefix) >= 5
       AND (
         new_email_prefix LIKE existing_email_prefix || '%'
         OR existing_email_prefix LIKE new_email_prefix || '%'
       )
       AND lower(split_part(NEW.email, '@', 2)) = lower(split_part(existing_record.email, '@', 2))
    THEN
      INSERT INTO public.duplicate_account_flags (
        new_user_id, existing_user_id,
        new_email, existing_email,
        new_name, existing_name,
        similarity_reason
      ) VALUES (
        NEW.user_id, existing_record.user_id,
        NEW.email, existing_record.email,
        NEW.full_name, existing_record.full_name,
        'Similar email prefix on same domain'
      ) ON CONFLICT (new_user_id, existing_user_id) DO NOTHING;
      CONTINUE;
    END IF;
    
    -- Check 3: Same full name AND different email
    IF NEW.full_name IS NOT NULL 
       AND existing_record.full_name IS NOT NULL
       AND lower(trim(NEW.full_name)) = lower(trim(existing_record.full_name))
       AND NEW.email != existing_record.email
    THEN
      INSERT INTO public.duplicate_account_flags (
        new_user_id, existing_user_id,
        new_email, existing_email,
        new_name, existing_name,
        similarity_reason
      ) VALUES (
        NEW.user_id, existing_record.user_id,
        NEW.email, existing_record.email,
        NEW.full_name, existing_record.full_name,
        'Identical full name'
      ) ON CONFLICT (new_user_id, existing_user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger on new profile creation
CREATE TRIGGER on_profile_created_check_duplicates
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_duplicate_accounts();
