

# Fix Agenda Upload: Mobile Click, Multi-Format Support, Rename

## Problem

The "Upload PDF" button on the Agenda tab is broken on mobile/tablet. Three issues:

1. **Tapping does nothing on mobile** -- The current code wraps a `<Button>` inside a `<label>` that's associated with a hidden file input. On mobile Safari and Chrome, the button element intercepts the tap and prevents the label from triggering the file input. This is a known browser behavior where `<button>` elements inside `<label>` elements don't forward clicks to the associated `<input>` on touch devices.

2. **Only PDFs accepted** -- The file input has `accept=".pdf"`, which blocks images and Word documents from appearing in the mobile file picker. The agenda could be a photo, a Word doc, or other formats.

3. **Button text says "Upload PDF"** -- Should say "Upload Agenda" to reflect that multiple file types are supported.

## Fix (Single File: `src/components/events/EnhancedAgendaTab.tsx`)

Note: `SimpleAgendaSection.tsx` is not imported anywhere in the project -- the live component on mobile is `EnhancedAgendaTab.tsx`.

### Change 1: Fix mobile click with programmatic trigger

Replace the broken `<label>` + hidden `<input>` + `<Button>` pattern with a ref-based approach:

- Add a `useRef<HTMLInputElement>` for the file input
- Move the hidden `<input>` outside the label, controlled by ref
- Make the Button's `onClick` call `inputRef.current?.click()` directly
- This bypasses the mobile label-button click interception entirely

Before (lines 127-144):
```tsx
<label className="flex-1 sm:flex-none">
  <input type="file" accept=".pdf" onChange={handlePDFUpload} className="hidden" disabled={isUploadingPDF} />
  <Button variant="outline" className="..." disabled={isUploadingPDF} type="button">
    <Upload size={16} className="mr-2" />
    {isUploadingPDF ? 'Uploading...' : 'Upload PDF'}
  </Button>
</label>
```

After:
```tsx
<>
  <input ref={fileInputRef} type="file" accept="..." onChange={handlePDFUpload} className="hidden" />
  <Button variant="outline" className="..." disabled={isUploadingPDF} type="button"
    onClick={() => fileInputRef.current?.click()}>
    <Upload size={16} className="mr-2" />
    {isUploadingPDF ? 'Uploading...' : 'Upload Agenda'}
  </Button>
</>
```

### Change 2: Accept images, PDFs, and documents

Update the `accept` attribute from `.pdf` to:
```
image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt
```

This allows the mobile file picker to show:
- **Photos** (from camera roll or take a photo)
- **PDFs**
- **Word, Excel, PowerPoint documents**
- **Text files**

The `image/*` value is what triggers the "Select a Photo" option on iOS and Android file pickers.

### Change 3: Update all text references

| Location | Before | After |
|----------|--------|-------|
| Button text (line 142) | "Upload PDF" | "Upload Agenda" |
| Toast success (line 57) | "PDF uploaded successfully" | "Agenda uploaded successfully" |
| Toast description (line 58) | "Attendees can now download the schedule" | "Attendees can now view the agenda" |
| PDF display heading (line 165) | "Full Event Schedule (PDF)" | "Event Agenda" |
| PDF display subtext (line 166) | "Complete agenda with all details" | "Uploaded agenda file" |
| Download filename (line 174) | "Event_Schedule.pdf" | Keep dynamic based on actual file extension |
| Confirm dialog (line 185) | "Remove uploaded PDF schedule?" | "Remove uploaded agenda?" |
| Empty state text (line 353) | "upload a PDF schedule or add sessions" | "upload an agenda or add sessions" |
| Description (line 119) | "View the full event schedule" | "View the event agenda and schedule" |

### Also fix `SimpleAgendaSection.tsx` (same 3 issues)

Even though this component is currently unused, it should be fixed for consistency in case it's used later:

- Same ref-based click pattern
- Same expanded `accept` attribute
- Same text updates ("Upload Agenda" instead of "Choose PDF File", etc.)
- Remove the PDF-only type check in `handleFileUpload` (line 17: `file.type === 'application/pdf'`)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/EnhancedAgendaTab.tsx` | Add `useRef`, fix click handler, expand `accept`, update all text |
| `src/components/events/SimpleAgendaSection.tsx` | Same fixes for consistency (currently unused but should match) |
