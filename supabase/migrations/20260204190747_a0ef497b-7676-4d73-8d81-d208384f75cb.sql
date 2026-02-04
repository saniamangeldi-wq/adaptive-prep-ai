-- =============================================
-- AI SUGGESTIONS TABLE - Dynamic, varied prompts
-- =============================================

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  suggestion_text text NOT NULL,
  category text CHECK (category IN ('study_planning', 'concept_help', 'test_prep', 'homework', 'quick_tip')),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ai_suggestions_subject ON ai_suggestions(subject);

-- Enable RLS
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can read suggestions
CREATE POLICY "Anyone can read suggestions" ON ai_suggestions
FOR SELECT USING (true);

-- Insert diverse SAT suggestions
INSERT INTO ai_suggestions (subject, suggestion_text, category) VALUES
('SAT', 'Create a 2-week SAT study plan for me', 'study_planning'),
('SAT', 'Explain how to solve quadratic equations', 'concept_help'),
('SAT', 'What are the best strategies for reading comprehension?', 'test_prep'),
('SAT', 'Help me understand comma rules in grammar', 'concept_help'),
('SAT', 'How do I improve my SAT essay score?', 'test_prep'),
('SAT', 'Explain the difference between mean, median, and mode', 'concept_help'),
('SAT', 'What should I do the night before the SAT?', 'test_prep'),
('SAT', 'Help me understand linear functions', 'concept_help'),
('SAT', 'How can I manage my time during the SAT?', 'test_prep'),
('SAT', 'Explain the Pythagorean theorem with examples', 'concept_help'),
('SAT', 'What are the most common SAT vocabulary words?', 'test_prep'),
('SAT', 'Help me understand exponential growth', 'concept_help'),
('SAT', 'What are the key SAT math formulas I need?', 'test_prep'),
('SAT', 'How do I eliminate wrong answer choices?', 'test_prep'),
('SAT', 'Explain systems of equations step by step', 'concept_help');

-- Math suggestions
INSERT INTO ai_suggestions (subject, suggestion_text, category) VALUES
('Math', 'Help me solve this calculus problem', 'homework'),
('Math', 'Explain derivatives in simple terms', 'concept_help'),
('Math', 'What''s the quickest way to factor polynomials?', 'quick_tip'),
('Math', 'Help me understand trigonometry identities', 'concept_help'),
('Math', 'Explain the chain rule with examples', 'concept_help'),
('Math', 'How do I solve systems of equations?', 'homework'),
('Math', 'What is the quadratic formula and when to use it?', 'concept_help'),
('Math', 'Help me understand logarithms', 'concept_help'),
('Math', 'Explain probability concepts', 'concept_help'),
('Math', 'How do I graph linear equations?', 'homework');

-- English suggestions
INSERT INTO ai_suggestions (subject, suggestion_text, category) VALUES
('English', 'Help me brainstorm college essay ideas', 'homework'),
('English', 'Review my essay for grammar and clarity', 'homework'),
('English', 'Explain how to write a strong thesis statement', 'concept_help'),
('English', 'What makes a good introduction paragraph?', 'concept_help'),
('English', 'Help me improve my vocabulary', 'quick_tip'),
('English', 'How do I analyze a poem effectively?', 'concept_help'),
('English', 'Explain the difference between active and passive voice', 'concept_help'),
('English', 'Help me understand literary devices', 'concept_help'),
('English', 'How do I cite sources properly?', 'homework'),
('English', 'What are common grammar mistakes to avoid?', 'quick_tip');

-- Science suggestions
INSERT INTO ai_suggestions (subject, suggestion_text, category) VALUES
('Science', 'Explain photosynthesis in simple terms', 'concept_help'),
('Science', 'Help me understand chemical bonding', 'concept_help'),
('Science', 'What is Newton''s second law?', 'concept_help'),
('Science', 'Explain the cell cycle', 'concept_help'),
('Science', 'How do I balance chemical equations?', 'homework'),
('Science', 'What is the difference between mitosis and meiosis?', 'concept_help'),
('Science', 'Explain the laws of thermodynamics', 'concept_help'),
('Science', 'Help me understand genetics and heredity', 'concept_help');

