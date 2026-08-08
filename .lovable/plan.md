# Why no images appear in VisualRenderer

## How VisualRenderer works today

1. `buildVisualPlan(question)` collects every representation a question can offer:
   - `svg` — only if `question.figure.type === "svg"` and the string really contains `<svg>...</svg>`
   - `imageSrc` — only if `question.figure.type === "image"` (or legacy `image_url` / `media.src`) and the URL starts with `http(s):` or `data:image/`
   - `table` — explicit `question.table`, `media.data`, or a table recovered from flattened text by `resolveQuestionParts` in `src/lib/question-table.ts`
   - `textEquivalent` — `media.text_equivalent`
2. If there is an image URL, `useAssetProbe` actually loads it in an `Image()` before trusting it. While it is in flight the status is `checking` (spinner). A URL alone is never treated as proof.
3. `resolveVisualStatus` then picks a terminal state, in order: SVG -> verified image -> table (`degraded_re_render`, or `ok` when the table *is* the visual) -> text equivalent -> `broken_quarantined` (question blocked) or `not_required` (nothing rendered).
4. Only in the `ok` branches is an actual `<img>` / inline SVG painted. SVG goes through `sanitizeSvg` (DOMPurify) + `themeSvg` so it adapts to the dark theme; raster images get the `--figure-paper` surface.

So the image branch is reachable only when a question carries a valid image URL.

## The actual cause

There are no image assets in the question bank. Across all 1,768 stored questions:

- `figure` present: 1 (type `svg`)
- `figure.type = "image"`: 0
- `image_url`: 0
- `media.src`: 0
- `table`: 1

The renderer is behaving correctly — it has nothing to render. The upstream reason is `supabase/functions/process-sat-pdf/index.ts`: it is a **text-only** pipeline. It extracts text from the PDF and asks the model to emit a figure, but the model can only invent inline SVG (`sanitizeFigure` accepts `type: "image"` only when a real URL/data-URL is supplied, and nothing in the pipeline ever produces one). No page rasterization, no embedded-image extraction, no storage upload.

## What to do to start seeing images

### Track A — store real figure images (recommended)

1. Create a public storage bucket `question-figures`.
2. Add an admin figure-attachment UI on Upload Tests: pick a question id, upload a cropped PNG/JPG of the figure, plus alt text.
3. On upload, write `figure = { type: "image", src: <public url>, alt, caption }` into the question object inside `sat_tests.questions`, and refresh its row in `question_validation_state` so previously quarantined items become deliverable again.
4. VisualRenderer needs no changes — the probe will pass and the `ok` image branch renders.

### Track B — make ingestion emit figures automatically

1. In `process-sat-pdf`, extract embedded images from the PDF (XObject streams) or rasterize the page region, upload each to `question-figures`, and pass the resulting URLs to the model so it can bind a figure to the right question.
2. Keep the existing SVG path as fallback for charts the model can faithfully reconstruct.

### Track C — verification

- Query the bank again for `figure.type = 'image'` counts after the first uploads.
- Browser check on a test containing an attached figure: expect a rendered `<img>` and a "Visual OK" badge instead of the fallback/blocked card.

## Technical notes

- Files touched by Track A: new admin panel section in `src/pages/admin/UploadTests.tsx`, a storage bucket, and one migration-free JSONB update path.
- `isPotentiallyRenderableFigure` in `src/lib/sat-content.ts` is the gate — any src that is not `http(s):`/`data:image/` is rejected silently, so uploaded URLs must be public storage URLs.
- No changes are needed in `VisualRenderer.tsx` or `question-table.ts` for images to appear.
