# Polls Launch Readiness Deep Dive (Trip Context)

Date: 2026-02-27
Scope: `PollComponent`, `Poll` UI, `useTripPolls`, demo poll persistence, and adjacent poll services/hooks.

## Dogfooding notes

- Attempted to use the requested Vercel dogfood skill URL (`https://skills.sh/vercel-labs/agent-browser/dogfood`) but skill installer only supports GitHub URLs and direct access to `skills.sh` returned HTTP 403 in this environment.
- Fallback dogfooding was done with local app + browser automation and direct interaction checks.
- Polls UI in a full trip context could not be reached via browser automation because `/demo/trip/1` currently resolves to the demo gate/marketing screen without poll tab interactions in this environment/session.

## High-confidence bugs / launch risks

### 1) **Potential runtime crash path: `onVote` required in `Poll`, but parent sometimes passes `undefined`** (HIGH)

- `PollProps` declares `onVote` as required.
- `PollComponent` passes `onVote={effectivePermissions.canVote ? handleVote : undefined}`.
- This mismatch can become a runtime fault if a path calls `onVote` when permissions flip or edge rendering allows interaction.

**Impact:** user interaction crash in Poll tab under permission edge cases.

### 2) **Custom React Query key pattern for polls is inconsistent with project query key discipline** (MEDIUM)

- `useTripPolls` uses `['tripPolls', tripId, isDemoMode]` directly.
- Team guidance says to use canonical key factory (`tripKeys.*`) + tuned cache config.

**Impact:** cache invalidation drift and harder-to-reason cross-feature consistency/regressions.

### 3) **Optimistic vote logic for anonymous polls can undercount/overcount in edge conditions** (MEDIUM)

- Optimistic vote calculations infer prior votes from `option.voters` arrays.
- For anonymous polls, voters are intentionally not stored in those arrays, so reconciliation relies on incomplete data.

**Impact:** temporary vote count drift until refetch; confusing UX during high activity.

### 4) **CSV export is not escaping commas/newlines/quotes** (MEDIUM)

- `handleExportPoll` builds CSV with `row.join(',')`.
- Poll questions/options containing commas, quotes, or line breaks will generate malformed CSV.

**Impact:** exported poll analytics can be corrupted for real-world text.

### 5) **Deadline parsing uses local string construction without timezone normalization** (MEDIUM)

- Create flow writes `deadline_at` as `${date}T${time}:00` (no timezone suffix).
- Different client timezones can interpret deadlines differently.

**Impact:** voting appears to close too early/late for distributed teams.

### 6) **Dead/parallel poll code paths increase maintenance risk** (LOW/MEDIUM)

- `pollService`, `contextPollService`, and `usePollManager` appear unreferenced by active poll UI flow.
- Active runtime path is `PollComponent` + `useTripPolls` (+ `pollStorageService` in demo mode).

**Impact:** future fixes may hit wrong abstraction; latent regressions from drift.

## Edge cases likely under-tested

1. Anonymous + allow vote changes + multiple choice (combined behavior).
2. Deadline crossing while user has poll open (minute timer vs server truth).
3. Offline queued votes replayed after poll is closed/deadline passed before reconnect.
4. Duplicate option labels with different IDs (usability confusion).
5. Large poll option set on 375px width with long text and dynamic counts.
6. Export behavior with unicode/emojis/newlines and anonymous voter redaction.
7. Permission changes mid-session (e.g., role downgraded while tab remains open).

## MVP high-impact additions (small, launch-safe)

1. **Safe vote handler contract**
   - Make `onVote` optional in `Poll` + guard all calls.
   - Add unit test for non-voter permission rendering.

2. **Server-authoritative deadline label + timezone clarity**
   - Show explicit timezone in UI copy and normalize deadline input to ISO UTC before insert.

3. **Robust CSV export utility**
   - Quote/escape cells and add UTF-8 BOM for spreadsheet compatibility.

4. **Conflict/error UX for queued votes**
   - If replay fails (closed poll/deadline), surface a specific toast and remove stale optimistic badge.

5. **Analytics hooks (cheap but high value)**
   - Track: poll_created, poll_voted, poll_closed, poll_exported, vote_queue_conflict.

## Dependencies to keep eyes on before launch

- DB RPC contract (`vote_on_poll_batch`, fallback `vote_on_poll`) and version conflict handling.
- Realtime invalidation path via hub or direct channel for `trip_polls` table changes.
- Demo mode merge behavior between static `mockPolls` and locally stored votes/polls.
- Offline cache entity shape parity for `trip_polls` when schema fields evolve.

## Suggested launch checklist (polls)

- [ ] Permission matrix tested (viewer/member/admin/creator) for create/vote/close/delete.
- [ ] Anonymous poll flow tested end-to-end (UI + DB + export).
- [ ] Deadline behavior validated across at least two timezones.
- [ ] Offline vote queue replay tested with close/deadline conflicts.
- [ ] CSV export opened in Sheets + Excel with punctuation-heavy text.
- [ ] Mobile 375px pass for create form, long options, and vote actions.
