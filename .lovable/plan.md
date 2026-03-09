

## Current Attachment Handling in PDF Recap

There are **two separate PDF export paths**, and they handle attachments differently:

### 1. Client-side PDF (`src/utils/exportPdfClient.ts`)
- **Data source**: `tripExportDataService.ts` fetches from `trip_files` table, returns `{ name, type, uploaded_at, uploaded_by }`
- **Rendering**: A table with columns `[File Name, Type, Uploaded By, Date]` — metadata only, no content embedding
- **Status**: Already safe. No file contents, previews, or URLs are embedded. Just a filename listing.

### 2. Server-side Edge Function (`supabase/functions/export-trip/`)
- **Template rendering** (`template.ts`): Renders a bullet list of filenames with type/date — metadata only. This is the "index" section. Safe.
- **`appendAttachmentsToPdf`** (`index.ts`, lines 152–240): **This is the problem.** After generating the recap PDF, it:
  - Downloads actual files from `trip-files` storage bucket
  - If PDF: copies all pages into the output PDF via `PDFDocument.copyPages`
  - If image (JPG/PNG): embeds the full image on a new page via `embedPng`/`embedJpg`
  - If unsupported: adds a fallback placeholder page
- **Trigger** (lines 467–487): Runs when `sections.includes('attachments')` and attachments exist

### What Needs to Change

**Client-side**: Nothing — already filename-only.

**Server-side Edge Function** (`supabase/functions/export-trip/index.ts`):
- Remove the call to `appendAttachmentsToPdf()` (lines 467–487)
- Remove the `appendAttachmentsToPdf` function itself (lines 152–240+)
- Remove helper functions used only by it (`classifyForEmbedding`, `guessExt`, `getPaperSizePts` if unused elsewhere)
- The template section in `template.ts` already renders a clean filename-only bullet list — that stays

This is a ~100-line deletion in one file with zero behavioral change to the client-side path.

### Also part of the approved plan

While in this file, the alphabetical section ordering and always-show-headings changes from the previous plan will also apply, but those are separate edits.

