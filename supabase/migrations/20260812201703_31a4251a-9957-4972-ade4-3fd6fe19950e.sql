ALTER TABLE public.sat_figures ALTER COLUMN source_pdf_id DROP NOT NULL;

ALTER TABLE public.sat_figures
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'pdf_extraction';

ALTER TABLE public.sat_figures
  DROP CONSTRAINT IF EXISTS sat_figures_origin_check;
ALTER TABLE public.sat_figures
  ADD CONSTRAINT sat_figures_origin_check
  CHECK (origin IN ('pdf_extraction', 'inline_svg', 'reconstruction'));

-- Duplicate protection for figures that have no source PDF.
CREATE UNIQUE INDEX IF NOT EXISTS sat_figures_no_pdf_checksum_key
  ON public.sat_figures (checksum_sha256)
  WHERE source_pdf_id IS NULL;