
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS coach_type TEXT NOT NULL DEFAULT 'student';

ALTER TABLE conversation_spaces ADD COLUMN IF NOT EXISTS coach_type TEXT NOT NULL DEFAULT 'student';

CREATE INDEX IF NOT EXISTS idx_ai_conversations_coach_type ON ai_conversations(user_id, coach_type);
CREATE INDEX IF NOT EXISTS idx_conversation_spaces_coach_type ON conversation_spaces(user_id, coach_type);
