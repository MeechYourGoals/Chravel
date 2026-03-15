
## Invite Flow Hardening — COMPLETED

All 9 items from the audit have been addressed:

### ✅ Implemented
1. **Auth Handoff**: `sessionStorage` → `localStorage` for `INVITE_CODE_STORAGE_KEY` — survives OAuth redirects and tab switches
2. **OAuth Redirect URLs**: All auth redirects now include `&invite={token}` query param as fallback
3. **AuthPage invite restore**: On mount, restores invite code from `invite` query param to localStorage; on auth completion, redirects to `/join/{code}` if invite context present
4. **Triple-source restoration**: JoinTrip resolves invite code from URL param → localStorage → query param on mount; auto-redirects if token missing but code available from another source
5. **Auto-join retry**: `autoJoinAttemptedRef` only set on successful completion, allowing retries on transient failures
6. **OG Preview 404**: `generate-invite-preview` returns HTTP 404 with `noindex, nofollow` and `no-cache` for invalid invite codes
7. **Post-join query invalidation**: Invalidates `trips`, `trip`, and `trip-members` queries after successful join; clears localStorage invite code
8. **current_uses increment**: `join-trip` edge function increments `current_uses` with optimistic concurrency after creating join request
9. **Unique constraint verified**: `trip_members_trip_id_user_id_key` already exists — no migration needed
