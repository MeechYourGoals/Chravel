

# Clean Up Old Google OAuth Code

## What gets removed

All remnants of the previous Google OAuth attempt will be deleted. The Google sign-in functions are not rendered anywhere in the UI (the AuthModal only shows email/password forms), but dead code referencing them still exists across several files.

## Changes

### 1. Delete `src/components/auth/OAuthButtons.tsx`

This component is never imported or rendered outside its own test file. Contains the disabled `isOAuthEnabled()` flag and unused Google OAuth button.

### 2. Delete `src/components/auth/AuthDivider.tsx`

OAuth divider component ("or continue with"). Only imported by OAuthButtons test file. Not used anywhere in the app.

### 3. Delete `src/components/auth/__tests__/OAuthButtons.test.tsx`

Tests for the components being deleted. No longer needed.

### 4. Update `src/components/auth/index.ts`

Remove all exports since both exported components are being deleted. If the file becomes empty, delete it entirely.

### 5. Clean up `src/components/AuthModal.tsx`

- Remove `signInWithGoogle` from the useAuth destructure (line 16)
- Remove `googleLoading` state variable (line 28)
- Remove `handleGoogleSignIn` function (lines 95-111)
- Keep only the email/password and forgot password flows (no functional change since Google button was never rendered)

### 6. Clean up `src/hooks/useAuth.tsx`

- Remove `signInWithGoogle` from the AuthContext interface (line 83)
- Remove `signInWithApple` from the AuthContext interface (line 84)
- Remove the `signInWithGoogle` function implementation (lines 766-822)
- Remove the `signInWithApple` function implementation (lines 824-851)
- Remove both from the context provider value (lines 1083-1084)

### 7. Clean up `src/pages/AuthPage.tsx`

- Remove `isProcessingOAuth` state and the OAuth callback useEffect (lines 24, 36-71)
- Remove the OAuth loading screen (lines 84-93)
- Simplify the authenticated redirect check (remove `isProcessingOAuth` dependency)
- The page now purely handles email/password auth via AuthModal

### 8. Clean up `src/services/googleCalendarService.ts`

- Remove the hardcoded `'your_google_client_id'` placeholder in `authenticateUser()` (line 35)
- Replace with a clear error message indicating calendar OAuth is not configured
- This is a separate feature from sign-in OAuth but still contains stale placeholder credentials

## What stays

- Email/password sign-in and sign-up (fully functional)
- Password reset flow
- The `useAuth` hook (minus the Google/Apple methods)
- All trip membership, profile, and notification logic in useAuth
- The AuthModal UI (unchanged since Google button was never rendered)

## Files summary

| Action | File |
|--------|------|
| Delete | `src/components/auth/OAuthButtons.tsx` |
| Delete | `src/components/auth/AuthDivider.tsx` |
| Delete | `src/components/auth/__tests__/OAuthButtons.test.tsx` |
| Delete | `src/components/auth/index.ts` |
| Edit | `src/components/AuthModal.tsx` |
| Edit | `src/hooks/useAuth.tsx` |
| Edit | `src/pages/AuthPage.tsx` |
| Edit | `src/services/googleCalendarService.ts` |