-- History suggestions
INSERT INTO ai_suggestions (subject, suggestion_text, category) VALUES
('History', 'Explain the causes of World War I', 'concept_help'),
('History', 'Help me understand the American Revolution', 'concept_help'),
('History', 'What were the effects of the Industrial Revolution?', 'concept_help'),
('History', 'Explain the Cold War in simple terms', 'concept_help'),
('History', 'Help me analyze primary sources', 'homework'),
('History', 'What led to the Civil Rights Movement?', 'concept_help');

-- ACT suggestions
INSERT INTO ai_suggestions (subject, suggestion_text, category) VALUES
('ACT', 'What''s the difference between SAT and ACT?', 'test_prep'),
('ACT', 'Help me with ACT science reasoning', 'test_prep'),
('ACT', 'Create an ACT study schedule for me', 'study_planning'),
('ACT', 'What are the best ACT time management strategies?', 'test_prep'),
('ACT', 'Explain ACT English section strategies', 'test_prep');

-- General suggestions
INSERT INTO ai_suggestions (subject, suggestion_text, category) VALUES
('General', 'How can I study more effectively?', 'study_planning'),
('General', 'Help me create a study schedule', 'study_planning'),
('General', 'What are the best note-taking methods?', 'quick_tip'),
('General', 'How do I stay focused while studying?', 'quick_tip'),
('General', 'Explain how to prepare for finals', 'study_planning');

-- =============================================
-- CONVERSATION SPACES - Perplexity-style organization
-- =============================================

CREATE TABLE IF NOT EXISTS conversation_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT '📁',
  color text DEFAULT '#3b82f6',
  conversation_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_conversation_spaces_user ON conversation_spaces(user_id);

-- Enable RLS
ALTER TABLE conversation_spaces ENABLE ROW LEVEL SECURITY;

-- Users can only see their own spaces
CREATE POLICY "Users can view their own spaces" ON conversation_spaces
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spaces" ON conversation_spaces
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spaces" ON conversation_spaces
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spaces" ON conversation_spaces
FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- UPDATE AI_CONVERSATIONS - Add thread support
-- =============================================

ALTER TABLE ai_conversations 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES conversation_spaces(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_space ON ai_conversations(space_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_archived ON ai_conversations(user_id, is_archived);

-- =============================================
-- FLASHCARD TABLES - Fix persistence
-- =============================================

-- Update flashcard_decks to ensure proper structure
ALTER TABLE flashcard_decks
ADD COLUMN IF NOT EXISTS subject text DEFAULT 'General',
ADD COLUMN IF NOT EXISTS card_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_studied_at timestamp with time zone;

-- Create flashcard review tracking
CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id uuid REFERENCES flashcard_decks(id) ON DELETE CASCADE NOT NULL,
  card_index integer NOT NULL,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  reviewed_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_flashcard_reviews_user_deck ON flashcard_reviews(user_id, deck_id);

-- Enable RLS on flashcard_reviews
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reviews" ON flashcard_reviews
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reviews" ON flashcard_reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update deck card count
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE flashcard_decks
  SET card_count = (
    SELECT jsonb_array_length(cards)
    FROM flashcard_decks
    WHERE id = COALESCE(NEW.id, OLD.id)
  )
  WHERE id = COALESCE(NEW.id, OLD.id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update card count
DROP TRIGGER IF EXISTS update_card_count_trigger ON flashcard_decks;
CREATE TRIGGER update_card_count_trigger
AFTER INSERT OR UPDATE OF cards ON flashcard_decks
FOR EACH ROW
EXECUTE FUNCTION update_deck_card_count();