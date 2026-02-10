

# Fix: Super Admin Bypass Not Working (Paywall Showing for Founder)

## Root Cause

A previous security audit moved the super admin email from a hardcoded value in `src/constants/admins.ts` to an environment variable (`VITE_SUPER_ADMIN_EMAILS`). However, that env var was **never actually configured** in the project secrets.

As a result, `SUPER_ADMIN_EMAILS` resolves to an empty array at runtime, and every `isSuperAdminEmail()` check returns `false` -- meaning ccamechi@gmail.com gets treated as a free user everywhere: PDF export limits, subscription paywalls, feature gating, etc.

## Fix (1 file)

### `src/constants/admins.ts`

Add a hardcoded founder fallback so the super admin list is never empty, regardless of whether the env var is configured. The env var remains supported for adding additional admins.

```typescript
const FOUNDER_EMAILS = ['ccamechi@gmail.com'];

const envAdmins = (import.meta.env.VITE_SUPER_ADMIN_EMAILS as string) || '';
const additionalAdmins = envAdmins
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const SUPER_ADMIN_EMAILS = [
  ...FOUNDER_EMAILS,
  ...additionalAdmins.filter(e => !FOUNDER_EMAILS.includes(e)),
];
```

This is safe because:
- The email is not a secret (it is a public-facing founder account)
- It is only used for client-side feature unlocking, not for server-side authorization
- Server-side admin checks (RLS, edge functions) use the `user_roles` table, not this list
- The env var still works for adding more admins without code changes

## Impact

Once deployed, all `isSuperAdminEmail()` calls across the app will correctly return `true` for ccamechi@gmail.com. This fixes:
- PDF export paywall ("Upgrade for Unlimited Exports" modal)
- Subscription CTAs in settings
- Feature gating in `usePdfExportUsage`, `useEntitlements`, `useRolePermissions`
- Any other super admin bypass that relies on `SUPER_ADMIN_EMAILS`

## Files Changed

| File | Change |
|------|--------|
| `src/constants/admins.ts` | Add hardcoded founder email as fallback, keep env var for additional admins |

