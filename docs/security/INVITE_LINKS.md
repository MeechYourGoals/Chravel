# Invite links (viral sharing) — security model

Chravel invite links are designed to be **shareable** (viral distribution) while still protecting trip privacy via **authentication + authorization gates**.

## What we intentionally allow

- **Anyone can open an invite link** like `/join/{code}`.
- Unauthenticated users can see a **limited preview** (trip name/dates/cover), so sharing works smoothly across SMS, social, and link unfurls.

## What we intentionally do *not* allow

- **No public/anon SELECT on `public.trip_invites`.**
  - A legacy policy that allowed “public can view active invites” was removed because it made invite codes **enumerable** (bulk harvesting risk).
  - Invite codes must be resolved server-side by code (single-record lookup), not listable.

## How the system is secured (defense-in-depth)

- **Invite preview resolution**:
  - The client calls the `get-invite-preview` edge function.
  - The edge function uses the **service role** to look up exactly one invite by `code` and returns a **narrow** payload.
  - The function is **rate limited** to reduce brute-force guessing.

- **Join behavior**:
  - The client calls the `join-trip` edge function.
  - **Authentication is required** (valid Supabase JWT).
  - If the invite has `require_approval = true`, the user **does not become a trip member**:
    - We create a `trip_join_requests` row with `status = 'pending'`.
    - A trip creator/admin approves before access is granted.
  - If `require_approval = false`, the invite behaves like a standard “direct join” link (Discord-style for open trips).

## Why scanners sometimes flag this

Automated “LLM database checks” often assume that **any public readability of an invite table = instant unauthorized access**.

Chravel’s model is closer to:

- **Discord / Facebook Groups / Events**: a link can be shared widely, but **membership and permissions are enforced after authentication**, and access can be **approval-gated**.

## Operational notes

- If you ever need to tighten further (e.g., for high-risk trips), the supported knobs are:
  - Turn on `require_approval`.
  - Use shorter expirations / max uses.
  - Rotate/deactivate codes.
  - Increase rate limiting thresholds for previews/joins.

