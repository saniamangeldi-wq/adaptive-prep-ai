# SAT Visual Validation & Quarantine

## Assumptions

- SAT questions are **not** rows in a table. They live as a JSONB array in `sat_tests.questions`. There is no `questions` table and no media table, so a "media record" is a JSON object on the question, not a row.
- Therefore the migration adds two **side tables keyed by the question's string id** (`opensat-rw-m-2-27` style) rather than altering a question table. Existing data is untouched.
- The existing per-question fields `figure`, `table`, `visual_unavailable` are preserved. New fields are additive.
- Validation runs in shared TypeScript so both the frontend selector and the edge functions use the same rules. No network reachability check at delivery time (that is done by the backfill/validation job and recorded in the audit table); the client only checks structural validity plus recorded quarantine state.

## Migration (proposed)

```sql
-- 1. Per-question validation state (question ids are strings inside sat_tests.questions)
CREATE TABLE public.question_validation_state (
  question_id text PRIMARY KEY,
  test_id uuid REFERENCES public.sat_tests(id) ON DELETE CASCADE,
  visual_requirement text NOT NULL DEFAULT 'none'
    CHECK (visual_requirement IN ('none','optional','required')),
  delivery_status text NOT NULL DEFAULT 'deliverable'
    CHECK (delivery_status IN ('deliverable','degraded','quarantined','needs_review')),
  media_type text,            -- 'image' | 'svg' | 'table' | 'text' | null
  fallback_used text,         -- 'structured' | 'text' | null
  failure_reasons text[] NOT NULL DEFAULT '{}',
  asset_checksum text,
  domain text, skill text, difficulty text,
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
CREATE INDEX idx_qvs_domain_skill_difficulty
  ON public.question_validation_state(domain, skill, difficulty);

-- 2. Audit trail of visual health events
CREATE TABLE public.visual_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL,
  practice_set_id text,
  event_type text NOT NULL,      -- 'validated' | 'fallback_rendered' | 'quarantined' | 'delivery_blocked'
  visual_requirement text,
  media_type text,
  visual_status text,            -- 'ok' | 'missing' | 'unreachable' | 'invalid'
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
```

## Affected files

| File | Change |
| --- | --- |
| `src/lib/sat-content.ts` | Add `deriveVisualRequirement()`, `validateQuestionMedia()`, `validateMathSerialization()`; keep `isQuestionDeliverable` as a thin wrapper over the new validator. |
| `src/lib/test-generator.ts` | Extend `Question` with `visual_requirement`, `media` (`{ media_type, src, data, alt, text_equivalent, checksum }`), `delivery_status`; filter out `quarantined` / `needs_review` at selection. |
| `src/lib/question-table.ts` | No behaviour change; recovered tables count as a valid structured fallback. |
| `src/components/test/QuestionMedia.tsx` | Log a `fallback_rendered` visual health event when the fallback box shows. |
| `src/lib/__tests__/sat-content.test.ts` | Add cases A–F. |
| `supabase/functions/restructure-sat-media/index.ts` | Write validation results into `question_validation_state` and emit events. |

## Validation rules

1. `visual_requirement = "required"` when the text matches an explicit reference: *in the graph above / in the table above / in the figure / as shown / the graph of / scatterplot / bar graph / diagram above / line s… labeled*.
2. Domain-only signals (PSDA, quantitative evidence) **never** force `required`; they set `delivery_status = 'needs_review'` when no visual is present.
3. `required` + no media, no table, no figure → **quarantine**.
4. `required` + invalid/unrenderable asset and no fallback → **quarantine**.
5. Structured fallback is valid only when `isValidTable()` passes (rectangular, ≥2 headers, ≥1 row) → **degraded**, deliverable.
6. Text equivalent is valid only when it is ≥120 chars and contains at least two numeric data points → **degraded**, deliverable.
7. Raw math serialization tokens (`Superscript`, `Baseline`, `Subscript`, `StartFraction` without terminator, unbalanced `$`/`\(`) surviving normalization → **quarantine**.
8. `optional` or `none` with no media → **deliverable**.

## Test cases

A required+null media → quarantined · B required+broken URL+valid table → degraded · C required+broken URL+no fallback → quarantined · D optional+no media → deliverable · E none → deliverable · F raw `Superscript`/`Baseline` → quarantined.

## Risks

- Quarantine shrinks the usable pool by roughly the 190 flagged questions until the media backfill runs; the generator already tops up from the remaining pool.
- Regex-derived `required` will have false positives on prose like "the graph of this equation is a line"; that phrase is already excluded and stays excluded.
- Checksums can only be computed for questions that actually carry an asset URL; today that is effectively zero, so the column will stay mostly null until real media is ingested.
