-- Create tutor invite codes table (similar to admin_invite_codes)
CREATE TABLE public.tutor_invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL,
    invite_code TEXT NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tutor_user_id),
    UNIQUE(invite_code)
);

-- Enable RLS
ALTER TABLE public.tutor_invite_codes ENABLE ROW LEVEL SECURITY;

-- Tutor can view their own code
CREATE POLICY "Tutors can view own invite code"
ON public.tutor_invite_codes FOR SELECT
USING (auth.uid() = tutor_user_id);

-- Tutor can insert their own code
CREATE POLICY "Tutors can create own invite code"
ON public.tutor_invite_codes FOR INSERT
WITH CHECK (auth.uid() = tutor_user_id);

-- Anyone can look up codes (for validation during join)
CREATE POLICY "Anyone can lookup codes for joining"
ON public.tutor_invite_codes FOR SELECT
USING (true);

-- Create join requests table for pending approvals
CREATE TABLE public.join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('tutor', 'school')),
    target_id UUID NOT NULL, -- tutor_user_id or school_id
    invite_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    student_email TEXT,
    student_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_user_id, target_type, target_id)
);

-- Enable RLS
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own requests
CREATE POLICY "Students can view own requests"
ON public.join_requests FOR SELECT
USING (auth.uid() = student_user_id);

-- Students can create requests
CREATE POLICY "Students can create requests"
ON public.join_requests FOR INSERT
WITH CHECK (auth.uid() = student_user_id);

-- Tutors can view requests targeting them
CREATE POLICY "Tutors can view requests for them"
ON public.join_requests FOR SELECT
USING (target_type = 'tutor' AND auth.uid() = target_id);

-- Tutors can update requests targeting them
CREATE POLICY "Tutors can update requests for them"
ON public.join_requests FOR UPDATE
USING (target_type = 'tutor' AND auth.uid() = target_id);

-- School admins can view school requests
CREATE POLICY "School admins can view school requests"
ON public.join_requests FOR SELECT
USING (
    target_type = 'school' AND 
    EXISTS (
        SELECT 1 FROM school_members 
        WHERE school_id = target_id 
        AND user_id = auth.uid() 
        AND role = 'school_admin'
    )
);

-- School admins can update school requests
CREATE POLICY "School admins can update school requests"
ON public.join_requests FOR UPDATE
USING (
    target_type = 'school' AND 
    EXISTS (
        SELECT 1 FROM school_members 
        WHERE school_id = target_id 
        AND user_id = auth.uid() 
        AND role = 'school_admin'
    )
);

-- Trigger to auto-create tutor invite code
CREATE OR REPLACE FUNCTION public.create_tutor_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'tutor' THEN
        INSERT INTO public.tutor_invite_codes (tutor_user_id)
        VALUES (NEW.user_id)
        ON CONFLICT (tutor_user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on user_roles
CREATE TRIGGER create_tutor_code_on_role
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.create_tutor_invite_code();

-- Trigger to update updated_at
CREATE TRIGGER update_join_requests_updated_at
BEFORE UPDATE ON public.join_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();