CREATE TABLE public.sat_source_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'sat-source-files',
  storage_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  checksum_sha256 text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  processing_status text NOT NULL DEFAULT 'pending',
  processing_error text,
  question_count int NOT NULL DEFAULT 0,
  figure_count int NOT NULL DEFAULT 0,
  latest_test_id uuid REFERENCES public.sat_tests(id) ON DELETE SET NULL,
  current_version int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_source_pdfs TO authenticated;
GRANT ALL ON public.sat_source_pdfs TO service_role;
ALTER TABLE public.sat_source_pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage source pdfs" ON public.sat_source_pdfs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'school_admin'));

CREATE TABLE public.sat_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pdf_id uuid NOT NULL REFERENCES public.sat_source_pdfs(id) ON DELETE CASCADE,
  version int NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  stage text,
  progress int NOT NULL DEFAULT 0,
  error text,
  questions_created int NOT NULL DEFAULT 0,
  figures_created int NOT NULL DEFAULT 0,
  test_id uuid REFERENCES public.sat_tests(id) ON DELETE SET NULL,
  started_by uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_pdf_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_processing_jobs TO authenticated;
GRANT ALL ON public.sat_processing_jobs TO service_role;
ALTER TABLE public.sat_processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage processing jobs" ON public.sat_processing_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'school_admin'));

CREATE TABLE public.sat_figures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pdf_id uuid NOT NULL REFERENCES public.sat_source_pdfs(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.sat_processing_jobs(id) ON DELETE SET NULL,
  test_id uuid REFERENCES public.sat_tests(id) ON DELETE SET NULL,
  question_id text,
  storage_bucket text NOT NULL DEFAULT 'sat-source-files',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  page_number int,
  bbox jsonb,
  width int,
  height int,
  checksum_sha256 text NOT NULL,
  alt_text text,
  text_equivalent text,
  extraction_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_pdf_id, checksum_sha256)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sat_figures TO authenticated;
GRANT ALL ON public.sat_figures TO service_role;
ALTER TABLE public.sat_figures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sat figures" ON public.sat_figures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'school_admin'));

CREATE INDEX idx_sat_figures_source ON public.sat_figures(source_pdf_id);
CREATE INDEX idx_sat_figures_question ON public.sat_figures(question_id);
CREATE INDEX idx_sat_jobs_source ON public.sat_processing_jobs(source_pdf_id);

CREATE TRIGGER update_sat_source_pdfs_updated_at BEFORE UPDATE ON public.sat_source_pdfs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sat_processing_jobs_updated_at BEFORE UPDATE ON public.sat_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sat_figures_updated_at BEFORE UPDATE ON public.sat_figures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins read sat source files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sat-source-files' AND public.has_role(auth.uid(), 'school_admin'));
CREATE POLICY "Admins upload sat source files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sat-source-files' AND public.has_role(auth.uid(), 'school_admin'));
CREATE POLICY "Admins update sat source files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sat-source-files' AND public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (bucket_id = 'sat-source-files' AND public.has_role(auth.uid(), 'school_admin'));
CREATE POLICY "Admins delete sat source files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'sat-source-files' AND public.has_role(auth.uid(), 'school_admin'));