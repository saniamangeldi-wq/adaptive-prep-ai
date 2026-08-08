# Persistent SAT PDF + visual asset storage

Goal: every uploaded SAT PDF and every extracted figure is stored permanently, linked to the questions that need it, verifiable, and reprocessable — without touching question wording, answers, scoring, or adaptive logic.

## 1. Storage bucket and RLS plan

New private bucket: `sat-source-files` (existing `question-figures` stays for manual attachments).

Paths:

```text
tests/{source_pdf_id}/source/{original_filename}.pdf
tests/{source_pdf_id}/figures/{figure_id}.{ext}
```

Access rules on `storage.objects` for that bucket:
- Admins (`school_admin` role) can read, upload, update, delete anything in the bucket.
- Students never read directly from the bucket. Figures reach them only through short-lived signed URLs minted server-side by an edge function that first checks the figure is attached to a question the student is allowed to see.
- Bucket stays private; no public URLs; no service-role key in frontend code.

## 2. Database migration (proposed)

Three new tables in `public`, each with GRANTs, RLS enabled, and admin-only policies.

```sql
-- 1. Archived source PDFs
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
  processing_status text NOT NULL DEFAULT 'pending',   -- pending|processing|succeeded|failed
  processing_error text,
  question_count int NOT NULL DEFAULT 0,
  figure_count int NOT NULL DEFAULT 0,
  latest_test_id uuid REFERENCES public.sat_tests(id) ON DELETE SET NULL,
  current_version int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Processing jobs (one row per attempt / version)
CREATE TABLE public.sat_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pdf_id uuid NOT NULL REFERENCES public.sat_source_pdfs(id) ON DELETE CASCADE,
  version int NOT NULL,
  status text NOT NULL DEFAULT 'queued',   -- queued|running|succeeded|failed
  stage text,                              -- upload|extract|figures|verify|publish
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

-- 3. Extracted figures
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
  extraction_status text NOT NULL DEFAULT 'pending', -- pending|uploaded|verified|failed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_pdf_id, checksum_sha256)
);
```

Plus: `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated`, `GRANT ALL ... TO service_role`, RLS enabled, policies gated on `public.has_role(auth.uid(), 'school_admin')`, and `update_updated_at_column` triggers. Students get no direct select on these tables.

Questions in `sat_tests.questions` gain a stable `figure_id` field (plus the existing `figure`/`table` structures) so a question points at a durable asset record instead of a temporary URL.

## 3. Affected files

- `supabase/migrations/<new>.sql` — tables, grants, RLS, storage policies.
- `supabase/functions/process-sat-pdf/index.ts` — accept an already-archived PDF, create/advance a job, extract, upload figures, verify, then publish questions.
- `supabase/functions/reprocess-sat-pdf/index.ts` (new) — reprocess an archived PDF as a new version.
- `supabase/functions/sign-question-figure/index.ts` (new) — mint short-lived signed URLs for figures a user is allowed to see.
- `src/pages/admin/UploadTests.tsx` — upload flow now archives the PDF first, then triggers processing.
- `src/pages/admin/PdfArchive.tsx` (new) + route in `src/App.tsx` — archive list, download, view assets, reprocess, progress.
- `src/lib/sat-content.ts`, `src/lib/visual-status.ts`, `src/components/test/VisualRenderer.tsx` — resolve `figure_id` to a verified signed URL; keep the existing fallback chain; never report "ok" unless something actually renders.
- `src/lib/__tests__/sat-source-pdfs.test.ts` (new) — unit tests for checksum/idempotency/quarantine logic.

## 4. Processing flow changes

```text
Admin picks PDF
  -> validate type (application/pdf) and size (<= 25 MB)
  -> SHA-256 in browser; if checksum already archived, reuse that record (no duplicate)
  -> upload PDF to sat-source-files/tests/{id}/source/{name}.pdf
  -> insert sat_source_pdfs row (status = pending)
  -> invoke process-sat-pdf { source_pdf_id }
        job row created (version = n+1, status = running)
        download PDF from Storage (never re-sent from browser)
        extract text + questions
        extract figures -> upload to tests/{id}/figures/{figure_id}.ext
        verify each object exists and checksum matches -> extraction_status = verified
        questions link figure_id; unverified required visuals -> quarantined
        publish test row, update counts, job = succeeded
  -> failure at any stage: PDF preserved, job.status = failed with error, source row keeps
     its last valid version; retry available from the archive page
```

Delivery-time verification: `VisualRenderer` keeps its probe chain (asset -> structured table -> text equivalent -> block). The asset step now resolves a fresh signed URL through the new edge function, so expired URLs no longer break rendering.

## 5. Tests

Vitest coverage for: source record created on upload, figures linked to questions, failed extraction preserves PDF + error, reprocess is duplicate-free (checksum + deterministic path), missing figure quarantines the question, verified figure yields a signed URL, and student-role access to admin-only records is denied.

## 6. Known limitation to confirm

The Deno edge runtime has no PDF rasteriser, so true raster-image extraction from arbitrary PDFs is not possible there. This plan delivers the full persistence, linkage, verification, archive, and reprocess machinery, and wires figure extraction to what the pipeline can produce (model-generated SVG/structured data) plus the existing manual attach flow — every one of which is now stored durably in `sat-source-files` and linked by `figure_id`. Full automatic raster extraction would need an external worker; I can add that as a follow-up if you want it before Aug 13.
