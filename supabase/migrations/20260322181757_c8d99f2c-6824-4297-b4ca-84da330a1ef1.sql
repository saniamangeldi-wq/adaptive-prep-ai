
CREATE TABLE public.voice_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  seconds_used integer NOT NULL DEFAULT 0,
  month_year text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_year)
);

ALTER TABLE public.voice_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice usage"
  ON public.voice_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own voice usage"
  ON public.voice_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice usage"
  ON public.voice_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Tutors can view their students voice usage"
  ON public.voice_usage FOR SELECT
  TO authenticated
  USING (is_tutor_of_student(auth.uid(), user_id));

CREATE POLICY "School admins can view school students voice usage"
  ON public.voice_usage FOR SELECT
  TO authenticated
  USING (is_same_school(auth.uid(), user_id));
