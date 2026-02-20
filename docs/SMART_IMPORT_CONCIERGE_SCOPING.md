# Smart Import in AI Concierge — Scoping Memo

**Status:** Scope only — DO NOT BUILD  
**Date:** 2026-02-20  
**Context:** After fixing desktop DnD for Smart Import (Calendar, Agenda, Lineup), evaluate exposing Smart Import inside AI Concierge.

---

## 1. Should Smart Import be exposed inside AI Concierge?

**Assessment:** **Partially redundant, but valuable in specific flows.**

- **Redundancy:** Concierge already helps users with trip context (events, places, chat). Users can ask "add these events to my calendar" and Concierge could theoretically parse and suggest. But Concierge does not currently have file/URL import capabilities — it's text/chat only.
- **Value:** Concierge suggestions (e.g., "I found 5 events from this URL") could be one-click imported into Calendar/Agenda/Lineup instead of the user opening the modal manually. This reduces friction for users who discover content via Concierge.
- **Recommendation:** Expose Smart Import in Concierge **only** when Concierge has produced a parseable result (URL scraped, text extracted). Do not add a generic "Import" button that opens the full modal — that would duplicate existing entry points.

---

## 2. Minimal UX patterns (if we do it)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | "Add to Calendar/Agenda/Lineup" button on concierge suggestion cards | Clear intent, single action | Requires Concierge to produce structured suggestions |
| **B** | + button next to each suggestion card | Compact, familiar pattern | Easy to misclick, less discoverable |
| **C** | Paperclip/upload button inside Concierge input | Matches "attach file" mental model | Concierge input is for text; file upload is a different flow |

**Recommended:** **Option A** — When Concierge returns structured data (e.g., "I found 5 events from example.com/schedule"), show an "Add to Calendar" (or Agenda/Lineup) button that triggers the import. No new modal; reuse the existing Smart Import pipeline.

---

## 3. Technical approach

- **Reuse:** Same Smart Import endpoint/parser (`parseCalendarFile`, `parseAgendaFile`, `parseLineupFile`, `parseURLSchedule`, etc.). No new backend.
- **Concierge → Import flow:**
  - Concierge fetches a URL or parses pasted text.
  - Concierge returns structured suggestions (events, sessions, names) with a `sourceUrl` or `sourceText` reference.
  - User clicks "Add to Calendar" → call `parseURLSchedule(url)` or use cached parse result → open preview in CalendarImportModal (or equivalent) with `pendingResult` pre-loaded.
- **Data plumbing:**
  - `tripId`: From Concierge context (current trip).
  - `eventId`: For Agenda/Lineup, from current event context in Concierge.
  - `targetTab`: Calendar | Agenda | Lineup — determined by which "Add to X" button was clicked.

---

## 4. Complexity estimate

| Level | Estimate | Rationale |
|-------|----------|-----------|
| **S** | 0.5–1 day | If Concierge already returns structured parse results and we only add a button + `pendingResult` wiring. |
| **M** | 2–4 days | If Concierge needs new logic to fetch/parse URLs, cache results, and pass to Smart Import modals. |
| **L** | 1–2 weeks | If we need new Concierge capabilities (file upload in chat, URL discovery, multi-step flows). |

**Main risks:**
- **Permissions:** Concierge may not have `eventId` in context when user is in a trip-level view; need to handle "Add to which event?" for Agenda/Lineup.
- **Context mismatch:** User might expect "Add to Calendar" to apply to a different trip than the one Concierge is scoped to.
- **Duplicate imports:** User could add the same events multiple times; rely on existing duplicate detection in Smart Import.
- **UX clutter:** Too many "Add to X" buttons could overwhelm the Concierge UI; keep to one primary action per suggestion type.

---

## 5. Rollback strategy

If implemented: Feature-flag the Concierge "Add to Calendar/Agenda/Lineup" buttons. Disable flag to hide without code revert.
