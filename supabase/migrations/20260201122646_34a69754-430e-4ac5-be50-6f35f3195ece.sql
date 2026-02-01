-- Create student_portfolios table
CREATE TABLE public.student_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
    extracurricular_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
    essays TEXT,
    extracted_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id)
);

-- Create university_preferences table
CREATE TABLE public.university_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_countries TEXT[] DEFAULT '{}',
    social_life_preference TEXT,
    climate_preference TEXT,
    scholarship_need TEXT,
    budget_monthly INTEGER,
    can_work_part_time TEXT,
    needs_on_campus_housing TEXT,
    fields_of_interest TEXT[] DEFAULT '{}',
    university_size TEXT,
    teaching_style TEXT,
    research_importance TEXT,
    ranking_importance TEXT,
    language_of_instruction TEXT[] DEFAULT '{}',
    international_support TEXT,
    diversity_importance TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id)
);

-- Create university_database table
CREATE TABLE public.university_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    logo_url TEXT,
    acceptance_rate NUMERIC(5,2),
    avg_sat_score INTEGER,
    tuition_usd INTEGER,
    living_cost_monthly INTEGER,
    scholarship_types JSONB DEFAULT '[]'::jsonb,
    student_population INTEGER,
    programs TEXT[] DEFAULT '{}',
    location_type TEXT,
    climate TEXT,
    language_of_instruction TEXT[] DEFAULT '{}',
    ranking_global INTEGER,
    website TEXT,
    application_deadline DATE,
    description TEXT,
    admission_requirements JSONB,
    career_outcomes JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_university_matches table
CREATE TABLE public.student_university_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.university_database(id) ON DELETE CASCADE,
    match_score NUMERIC(5,2) NOT NULL,
    match_reason TEXT,
    financial_estimate JSONB,
    saved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, university_id)
);

-- Enable RLS on all tables
ALTER TABLE public.student_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_university_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_portfolios
CREATE POLICY "Students can manage their own portfolio"
ON public.student_portfolios FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students portfolios"
ON public.student_portfolios FOR SELECT
USING (is_teacher_of_student(auth.uid(), student_id));

CREATE POLICY "School admins can view school students portfolios"
ON public.student_portfolios FOR SELECT
USING (is_same_school(auth.uid(), student_id));

-- RLS Policies for university_preferences
CREATE POLICY "Students can manage their own preferences"
ON public.university_preferences FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students preferences"
ON public.university_preferences FOR SELECT
USING (is_teacher_of_student(auth.uid(), student_id));

-- RLS Policies for university_database (public read for all authenticated users)
CREATE POLICY "Anyone can view universities"
ON public.university_database FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for student_university_matches
CREATE POLICY "Students can manage their own matches"
ON public.student_university_matches FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students matches"
ON public.student_university_matches FOR SELECT
USING (is_teacher_of_student(auth.uid(), student_id));

CREATE POLICY "School admins can view school students matches"
ON public.student_university_matches FOR SELECT
USING (is_same_school(auth.uid(), student_id));

-- Create storage bucket for portfolio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('portfolios', 'portfolios', false);

-- Storage policies for portfolio bucket
CREATE POLICY "Students can upload their own portfolio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view their own portfolio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can delete their own portfolio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view their students portfolio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolios' AND is_teacher_of_student(auth.uid(), (storage.foldername(name))[1]::uuid));

-- Create triggers for updated_at
CREATE TRIGGER update_student_portfolios_updated_at
BEFORE UPDATE ON public.student_portfolios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_university_preferences_updated_at
BEFORE UPDATE ON public.university_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_university_database_updated_at
BEFORE UPDATE ON public.university_database
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if student is registered through school
CREATE OR REPLACE FUNCTION public.is_school_student(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id 
    AND role = 'student'
    AND status = 'active'
  )
$$;