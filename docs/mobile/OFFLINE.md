# Offline (MVP): cache + queued writes

This document describes Chravel’s **minimal viable offline resilience** for core trip functionality.

## Goals (MVP scope)

- **Read-only offline** for “trip overview” data:
  - Trip Base Camp (read-only when offline)
  - Itinerary list (calendar events)
  - Pinned places (Places/Links)
  - Tasks list
  - Files list (Media/Files/Links view)
- **Queue writes while offline** for:
  - Adding a chat message
  - Completing a task
  - Voting in a poll
- **On reconnect**: sync queued actions **in order**, retry safely, and avoid silent destructive merges.

## Non-goals (for this MVP)

- Full offline creation/editing for all features
- Two-way merge UI for conflicts
- Offline basecamp editing (explicitly disallowed)

## Storage primitives

All offline data is stored in **IndexedDB** (works in web + Capacitor WebView).

Implementation lives under `src/offline/`.

### IndexedDB schema (`chravel-offline-sync`, version 2)

- **`syncQueue`**: queued write operations (ordered by `timestamp`)
- **`cache`**: cached entities/lists (best-effort, time-bounded)
- **`tripOverview`**: optional per-trip “snapshot” bucket for overview UI (currently a convenience layer)

See: `src/offline/db.ts`

## Data model

### Queued operations (`syncQueue`)

Each queued operation is an append-only record:

- `id`: unique operation id
- `entityType`: one of:
  - `chat_message`
  - `task`
  - `poll_vote`
  - (calendar uses the same queueing infrastructure, but is not part of the PROMPT 6 write-scope)
- `operationType`: `create | update | delete`
- `tripId`
- `entityId`: optional (e.g. `taskId`, `pollId`)
- `data`: operation payload
- `timestamp`: ordering key (ms)
- `retryCount`
- `status`: `pending | syncing | failed`

### Cached entities (`cache`)

Cache entries are stored as:

- `id`: `${entityType}:${entityId}`
- `tripId`
- `entityType`:
  - `trip_basecamp`
  - `calendar_event`
  - `trip_tasks`
  - `trip_polls`
  - `trip_links`
  - `trip_media`
  - `trip_files`
- `data`: the cached payload
- `cachedAt`: ms
- `version`: optional optimistic-locking version (if available)

Cache is treated as **best-effort** and is allowed to be stale.

## Sync strategy

### When we sync

Sync is driven by:

- Browser `online` event
- Manual “Sync” button in the Offline banner
- App startup (if online) via `setupGlobalSyncProcessor()` in `src/App.tsx`

### Ordering

Operations are processed in ascending `timestamp` order.

### Conflict policy (MVP)

- **Chat messages**: server-side append. We attach a **`client_message_id`** for deduplication on retries.
- **Task completion**: treated as **last-write-wins**.
  - On replay we fetch the latest `trip_tasks.version` before calling `toggle_task_status` so a stale offline op doesn’t “fight” newer versions.
- **Poll votes**: replay uses the latest `trip_polls.version`.
  - If an optimistic-lock error occurs (“modified by another user”), we re-fetch version and retry once.
- **Basecamp**: **never** overwritten by offline replay.
  - Basecamp edits are blocked while offline (`OFFLINE:` error) and are not queued.

## UI / UX

- A top banner shows:
  - **Offline** (no network)
  - **Reconnecting** (online + queued ops pending)
  - **Synced** (briefly after successful sync)
- Banner is backed by real queue stats in IndexedDB (not in-memory).

See: `src/components/OfflineIndicator.tsx`, `src/offline/network.ts`

## Failure modes & mitigations

- **Storage eviction / quota**: IndexedDB may be cleared by the browser under pressure.
  - Result: cached reads may disappear; queued writes may be lost. Users can retry actions online.
- **Auth missing on reconnect**: if the user is signed out when syncing, queued ops may fail and be marked `failed`.
  - Result: banner can show failures; user can sign in and retry sync.
- **Partial sync**: ops are only removed after successful handler execution.
  - Ops without handlers are preserved (never dropped silently).
- **Duplicate chat messages**: mitigated via `client_message_id` dedupe (server unique constraint).
- **Basecamp “silent overwrite” regression**: prevented by:
  - blocking offline basecamp edits
  - never replaying basecamp writes from the queue

## Developer notes

- Prefer caching **lists** with trip-scoped ids (e.g. `${tripId}:list`) to avoid collisions.
- Avoid calling Supabase in JSX; queue/cache through services/hooks.
- Any new queued entity must:
  - have a handler in `src/services/globalSyncProcessor.ts`
  - be covered by a test proving ops are not dropped without handlers

