-- Migration: Create SAT question generator tables
-- Created: 2026-08-06
-- Purpose: Support AI SAT question generator with pregenerated + live-generated modes + bug reporting

-- sat_questions table
CREATE TABLE IF NOT EXISTS sat_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version TEXT NOT NULL DEFAULT '1.0',
  section TEXT NOT NULL CHECK (section IN ('Math', 'Reading-Writing')),
  format TEXT NOT NULL CHECK (format IN ('multiple_choice')),
  domain TEXT NOT NULL,
  skill TEXT NOT NULL,
  difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  difficulty_method TEXT NOT NULL CHECK (difficulty_method IN ('editorial', 'model_estimate', 'empirical', 'hybrid')),
  difficulty_confidence REAL NOT NULL CHECK (difficulty_confidence BETWEEN 0 AND 1),
  context TEXT,
  stem TEXT NOT NULL,
  choices_json JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('pregenerated', 'generated')),
  generator_model TEXT,
  generator_provider TEXT,
  generated_at TIMESTAMPTZ,
  prompt_version TEXT,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('unvalidated', 'pending', 'passed', 'failed', 'quarantined', 'needs_human_review')),
  validation_json JSONB,
  copyright_status TEXT DEFAULT 'original' CHECK (copyright_status IN ('original', 'licensed', 'unknown')),
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active questions by section/domain
CREATE INDEX idx_sat_questions_active_section_domain ON sat_questions (active, section, domain);

-- Index for generated questions needing validation
CREATE INDEX idx_sat_questions_validation ON sat_questions (validation_status, source);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sat_questions_updated_at
  BEFORE UPDATE ON sat_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- sat_question_attempts table
CREATE TABLE IF NOT EXISTS sat_question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES sat_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN,
  response_time_ms INTEGER,
  served_mode TEXT NOT NULL CHECK (served_mode IN ('pregenerated', 'generated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user attempts
CREATE INDEX idx_sat_question_attempts_user ON sat_question_attempts (user_id);

-- Index for question attempts (for empirical difficulty calculation)
CREATE INDEX idx_sat_question_attempts_question ON sat_question_attempts (question_id);

-- sat_question_reports table
CREATE TABLE IF NOT EXISTS sat_question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES sat_questions(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES sat_question_attempts(id) ON DELETE SET NULL,
  report_reason TEXT NOT NULL CHECK (report_reason IN ('wrong_answer_key', 'unclear_wording', 'rendering_bug', 'duplicate', 'other')),
  report_details JSONB,
  question_snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for reports by question
CREATE INDEX idx_sat_question_reports_question ON sat_question_reports (question_id);

-- Index for recent reports (for triage dashboard)
CREATE INDEX idx_sat_question_reports_created ON sat_question_reports (created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE sat_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sat_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sat_question_reports ENABLE ROW LEVEL SECURITY;

-- sat_questions: Everyone can read active questions; only service role can insert/update
CREATE POLICY "Active questions are viewable by all" ON sat_questions
  FOR SELECT USING (active = true);

-- sat_question_attempts: Users can only see their own attempts
CREATE POLICY "Users can view own attempts" ON sat_question_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON sat_question_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- sat_question_reports: Users can only see their own reports
CREATE POLICY "Users can view own reports" ON sat_question_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sat_question_attempts
      WHERE sat_question_attempts.id = sat_question_reports.attempt_id
      AND sat_question_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports" ON sat_question_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sat_question_attempts
      WHERE sat_question_attempts.id = sat_question_reports.attempt_id
      AND sat_question_attempts.user_id = auth.uid()
    )
  );

-- Service role policies (for edge functions)
-- These are applied to the service role automatically via RLS bypass