-- Create table for admin-specific invite codes
CREATE TABLE public.admin_invite_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5((random())::text), 1, 8),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (admin_user_id, school_id)
);

-- Enable RLS
ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- Admins can view their own invite codes
CREATE POLICY "Admins can view their own codes"
ON public.admin_invite_codes
FOR SELECT
USING (auth.uid() = admin_user_id);

-- Admins can insert their own invite codes
CREATE POLICY "Admins can create their own codes"
ON public.admin_invite_codes
FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

-- Create function to auto-generate admin invite code on school creation
CREATE OR REPLACE FUNCTION public.create_admin_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role = 'school_admin' THEN
        INSERT INTO public.admin_invite_codes (admin_user_id, school_id)
        VALUES (NEW.user_id, NEW.school_id)
        ON CONFLICT (admin_user_id, school_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger to auto-generate invite code when admin is added
CREATE TRIGGER on_school_admin_added
    AFTER INSERT ON public.school_members
    FOR EACH ROW
    EXECUTE FUNCTION public.create_admin_invite_code();