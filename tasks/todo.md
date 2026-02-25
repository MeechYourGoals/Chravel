# TODO

## Settings profile persistence fix (real name + display name)
- [x] Scope bug by tracing consumer settings save path and auth rehydration path.
- [x] Implement targeted persistence hardening for name fields.
- [x] Add/adjust automated coverage for the regression-prone path.
- [x] Run focused validation (tests/typecheck for touched code).
- [x] Document review notes + risks.

## Review
- Root cause: auth fallback hydration could re-seed `profiles.display_name` from stale auth metadata and fallback profile selects dropped `real_name`, which made settings appear non-persistent after app relaunch/resume.
- Fix: changed profile self-heal upsert to ignore duplicates (insert-only behavior), expanded fallback profile select to include `real_name`/`name_preference`/`phone`, and synchronized auth metadata after profile name updates.
- Added test coverage in `useAuth.test.tsx` to ensure `updateProfile` now syncs `display_name` + `full_name` metadata.
- Validation: targeted auth hook test file and project typecheck both pass.
