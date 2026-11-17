DROP POLICY IF EXISTS "Anyone can read suggestions" ON public.ai_suggestions;
CREATE POLICY "Signed-in users can read suggestions" ON public.ai_suggestions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read validation state" ON public.question_validation_state;
CREATE POLICY "Signed-in users can read validation state" ON public.question_validation_state FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can log a visual health event" ON public.visual_health_events;
CREATE POLICY "Signed-in users can log visual health events" ON public.visual_health_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND length(coalesce(event_type,'')) BETWEEN 1 AND 64);