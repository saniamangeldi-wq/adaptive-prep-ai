# SAT PDF Visual Ingestion Design

Status: design only. No production behavior is changed by this document.

## Evidence

- **Confirmed — upload bytes:** `src/pages/admin/UploadTests.tsx:100-112` converts the
  selected PDF to base64 and sends only `fileName` and `fileBase64` to
  `process-sat-pdf`.
- **Confirmed — current extraction:** `supabase/functions/process-sat-pdf/index.ts:99-104`
  decodes the bytes, calls `extractPdfText`, then gives only returned text to `parseWithAI`.
  `index.ts:217-239` decodes the entire PDF as UTF-8 and applies stream/parenthesis regexes;
  it does not render pages or retain image pixels.
- **Confirmed — AI reconstruction request:**
  `supabase/functions/process-sat-pdf/index.ts:272-277,287-314` asks the model to emit a
  figure and prefers an inline SVG reconstruction. The prompt has no source-image input or
  source-asset reference contract.
- **Confirmed — persistence:** `supabase/functions/process-sat-pdf/index.ts:174-186`
  inserts parsed questions into `sat_tests.questions` JSONB. No SAT visual asset is stored.
  The base schema confirms `questions JSONB` at
  `supabase/migrations/20260201091520_5e2dfba8-d3e6-4ab4-b06c-c1b20c107ed3.sql:77-90`.
- **Confirmed — current visual model:** `src/lib/test-generator.ts:3-39` supports
  `figure.src`, inline `figure.svg`, and legacy `image_url`; it has no source PDF page/crop
  identity or storage path.
- **Confirmed — render path:** `src/components/test/QuestionMedia.tsx:19-24,67-93,106-125`
  resolves and renders a figure/table/stimulus. Both normal and SAT cards delegate to it at
  `src/components/test/QuestionCard.tsx:7,89` and
  `src/components/test/sat/SATQuestionCard.tsx:6,30`. Entry points are
  `src/pages/TakeTest.tsx:5,216-217`, `src/pages/TestResults.tsx:5,115-123`, and
  `src/components/test/sat/SATTestInterface.tsx:5,152-153`.
- **Confirmed — storage precedent:** existing private storage policies scope paths by the
  first folder segment (for example `supabase/migrations/20260205033317_2c0d7145-6a0e-42a5-9526-4297a625b224.sql:36-60`). No SAT asset bucket exists in the inspected migrations.
- **Reproduced — existing renderer baseline:**
  `node node_modules/vitest/vitest.mjs run src/components/test/__tests__/question-renderer-contract.test.tsx`
  returned `3 passed, 1 failed`. The failed assertion is at
  `src/components/test/__tests__/question-renderer-contract.test.tsx:36`; malformed image
  data renders an empty figure instead of a visible unavailable state. The three table/SVG
  renderer cases pass.

## Fixture proof of concept

Fixture: `C:/Users/User/AppData/Local/Temp/adaptive-prep-ai-pdf-poc/sat-visual-fixture.pdf`.
It contains selectable text, two vector graph paths, and one embedded 40x40 raster image.
The proof used PDF.js text/operator inspection, PDF.js page rendering with
`@napi-rs/canvas`, and bounded PNG crops. It did not use AI reconstruction.

**Reproduced — POC output:**

```json
{
  "pass": true,
  "textFound": true,
  "pathOperators": 2,
  "embeddedImageOperators": 1,
  "embeddedImagePixels": 4800,
  "page": { "w": 612, "h": 792, "bytes": 15929 },
  "boundedCrops": [
    { "w": 245, "h": 180, "bytes": 3929 },
    { "w": 170, "h": 175, "bytes": 968 }
  ],
  "extractedImage": { "w": 40, "h": 40, "bytes": 152 },
  "storedBytes": 20978
}
```

Visual inspection of the rendered page and crops showed the original graph lines and the
orange raster image. The raw-text approach exposed PDF drawing operators and binary noise,
not a reliable figure object; PDF.js exposed two path operators and one image operator but
did not provide chart semantics or a complete figure grouping.

## Approach comparison

| Approach | Fixture evidence | Decision |
|---|---|---|
| Embedded image extraction only | **Reproduced:** one raster image was recoverable, while the graph was represented by two vector path operators. It misses vector/text-as-path/composite visuals. | Reject as canonical representation. |
| Page render plus bounded crops | **Reproduced:** rendered page preserved both graph and raster pixels; bounded crops were independently decodable and size-bounded. Full page remains available if a crop boundary is wrong. | **Select.** |
| Structured PDF visual extraction | **Reproduced:** operator list exposed paths and an image, but no reliable graph/table/label semantics. It is format-dependent and cannot be the sole source of truth. | Use only as optional metadata, never as replacement pixels. |

## Selected design: rendered source page, optional bounded crop

**Hypothesis / proposed contract:** every imported visual is backed by source pixels. The
canonical asset is a rendered page; a crop is a derived convenience asset. AI may select an
asset and describe it, but may not create an SVG or image for an imported PDF visual.

