# Support + Internal Ops + Incident Constitution (Stage A Foundation)

This document establishes enforceable guardrails for support/admin operations.

## 1) Role Separation
- **Support (read-only):** diagnose user/trip/event state, no direct mutation actions.
- **Operator (action-capable):** scoped recovery actions (invite resend, join request resolve) with mandatory reason.
- **Engineering-only:** schema/data repair, break-glass actions, emergency feature lock controls.

## 2) Internal Route Safety
- Internal admin routes must be protected by explicit admin role checks.
- Authentication-only gating is insufficient for internal/admin pages.

## 3) Action Safety Rules
- Every privileged action must include actor, target, reason, timestamp.
- All repair actions should be idempotent and scoped to explicit IDs.
- Prefer function-based server actions over direct client table writes for privileged operations.

## 4) Incident Basics (Minimum)
- Declare severity on first triage (SEV1-4).
- Assign an owner for live incident response.
- Record timeline with customer impact, mitigation, resolution, and follow-up.

## 5) Immediate Hardening Added
1. `/admin/scheduled-messages` now requires super admin route guard.
2. Organization member invites now flow through secured edge function instead of direct insert from client hook.
