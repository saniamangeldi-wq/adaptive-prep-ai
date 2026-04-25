
CREATE TABLE IF NOT EXISTS public.verbal_lesson_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.verbal_lessons(id) ON DELETE CASCADE,
  section_index integer NOT NULL,
  text_hash text NOT NULL,
  voice_id text NOT NULL DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  audio_url text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, section_index, voice_id)
);

CREATE INDEX IF NOT EXISTS idx_verbal_lesson_audio_lookup
  ON public.verbal_lesson_audio (lesson_id, section_index);

ALTER TABLE public.verbal_lesson_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cached audio"
  ON public.verbal_lesson_audio FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage cached audio"
  ON public.verbal_lesson_audio FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
