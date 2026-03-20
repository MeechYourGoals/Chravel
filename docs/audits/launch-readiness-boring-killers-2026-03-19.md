# Launch Readiness Audit — Top 10 Boring Killers (2026-03-19)

Evidence-based audit captured from current codebase for TestFlight/App Store launch-risk review.

## Key findings

- Core auth/session and invite membership paths are materially stronger than historical baseline due to explicit hydration guards, token refresh fallback, and invite join error taxonomy.
- Revenue/IAP compliance remains a primary launch blocker: Apple IAP is scaffold-only and disabled while consumer upsell flows still open Stripe checkout from iOS code paths.
- Push/deep-link architecture is partially mature (cold-start routing, centralized lifecycle), but payload routing currently assumes `/trip/:id` for all notification types and does not branch for pro/event trip surfaces.
- Permissions UX is relatively good (permissions center + iOS settings fallback), but native usage-description coverage is incomplete for photos add-only and speech-recognition capability paths.
- Security posture has meaningful hardening in migrations and function auth checks, but broad service-role usage remains high and requires ongoing edge-function auth review discipline.

## Recommended ship gates

- **Minimum TestFlight gate:** weighted score >= 75 with no Critical blockers.
- **Minimum App Store gate:** weighted score >= 85 with no High blockers in IAP compliance, auth/session reliability, or account/legal compliance.

## Immediate blockers before App Store submission

1. Complete and enable Apple IAP for consumer plans.
2. Add restore purchases flow surfaced in consumer settings/paywall for native iOS.
3. Remove/disable iOS consumer Stripe checkout entry points until IAP is live.
4. Validate notification deep-link routing for pro/event destinations (not only consumer trip route).
5. Verify App Store Connect metadata parity (privacy policy URL, support URL, subscription disclosures, account deletion language).

## Remediation pass (implemented in code)

- Added native push payload + routing support for `tripType` so notification taps can route to `/tour/pro/:id` and `/event/:id` instead of always `/trip/:id`.
- Added iOS consumer billing compliance guards in frontend and `create-checkout` edge function to block Stripe checkout for consumer tiers on iOS native.
- Added iOS permission-description hardening (`NSPhotoLibraryAddUsageDescription`, `NSSpeechRecognitionUsageDescription`) in `Info.plist`.
- Added explicit Safety/Abuse reporting entry points in support and settings surfaces (`safety@chravelapp.com`).
- Tightened chunk-recovery heuristics to avoid treating generic `Failed to fetch` network errors as chunk-load failures.
