-- Add section and module structure columns to sat_tests
ALTER TABLE sat_tests
ADD COLUMN IF NOT EXISTS section text CHECK (section IN ('reading_writing', 'math')),
ADD COLUMN IF NOT EXISTS module_number integer CHECK (module_number IN (1, 2)),
ADD COLUMN IF NOT EXISTS time_limit_seconds integer,
ADD COLUMN IF NOT EXISTS directions text;

-- Create test_modules table for structured module management
CREATE TABLE public.test_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES sat_tests(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('reading_writing', 'math')),
  module_number integer NOT NULL CHECK (module_number IN (1, 2)),
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit_seconds integer NOT NULL,
  directions text,
  total_questions integer NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(test_id, section, module_number)
);

-- Enable RLS
ALTER TABLE public.test_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_modules
CREATE POLICY "Anyone can view test modules for official tests"
ON public.test_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sat_tests
    WHERE sat_tests.id = test_modules.test_id
    AND sat_tests.is_official = true
  )
);

CREATE POLICY "Users can view their own test modules"
ON public.test_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sat_tests
    WHERE sat_tests.id = test_modules.test_id
    AND sat_tests.created_by = auth.uid()
  )
);

-- Create module_attempts table to track progress through each module
CREATE TABLE public.module_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_attempt_id uuid REFERENCES test_attempts(id) ON DELETE CASCADE,
  module_id uuid REFERENCES test_modules(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('reading_writing', 'math')),
  module_number integer NOT NULL CHECK (module_number IN (1, 2)),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  flagged_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer,
  correct_answers integer,
  total_questions integer,
  time_spent_seconds integer,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_attempts
CREATE POLICY "Users can view their own module attempts"
ON public.module_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM test_attempts
    WHERE test_attempts.id = module_attempts.test_attempt_id
    AND test_attempts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own module attempts"
ON public.module_attempts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM test_attempts
    WHERE test_attempts.id = module_attempts.test_attempt_id
    AND test_attempts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own module attempts"
ON public.module_attempts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM test_attempts
    WHERE test_attempts.id = module_attempts.test_attempt_id
    AND test_attempts.user_id = auth.uid()
  )
);

-- Add updated_at trigger for test_modules
CREATE TRIGGER update_test_modules_updated_at
BEFORE UPDATE ON public.test_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();