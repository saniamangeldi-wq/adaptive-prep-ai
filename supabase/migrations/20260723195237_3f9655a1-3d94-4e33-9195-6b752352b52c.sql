-- Per-user spaced-repetition state for flashcards (SM-2 style).
-- One row per (user, deck, card_index). Keeps the existing flashcard_reviews
-- history table intact; this table stores the *current* scheduling state.
CREATE TABLE public.flashcard_card_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deck_id uuid NOT NULL,
  card_index int NOT NULL,
  ease numeric(4,2) NOT NULL DEFAULT 2.50,          -- SM-2 ease factor (>= 1.30)
  interval_days int NOT NULL DEFAULT 0,             -- current interval in days
  repetitions int NOT NULL DEFAULT 0,               -- successful reviews in a row
  next_review_at timestamptz NOT NULL DEFAULT now(),-- due date
  last_reviewed_at timestamptz,
  last_quality smallint,                            -- 0..5 last rating
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deck_id, card_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_card_state TO authenticated;
GRANT ALL ON public.flashcard_card_state TO service_role;

ALTER TABLE public.flashcard_card_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own card state"
  ON public.flashcard_card_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_flashcard_card_state_due
  ON public.flashcard_card_state (user_id, next_review_at);

CREATE TRIGGER trg_flashcard_card_state_updated_at
  BEFORE UPDATE ON public.flashcard_card_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();