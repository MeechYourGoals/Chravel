# Files + Sharing Integrations (iOS + Web)

This doc covers Chravel’s **inbound sharing** (“Share to Chravel”) and **outbound sharing** (export/share recap PDF).

Deliverables:
- `src/native/share.ts` (TS integration surface + web fallbacks)
- This doc (iOS Share Extension scaffolding notes for human dev)

---

## Outbound (export out): recap PDF → native share sheet

### What we support
- **iOS native shell (Capacitor)**: Uses Capacitor’s Share plugin to open the native share sheet.
- **Web**: Uses **Web Share API** when supported (including `files` on mobile), otherwise falls back to open/download.

### API surface (JS/TS)
Use:
- `shareRecapPdf({ pdfBlob, filename?, title?, text? })`
- or the generic `shareBlob({ blob, filename, title?, text? })`

Example:

```ts
import { shareRecapPdf } from '@/native/share';

await shareRecapPdf({
  pdfBlob,
  filename: 'Chravel-Recap-Paris.pdf',
  title: 'Trip recap',
  text: 'Here’s our Chravel recap PDF.',
});
```

---

## Inbound (share in): “Share to Chravel” for URLs, images, PDFs

### Product behavior
Inbound share should:
- Accept **URLs**, **images**, and **PDFs** from iOS share sheet (“Share to Chravel”).
- Route the shared content into a **chosen Trip**.
- Persist into the Trip’s “Files/Media/URLs” system:
  - **URL** → create `trip_links` row (shows under URLs)
  - **image/pdf/file** → upload to `trip_media_index` (shows under Photos / Files)

The TS helper `ingestInboundSharesToTrip()` implements this mapping.

---

## iOS implementation notes (human-dev owned)

Inbound sharing on iOS generally requires **two native pieces**:

1) **Share Extension target** (Xcode)
- Adds “Chravel” to the iOS share sheet.
- Receives `NSExtensionItem` attachments (URL, image, PDF).
- Writes a durable representation into an **App Group** container so the main app can read it later.

2) **Main app bridge to WebView (Capacitor custom plugin)**
- Reads queued share items from the App Group container
- Exposes them to JS via a Capacitor plugin named **`ChravelShare`**

### App Group strategy (recommended)
- Create an App Group like: `group.com.chravelapp.share`
- Share extension writes:
  - a JSON “queue” file (e.g. `pending-shares.json`)
  - and copies binary files into the group container (or base64 encodes and stores in JSON—OK for small payloads, but avoid for large PDFs)

### Expected JS contract: `ChravelShare`
`src/native/share.ts` assumes a Capacitor custom plugin exists with:
- `getPendingShares(): Promise<{ items: InboundSharedItem[] }>`
- `consume({ ids: string[] }): Promise<void>`

`InboundSharedItem` must be one of:
- URL item:
  - `kind: 'url'`
  - `id: string`
  - `url: string`
  - optional `title`, `text`, `createdAt`
- File item:
  - `kind: 'image' | 'pdf' | 'file'`
  - `id: string`
  - optional `name`, `mimeType`, `createdAt`, `text`
  - **Preferred**: `base64` (raw base64, no prefix) OR `dataUrl` (`data:<mime>;base64,...`)
  - optional `fileUri` if you also copy into the app sandbox (JS does not currently fetch `fileUri`).

Example payload:

```json
{
  "items": [
    { "id": "a1", "kind": "url", "url": "https://example.com", "title": "example.com" },
    {
      "id": "b2",
      "kind": "pdf",
      "name": "Ticket.pdf",
      "mimeType": "application/pdf",
      "base64": "<...>"
    }
  ]
}
```

### How the app should “wake up”
Typical patterns:
- Share extension calls `openURL` on a custom scheme (e.g. `chravel://share`) after writing to App Group.
- Or share extension uses `NSExtensionContext` + `completeRequest` and the user returns to the app manually.

On the JS side, `registerInboundShareListener()` polls on:
- `App.addListener('appUrlOpen', ...)`
- `App.addListener('resume', ...)`

### UI flow recommendation
When inbound items arrive:
1) Persist the items into an in-memory store (or localStorage if needed)
2) Navigate the user to a **“Choose Trip”** picker
3) Call:
   - `ingestInboundSharesToTrip({ tripId, items, isDemoMode })`
4) Then call:
   - `consumeInboundShares(consumedIds)`

---

## Web graceful degradation

### Outbound
Handled automatically:
- Web Share API (when available)
- else download/open fallback (`src/utils/download.ts`)

### Inbound
Web browsers generally **cannot** receive OS-level share intents unless you configure:
- **Web Share Target** (PWA manifest + service worker routing)

Chravel does not currently implement Web Share Target in this scaffold; on web the intended fallback is:
- manual upload in Files tab, and/or
- paste URL into “Add link”

---

## Troubleshooting / gotchas

- **Large PDFs**: Prefer copying the file into the App Group container and returning a reference that the main app can read natively (then convert to base64 in the plugin) rather than base64 encoding inside the extension.
- **Duplicate ingestion**: The queue should be **idempotent**; always require explicit `consume()` after successful ingest.
- **Auth**: `ingestInboundSharesToTrip` requires an authenticated user for media uploads unless `isDemoMode` is true.

