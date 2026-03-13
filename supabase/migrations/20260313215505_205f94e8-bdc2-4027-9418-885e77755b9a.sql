ALTER TABLE public.conversation_spaces 
ADD COLUMN IF NOT EXISTS "references" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_instructions text DEFAULT NULL;