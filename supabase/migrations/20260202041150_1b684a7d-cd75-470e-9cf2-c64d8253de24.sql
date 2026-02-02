-- Update the default tests_remaining to 200 for students (representing questions)
-- Also rename conceptually from "tests" to "questions" by increasing the default
ALTER TABLE public.profiles 
ALTER COLUMN tests_remaining SET DEFAULT 200;

-- Update existing student profiles to have 200 questions remaining
UPDATE public.profiles 
SET tests_remaining = 200 
WHERE role = 'student';