-- Add baseline-completed flag on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cognitive_baseline_completed boolean NOT NULL DEFAULT false;

-- Cognitive profile per user
CREATE TABLE public.cognitive_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  processing_speed integer NOT NULL DEFAULT 50,
  working_memory integer NOT NULL DEFAULT 50,
  reasoning_style integer NOT NULL DEFAULT 50,
  attention_stamina integer NOT NULL DEFAULT 50,
  baseline_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_count integer NOT NULL DEFAULT 0,
  confidence integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cognitive_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cognitive profile"
ON public.cognitive_profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors view linked student cognitive profile"
ON public.cognitive_profiles
FOR SELECT
USING (public.is_tutor_of_student(auth.uid(), user_id));

CREATE POLICY "Teachers view linked student cognitive profile"
ON public.cognitive_profiles
FOR SELECT
USING (public.is_teacher_of_student(auth.uid(), user_id));

-- Append-only event log for passive inference
CREATE TABLE public.cognitive_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  subject text,
  difficulty text,
  response_time_ms integer,
  was_correct boolean,
  used_hint boolean DEFAULT false,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cognitive_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own cognitive events"
ON public.cognitive_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own cognitive events"
ON public.cognitive_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX idx_cognitive_events_user_created
ON public.cognitive_events(user_id, created_at DESC);

CREATE TRIGGER update_cognitive_profiles_updated_at
BEFORE UPDATE ON public.cognitive_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();