ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS title_source text NOT NULL DEFAULT 'automatic';

UPDATE public.ai_conversations
SET title_source = 'manual'
WHERE title IS NOT NULL
  AND title <> 'New Conversation'
  AND title_source = 'automatic';

ALTER TABLE public.ai_conversations
  DROP CONSTRAINT IF EXISTS ai_conversations_title_source_check;

ALTER TABLE public.ai_conversations
  ADD CONSTRAINT ai_conversations_title_source_check
  CHECK (title_source IN ('automatic', 'manual'));
