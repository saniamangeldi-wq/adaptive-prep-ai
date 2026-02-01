-- Create enums for roles and tiers
CREATE TYPE public.user_role AS ENUM ('student', 'tutor', 'teacher', 'school_admin');
CREATE TYPE public.pricing_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
CREATE TYPE public.learning_style AS ENUM ('visual', 'auditory', 'reading_writing', 'kinesthetic');
CREATE TYPE public.test_difficulty AS ENUM ('easy', 'normal', 'hard');
CREATE TYPE public.test_length AS ENUM ('quick', 'short', 'medium', 'long', 'full');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'student',
    tier pricing_tier NOT NULL DEFAULT 'tier_1',
    learning_style learning_style,
    credits_remaining INTEGER NOT NULL DEFAULT 50,
    credits_reset_at TIMESTAMP WITH TIME ZONE,
    tests_remaining INTEGER NOT NULL DEFAULT 2,
    tests_reset_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profile for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Schools table
CREATE TABLE public.schools (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
    tier pricing_tier NOT NULL DEFAULT 'tier_1',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- School members (links users to schools)
CREATE TABLE public.school_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(school_id, user_id)
);

-- Tutor-student relationships
CREATE TABLE public.tutor_students (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tutor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tutor_id, student_id)
);

-- Teacher-student relationships
CREATE TABLE public.teacher_students (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(teacher_id, student_id)
);

-- SAT Tests (templates)
CREATE TABLE public.sat_tests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    test_type TEXT NOT NULL CHECK (test_type IN ('math', 'reading_writing', 'combined')),
    difficulty test_difficulty NOT NULL DEFAULT 'normal',
    length test_length NOT NULL DEFAULT 'medium',
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    time_limit_minutes INTEGER,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test attempts (student submissions)
CREATE TABLE public.test_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.sat_tests(id) ON DELETE CASCADE NOT NULL,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INTEGER,
    total_questions INTEGER,
    correct_answers INTEGER,
    time_spent_seconds INTEGER,
    feedback JSONB,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Flashcard decks
CREATE TABLE public.flashcard_decks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cards JSONB NOT NULL DEFAULT '[]'::jsonb,
    source TEXT CHECK (source IN ('manual', 'ai_generated', 'uploaded')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI conversations
CREATE TABLE public.ai_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    credits_used INTEGER NOT NULL DEFAULT 0,
    context_type TEXT CHECK (context_type IN ('general', 'test_help', 'study_plan', 'concept_explanation')),
    related_test_id UUID REFERENCES public.sat_tests(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Learning style quiz responses
CREATE TABLE public.learning_style_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    calculated_style learning_style,
    confidence_scores JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_style_responses ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to check if user is student's tutor
CREATE OR REPLACE FUNCTION public.is_tutor_of_student(_tutor_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tutor_students
    WHERE tutor_id = _tutor_id AND student_id = _student_id
  )
$$;

-- Helper function to check if user is student's teacher
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(_teacher_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_students
    WHERE teacher_id = _teacher_id AND student_id = _student_id
  )
$$;

-- Helper function to check if users are in same school
CREATE OR REPLACE FUNCTION public.is_same_school(_user1_id UUID, _user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members sm1
    JOIN public.school_members sm2 ON sm1.school_id = sm2.school_id
    WHERE sm1.user_id = _user1_id AND sm2.user_id = _user2_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors can view their students profiles"
ON public.profiles FOR SELECT
USING (public.is_tutor_of_student(auth.uid(), user_id));

CREATE POLICY "Teachers can view their students profiles"
ON public.profiles FOR SELECT
USING (public.is_teacher_of_student(auth.uid(), user_id));

-- User roles policies (admin only via functions)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Schools policies
CREATE POLICY "School members can view their school"
ON public.schools FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "School admins can update their school"
ON public.schools FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_id = id AND user_id = auth.uid() AND role = 'school_admin'
  )
);

CREATE POLICY "Authenticated users can create schools"
ON public.schools FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- School members policies
CREATE POLICY "Users can view school members of their school"
ON public.school_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = school_members.school_id AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "School admins can manage school members"
ON public.school_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = school_members.school_id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'school_admin'
  )
);

-- Tutor students policies
CREATE POLICY "Tutors can view their student relationships"
ON public.tutor_students FOR SELECT
USING (auth.uid() = tutor_id OR auth.uid() = student_id);

CREATE POLICY "Tutors can manage their students"
ON public.tutor_students FOR ALL
USING (auth.uid() = tutor_id);

-- Teacher students policies
CREATE POLICY "Teachers can view their student relationships"
ON public.teacher_students FOR SELECT
USING (auth.uid() = teacher_id OR auth.uid() = student_id);

CREATE POLICY "Teachers can manage their students"
ON public.teacher_students FOR ALL
USING (auth.uid() = teacher_id);

-- SAT tests policies
CREATE POLICY "Anyone can view official tests"
ON public.sat_tests FOR SELECT
USING (is_official = TRUE);

CREATE POLICY "Users can view tests they created"
ON public.sat_tests FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create tests"
ON public.sat_tests FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their tests"
ON public.sat_tests FOR UPDATE
USING (auth.uid() = created_by);

-- Test attempts policies
CREATE POLICY "Users can view their own attempts"
ON public.test_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts"
ON public.test_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts"
ON public.test_attempts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Tutors can view their students attempts"
ON public.test_attempts FOR SELECT
USING (public.is_tutor_of_student(auth.uid(), user_id));

CREATE POLICY "Teachers can view their students attempts"
ON public.test_attempts FOR SELECT
USING (public.is_teacher_of_student(auth.uid(), user_id));

-- Flashcard decks policies
CREATE POLICY "Users can view their own decks"
ON public.flashcard_decks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public decks"
ON public.flashcard_decks FOR SELECT
USING (is_public = TRUE);

CREATE POLICY "Users can manage their own decks"
ON public.flashcard_decks FOR ALL
USING (auth.uid() = user_id);

-- AI conversations policies
CREATE POLICY "Users can view their own conversations"
ON public.ai_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own conversations"
ON public.ai_conversations FOR ALL
USING (auth.uid() = user_id);

-- Learning style responses policies
CREATE POLICY "Users can view their own responses"
ON public.learning_style_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own responses"
ON public.learning_style_responses FOR ALL
USING (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sat_tests_updated_at
  BEFORE UPDATE ON public.sat_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flashcard_decks_updated_at
  BEFORE UPDATE ON public.flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();