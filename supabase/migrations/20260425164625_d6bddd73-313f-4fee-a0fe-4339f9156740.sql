
-- Topics: the ordered list of SAT Verbal subject areas
CREATE TABLE public.verbal_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  target_skill TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 15,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verbal_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published verbal topics"
ON public.verbal_topics FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Service role can manage verbal topics"
ON public.verbal_topics FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_verbal_topics_order ON public.verbal_topics(order_index);

-- Lessons: pre-recorded VAK variants per topic
CREATE TABLE public.verbal_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.verbal_topics(id) ON DELETE CASCADE,
  learning_style TEXT NOT NULL CHECK (learning_style IN ('visual','auditory','kinesthetic','reading_writing')),
  title TEXT NOT NULL,
  hook TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  checkpoint_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  estimated_minutes INTEGER DEFAULT 15,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (topic_id, learning_style)
);

ALTER TABLE public.verbal_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published verbal lessons"
ON public.verbal_lessons FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Service role can manage verbal lessons"
ON public.verbal_lessons FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_verbal_lessons_topic ON public.verbal_lessons(topic_id);

-- Per-user progress
CREATE TABLE public.verbal_topic_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.verbal_topics(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unlocked' CHECK (status IN ('locked','unlocked','in_progress','completed')),
  best_checkpoint_score INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

ALTER TABLE public.verbal_topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verbal progress"
ON public.verbal_topic_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verbal progress"
ON public.verbal_topic_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verbal progress"
ON public.verbal_topic_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view school student verbal progress"
ON public.verbal_topic_progress FOR SELECT
TO authenticated
USING (is_same_school(auth.uid(), user_id));

CREATE INDEX idx_verbal_progress_user ON public.verbal_topic_progress(user_id);

-- Updated_at triggers
CREATE TRIGGER update_verbal_topics_updated_at
BEFORE UPDATE ON public.verbal_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_verbal_lessons_updated_at
BEFORE UPDATE ON public.verbal_lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_verbal_progress_updated_at
BEFORE UPDATE ON public.verbal_topic_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 25 SAT Verbal topics (Reading & Writing section, Digital SAT)
INSERT INTO public.verbal_topics (slug, title, category, description, target_skill, order_index) VALUES
-- Craft & Structure (Reading)
('words-in-context', 'Words in Context', 'Craft & Structure', 'Determine the precise meaning of a word from context clues, including secondary and uncommon definitions of common words.', 'Vocabulary in context', 1),
('text-structure-purpose', 'Text Structure & Purpose', 'Craft & Structure', 'Identify the overall structure of a passage and the author''s rhetorical purpose for writing it.', 'Rhetorical analysis', 2),
('cross-text-connections', 'Cross-Text Connections', 'Craft & Structure', 'Compare and contrast viewpoints between two related passages.', 'Synthesis across texts', 3),

-- Information & Ideas (Reading)
('central-ideas-details', 'Central Ideas & Details', 'Information & Ideas', 'Identify the main idea and key supporting details of a short passage.', 'Main idea and supporting evidence', 4),
('command-of-evidence-textual', 'Command of Evidence: Textual', 'Information & Ideas', 'Select the quotation from a text that best supports a given claim.', 'Quote-based evidence selection', 5),
('command-of-evidence-quantitative', 'Command of Evidence: Quantitative', 'Information & Ideas', 'Use data from charts, tables, and graphs to support or complete a claim in a passage.', 'Data-based evidence selection', 6),
('inferences', 'Inferences', 'Information & Ideas', 'Draw a logical conclusion that completes a passage based on stated information.', 'Logical inference', 7),

-- Standard English Conventions (Writing)
('subject-verb-agreement', 'Subject-Verb Agreement', 'Standard English Conventions', 'Match singular subjects to singular verbs and plural to plural, including tricky cases like collective nouns and intervening phrases.', 'Form, structure, and sense', 8),
('pronoun-agreement-clarity', 'Pronoun Agreement & Clarity', 'Standard English Conventions', 'Use pronouns that agree with their antecedents in number and clearly refer to a single noun.', 'Form, structure, and sense', 9),
('verb-tense-mood', 'Verb Tense, Mood & Voice', 'Standard English Conventions', 'Choose verb forms that match the time, attitude, and active/passive voice the sentence requires.', 'Form, structure, and sense', 10),
('parallel-structure', 'Parallel Structure', 'Standard English Conventions', 'Make items in a list, comparison, or paired construction grammatically parallel.', 'Form, structure, and sense', 11),
('modifier-placement', 'Modifier Placement', 'Standard English Conventions', 'Place modifying phrases next to the noun they describe to avoid dangling and misplaced modifiers.', 'Form, structure, and sense', 12),
('sentence-boundaries', 'Sentence Boundaries', 'Standard English Conventions', 'Avoid run-ons, comma splices, and fragments by using correct end punctuation, semicolons, and conjunctions.', 'Boundaries', 13),
('commas-with-clauses', 'Commas with Clauses', 'Standard English Conventions', 'Use commas correctly with introductory phrases, nonessential clauses, and coordinated independent clauses.', 'Boundaries', 14),
('colons-and-dashes', 'Colons & Dashes', 'Standard English Conventions', 'Use colons to introduce explanations and lists, and dashes for emphasis or interruption.', 'Boundaries', 15),
('apostrophes-and-possessives', 'Apostrophes & Possessives', 'Standard English Conventions', 'Form singular and plural possessives correctly and distinguish them from contractions and plural nouns.', 'Form, structure, and sense', 16),
('noun-and-verb-agreement-tricky', 'Tricky Agreement Cases', 'Standard English Conventions', 'Handle agreement with indefinite pronouns, compound subjects, and inverted sentences.', 'Form, structure, and sense', 17),

-- Expression of Ideas (Writing)
('transitions', 'Transitions', 'Expression of Ideas', 'Choose the transition word or phrase that best signals the logical relationship between two sentences.', 'Logical connectors', 18),
('rhetorical-synthesis', 'Rhetorical Synthesis', 'Expression of Ideas', 'Use a set of bullet-point notes to write a sentence that accomplishes a stated rhetorical goal.', 'Synthesis writing', 19),

-- High-yield extras and exam strategy
('vocabulary-tier-2', 'High-Frequency SAT Vocabulary', 'Craft & Structure', 'Master the 200 highest-frequency SAT vocabulary words at the 700+ band, focusing on academic and abstract terms.', 'Vocabulary breadth', 20),
('reading-pace-strategy', 'Reading Pace & Strategy', 'Test Strategy', 'Build a reliable per-question pace and decision framework for the 32-minute Reading & Writing modules.', 'Pacing and triage', 21),
('answer-elimination-traps', 'Answer Elimination & Trap Patterns', 'Test Strategy', 'Recognize the College Board''s six recurring trap-answer patterns and eliminate them confidently.', 'Process of elimination', 22),
('module-2-adaptive-strategy', 'Module 2 Adaptive Strategy', 'Test Strategy', 'Approach the harder Module 2 with the right mindset and timing after a strong Module 1.', 'Adaptive test strategy', 23),
('reading-poetry-and-literature', 'Poetry & Literary Passages', 'Craft & Structure', 'Decode poems, fiction, and 19th-century literary excerpts that appear in the hardest Module 2 questions.', 'Literary reading', 24),
('reading-paired-research', 'Paired Research Passages', 'Information & Ideas', 'Work efficiently through dual-passage research questions that contrast hypotheses, methods, or findings.', 'Comparative reading', 25);
