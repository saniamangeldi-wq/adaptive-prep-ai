-- Add new columns to schools table for variable pricing
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS ai_tier INTEGER NOT NULL DEFAULT 1 CHECK (ai_tier IN (1, 2, 3)),
ADD COLUMN IF NOT EXISTS student_count INTEGER NOT NULL DEFAULT 25,
ADD COLUMN IF NOT EXISTS teacher_count INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS monthly_cost INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN ai_tier = 1 THEN (CEIL(student_count::DECIMAL / 25) * 170) + (teacher_count * 30)
    WHEN ai_tier = 2 THEN (CEIL(student_count::DECIMAL / 25) * 200) + (teacher_count * 35)
    WHEN ai_tier = 3 THEN (CEIL(student_count::DECIMAL / 25) * 300) + (teacher_count * 40)
    ELSE 0
  END
) STORED;