```ts
interface QuestionVisualAsset {
  id: string;
  testId: string;
  questionId: string;
  page: number; // 1-based source page
  kind: "page" | "crop";
  storagePath: string;
  mimeType: "image/webp" | "image/png";
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  alt: string;
  caption?: string;
  crop?: { x: number; y: number; width: number; height: number; unit: "px" };
  sourceDpi: number;
}
```

Persist `storagePath`, page, crop, hash, dimensions, and accessibility text in a new
`question_media` relation keyed by `sat_tests.id` and stable question id. The question JSON
stores only the media id/reference. At read time, an authenticated server resolves a short
signed URL; `QuestionMedia` keeps its existing rendering role and maps the signed URL to the
existing `figure` image shape. Existing inline SVG and `image_url` data remain readable for
backward compatibility, but the new PDF importer never emits them.

### Storage and RLS

**Hypothesis / proposed:** create private bucket `sat-source-assets`.

```text
sat-source-assets/
  {test_id}/source/source.pdf
  {test_id}/pages/{page_number}.webp
  {test_id}/questions/{question_id}/{media_id}.webp
```

Only the service-role ingestion function inserts/deletes objects. No broad client `SELECT`
policy is granted on the bucket. A signed-URL function first checks that the caller may read
the referenced `sat_tests` row (`is_official = true` or `created_by = auth.uid()`), then signs
only the requested object. The path's first segment is always the `test_id`; object names are
generated UUIDs, never user-controlled filenames.

### Limits and validation

**Hypothesis / proposed limits:** reject request body/PDF over 25 MiB; at most 120 pages;
render at 150 DPI; at most 2,500,000 pixels per page; page WebP at most 2 MiB; crop WebP at
most 512 KiB; at most 8 visual assets per question. Reject invalid PDF magic, encrypted or
unreadable PDFs, invalid page dimensions, failed image decode, out-of-bounds crops, and hash
mismatches. These values must become named constants and focused tests before production use.

Validation pipeline:

1. Decode base64 with a hard byte limit; validate `%PDF-` before parsing.
2. Parse page count and text separately. Render every page to canonical WebP; retain source
   PDF bytes for provenance and reprocessing.
3. Detect candidate visual regions from PDF geometry/OCR/AI, but store the full rendered page
   regardless. Every crop must be a bounded rectangle inside its page.
4. Send text plus actual page/crop image inputs to the AI parser. Require structured output
   whose visual references resolve to stored media ids and hashes. Forbid `svg` generation and
   reject any visual reference without a source asset.
5. Insert `sat_tests`, media rows, and question references only after all validation succeeds.

### Malformed input and cleanup

**Hypothesis / proposed behavior:**

- `400` for missing/invalid request fields;
- `413` for byte/page/pixel/asset limits;
- `422` for malformed, encrypted, unreadable, or non-SAT PDFs and invalid AI output;
- `502` for upstream AI failure after bounded retries.

All failures delete the request prefix and leave no `sat_tests` row. Successful imports move
from `ingest/{request_id}/...` to the final `{test_id}/...` prefix only after database commit.
Retries use an idempotency key and clean/reuse the same request prefix. Test deletion must
cascade `question_media` rows and enqueue object deletion; a scheduled orphan sweep removes
unreferenced objects and expired ingest prefixes.

### Accessibility and renderer behavior

`alt` is required, non-empty, and describes only visible source content. Captions remain
optional. `QuestionMedia` must render an image with `alt`, preserve the existing table and
stimulus order, and render a visible “Source visual unavailable” state when a referenced asset
cannot be resolved; it must never render an empty bordered figure. This directly addresses the
reproduced baseline failure at the existing contract test.

### Migration, backfill, rollback

**Hypothesis / proposed migration:** add `question_media` and additive media-reference fields;
do not rewrite existing question JSON. Backfill only assets whose original source bytes or
verifiable URLs still exist. Existing inline SVG/image questions become `legacy_unverified`
metadata when no provenance is available; do not invent or rasterize unseen content. New
imports write `media_version = 2` and use the selected pipeline.

Rollout behind `sat_pdf_visual_ingestion_v2`. Disable new writes to roll back while retaining
read support for already-created media. Because the migration is additive and old questions
remain readable, rollback requires no destructive data rewrite. Delete new media only after a
separate, reviewed cleanup operation.

## Acceptance proof before production implementation

1. Fixture test proves original page render, embedded image pixels, and bounded crops decode;
   proves all stored hashes and dimensions; proves no AI-generated visual is accepted.
2. Integration test proves uploaded bytes, stored media rows, signed-URL payload, and
   `QuestionMedia`, `QuestionCard`, `SATQuestionCard`, Take Test, SAT interface, and review
   entry points show the same source visual.
3. Negative tests prove malformed PDF, missing visual reference, invalid crop, size limit,
   AI schema mismatch, storage failure, and cleanup behavior.
4. Focused renderer test is green, then relevant suite, then build. Existing unrelated
   failures remain separately reported; expectations are not changed to hide defects.
