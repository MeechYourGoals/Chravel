
# Fix "Remember Me for 30 Days" Session Persistence

## Root Cause Analysis

After investigating the authentication implementation, I've identified the **critical issue**: The "Remember Me" checkbox is purely cosmetic - it only stores a flag in localStorage but **does not actually extend the session duration**.

### The Problem

Looking at `src/hooks/useAuth.tsx` lines 558-631:

```typescript
const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
  // Stores preference in localStorage - but this does NOTHING to Supabase session
  if (rememberMe) {
    localStorage.setItem('chravel-remember-me', 'true');
  }
  
  // Standard sign-in - NO session extension options passed
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  // Just logs a message - doesn't actually extend anything
  if (rememberMe && data.session) {
    localStorage.setItem('chravel-session-extended', Date.now().toString());
    console.log('[Auth] Remember Me enabled - session will persist for 30 days');
  }
}
```

### Why Sessions Are Terminating

1. **Supabase session duration is controlled server-side** via the JWT expiry setting in the Supabase Dashboard (default: 1 hour for access tokens, but refresh tokens work indefinitely if used)

2. **The client-side `signInWithPassword` method does NOT accept a session duration parameter** - this must be configured in the Supabase Dashboard under Authentication > Sessions

3. **The "chravel-remember-me" localStorage flag** is never read or used anywhere else in the codebase

4. **Possible inactivity timeout** configured in Supabase Dashboard - if set, sessions terminate after periods of inactivity

---

## Technical Details

### How Supabase Sessions Actually Work

| Component | Duration | Client Control |
|-----------|----------|----------------|
| Access Token (JWT) | Configurable (default 1hr) | No - Dashboard only |
| Refresh Token | Indefinite | No - Dashboard only |
| Session Timeout | Configurable (Pro plan) | No - Dashboard only |
| Inactivity Timeout | Configurable (Pro plan) | No - Dashboard only |

**Key insight**: The `signInWithPassword` API does NOT support a duration parameter. Session lifetime is entirely controlled server-side.

---

## Solution Approach

Since true 30-day sessions require Supabase Dashboard configuration (Pro plan feature), we have two options:

### Option A: Dashboard Configuration (Recommended - Requires Pro Plan)

Configure in Supabase Dashboard > Authentication > Sessions:
- Set **Time-box user sessions** to 30 days (720 hours)
- Or disable session expiry entirely (default behavior)

### Option B: Client-Side Session Refresh Strategy (Works on all plans)

Implement aggressive session refresh to keep the session alive:
1. Check and refresh session on every app load
2. Refresh session on tab visibility change
3. Periodically refresh session in background (every 30-55 minutes)
4. Store refresh intent and proactively maintain session

---

## Implementation Plan

### Step 1: Add Aggressive Session Refresh Logic

Update `src/hooks/useAuth.tsx` to implement a robust session refresh system:

```text
Location: src/hooks/useAuth.tsx

Changes:
1. Add a periodic session refresh interval (every 30 minutes when rememberMe is true)
2. Actually USE the stored "chravel-remember-me" flag to control refresh behavior
3. Add session refresh on app initialization if rememberMe was previously set
4. Improve visibility change handler to always refresh if rememberMe is enabled
```

### Step 2: Modify Sign-In Flow

Update the signIn function to:
1. Set a more robust marker indicating 30-day session intent
2. Immediately trigger a session refresh after sign-in to ensure tokens are fresh
3. Start the periodic refresh interval

### Step 3: Add Session Health Monitoring

Implement a background task that:
1. Checks session validity every 30 minutes (below typical 1hr JWT expiry)
2. Proactively refreshes before expiry
3. Only runs when "Remember Me" was selected
4. Cleans up on sign-out

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAuth.tsx` | Add periodic refresh logic, use rememberMe flag, improve session persistence |
| `src/integrations/supabase/client.ts` | No changes needed - already configured correctly |

---

## Code Changes Detail

### src/hooks/useAuth.tsx

**Add periodic session refresh (new useEffect):**

```typescript
// Periodic session refresh for "Remember Me" users
useEffect(() => {
  let refreshInterval: NodeJS.Timeout | null = null;
  
  // Check if user selected "Remember Me"
  const shouldRemember = (() => {
    try {
      return localStorage.getItem('chravel-remember-me') === 'true';
    } catch {
      return false;
    }
  })();
  
  if (session && shouldRemember) {
    // Refresh session every 30 minutes to keep it alive
    refreshInterval = setInterval(async () => {
      if (import.meta.env.DEV) {
        console.log('[Auth] Periodic session refresh (Remember Me active)');
      }
      try {
        await supabase.auth.refreshSession();
      } catch (err) {
        console.warn('[Auth] Periodic refresh failed:', err);
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Also refresh immediately on mount if session exists
    supabase.auth.refreshSession().catch(console.warn);
  }
  
  return () => {
    if (refreshInterval) clearInterval(refreshInterval);
  };
}, [session]);
```

**Update signIn function to refresh immediately:**

```typescript
// After successful sign-in with rememberMe
if (rememberMe && data.session) {
  // Immediately refresh to get a fresh token
  await supabase.auth.refreshSession();
}
```

**Update visibility change handler:**

```typescript
const shouldRemember = (() => {
  try {
    return localStorage.getItem('chravel-remember-me') === 'true';
  } catch {
    return false;
  }
})();

// If Remember Me is enabled, always refresh on tab focus
if (shouldRemember) {
  supabase.auth.refreshSession();
}
```

---

## Dashboard Recommendation

Even with client-side fixes, I recommend checking the Supabase Dashboard:

1. Go to: `https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/auth/sessions`
2. Verify no **Inactivity Timeout** is set (or set it high, like 30 days)
3. Verify no **Time-box user sessions** is restricting session lifetime
4. Check **JWT Expiry** at `/settings/jwt` - default 1hr is fine with refresh logic

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Session persists across browser closes when "Remember Me" checked | Manual test |
| 2 | Session persists for 30 days of inactivity | Long-term test |
| 3 | Session refreshes proactively in background | Console logs |
| 4 | No unexpected logouts during active use | User testing |
| 5 | Session properly terminates on explicit sign-out | Manual test |
