CREATE TABLE public.question_validation_state (
  question_id text PRIMARY KEY,
  test_id uuid REFERENCES public.sat_tests(id) ON DELETE CASCADE,
  visual_requirement text NOT NULL DEFAULT 'none'
    CHECK (visual_requirement IN ('none','optional','required')),
  delivery_status text NOT NULL DEFAULT 'deliverable'
    CHECK (delivery_status IN ('deliverable','degraded','quarantined','needs_review')),
  media_type text,
  fallback_used text,
  failure_reasons text[] NOT NULL DEFAULT '{}',
  asset_checksum text,
  domain text,
  skill text,
  difficulty text,
  validated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.question_validation_state TO anon, authenticated;
GRANT ALL ON public.question_validation_state TO service_role;
ALTER TABLE public.question_validation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read validation state"
  ON public.question_validation_state FOR SELECT USING (true);
CREATE POLICY "Admins manage validation state"
  ON public.question_validation_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'school_admin'))
  WITH CHECK (public.has_role(auth.uid(),'school_admin'));

CREATE TRIGGER trg_qvs_updated_at BEFORE UPDATE ON public.question_validation_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_qvs_delivery_status ON public.question_validation_state(delivery_status);
CREATE INDEX idx_qvs_visual_requirement ON public.question_validation_state(visual_requirement);
CREATE INDEX idx_qvs_domain_skill_difficulty ON public.question_validation_state(domain, skill, difficulty);

CREATE TABLE public.visual_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL,
  practice_set_id text,
  event_type text NOT NULL,
  visual_requirement text,
  media_type text,
  visual_status text,
  fallback_used text,
  failure_reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.visual_health_events TO anon, authenticated;
GRANT ALL ON public.visual_health_events TO service_role;
ALTER TABLE public.visual_health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a visual health event"
  ON public.visual_health_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read visual health events"
  ON public.visual_health_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'school_admin'));

CREATE INDEX idx_vhe_question_created ON public.visual_health_events(question_id, created_at DESC);
CREATE INDEX idx_vhe_created_at ON public.visual_health_events(created_at DESC);