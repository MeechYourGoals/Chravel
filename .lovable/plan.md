
# Fix Trip Loading Failures - Comprehensive Root Cause Analysis & Solution

## Problem Summary
Authenticated users cannot load trips - they see either "Trip Not Found" or "Couldn't Load Trip" errors. The issue manifests as:
- Trip cards display correctly in dashboard
- Clicking "View" fails to load trip detail pages
- Skeleton loading appears briefly before timeout
- Generic error messages provide no diagnostic information

## Root Cause Analysis

### 🔴 CRITICAL: Authentication Token Issues (Primary Root Cause)

**Evidence from Auth Logs:**
```
"403: invalid claim: missing sub claim" (repeated ~50+ times)
"error_code": "bad_jwt"
```

**What's Happening:**
1. Supabase auth tokens are missing the `sub` claim (user ID)
2. When the client makes requests, the JWT validation fails
3. Queries execute as unauthenticated user → RLS filters out all trips
4. The app interprets empty results as "Trip Not Found"

**Why This Is Happening:**
- Session refresh is failing (rate limit errors visible in logs: "429: Request rate limit reached")
- Token refresh attempts are being throttled
- Stale/corrupted tokens in localStorage are being reused
- The auth session is technically valid but the JWT is malformed

### 🟡 Secondary: Complex RLS Policy Layering

**Current State:**
The `trips` table has 3+ overlapping SELECT policies:
1. "Trip creators can view their own trips" - checks `created_by`
2. "Trip creators and members can view trips" - checks `created_by` OR `trip_members`
3. "Users can view their trips" - checks `created_by` OR `is_trip_member()`

**Problems:**
- Overlapping policies create evaluation order dependencies
- Each policy queries trip_members (which itself has RLS policies)
- Performance degradation with multiple policy evaluations
- Inconsistent behavior when one policy passes but another fails

### 🟡 Tertiary: Auth State Race Conditions

**Current Flow:**
```typescript
// useAuth transforms session -> user
const { user, session, isLoading } = useAuth();

// useTripDetailData waits for auth
const authUserId = user?.id ?? session?.user?.id ?? null;
const isQueryEnabled = !!tripId && !shouldUseDemoPath && !isAuthLoading && !!authUserId;
```

**Race Condition:**
1. Session loads → `isAuthLoading = false`
2. But `user` transformation hasn't completed yet
3. `authUserId` is null → queries don't run
4. User sees loading skeleton indefinitely or "Trip Not Found"

### 🟡 Tertiary: Poor Error Taxonomy

**Current Error Handling:**
```typescript
// tripService.getTripById
if (error) {
  throw new Error(`Failed to load trip: ${error.message}`);
}
if (!data) {
  // Falls back to edge function
  return await fetchTripByIdViaEdgeFunction(tripId);
}
```

**Problems:**
- Generic "Failed to load trip" for ALL errors
- No distinction between:
  - Auth required (401)
  - Access denied (403)  
  - Trip not found (404)
  - Network error (500)
  - RLS filtered (empty result)
- UI shows same "Trip Not Found" for all scenarios

## Solution: 5-Phase Fix Strategy

---

### **PHASE 1: Fix Authentication Token Issues** (CRITICAL - Must Do First)

#### 1.1 Force Token Refresh on Error
```typescript
// src/hooks/useAuth.tsx
const forceRefreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error('[Auth] Force refresh failed:', error);
    // Clear corrupted session
    await supabase.auth.signOut();
    return null;
  }
  return data.session;
};

// Add to AuthContext
const ensureValidSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Check if token is about to expire or missing sub claim
  if (session?.access_token) {
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      if (!payload.sub) {
        console.warn('[Auth] Token missing sub claim - forcing refresh');
        return await forceRefreshSession();
      }
    } catch (e) {
      console.error('[Auth] Token parse error:', e);
      return await forceRefreshSession();
    }
  }
  
  return session;
};
```

#### 1.2 Add Token Validation Interceptor
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const client = createClient(url, anonKey, {
  auth: {
    // Add request interceptor to validate token before each request
    async persistSession(session) {
      if (session?.access_token) {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        if (!payload.sub) {
          console.error('[Supabase] Detected invalid token - clearing');
          return null; // Force re-auth
        }
      }
      return session;
    }
  }
});
```

#### 1.3 Clear Corrupted Sessions on Mount
```typescript
// src/App.tsx or AuthProvider
useEffect(() => {
  const validateSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        if (!payload.sub) {
          console.warn('[App] Clearing corrupted session on mount');
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.error('[App] Session validation error:', e);
        await supabase.auth.signOut();
      }
    }
  };
  
  validateSession();
}, []);
```

---

### **PHASE 2: Simplify & Consolidate RLS Policies** (HIGH PRIORITY)

#### 2.1 Single Unified SELECT Policy for Trips

**Remove:**
- "Trip creators can view their own trips"
- "Trip creators and members can view trips"
- "Users can view their trips"

**Replace with:**
```sql
-- Single, clear, performant policy
DROP POLICY IF EXISTS "Authenticated users can view their trips" ON public.trips;

CREATE POLICY "Authenticated users can view their trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  -- Creator access (no subquery needed)
  auth.uid() = created_by
  
  OR
  
  -- Member access via SECURITY DEFINER function (prevents recursion)
  public.is_trip_member(auth.uid(), id)
);

COMMENT ON POLICY "Authenticated users can view their trips" ON public.trips IS
  'Unified policy: Grants access if user is trip creator OR trip member. Uses is_trip_member() to prevent RLS recursion.';
```

**Why This Works:**
- Single policy = single evaluation path = predictable behavior
- `created_by` check is instant (no subquery)
- `is_trip_member()` uses SECURITY DEFINER to bypass RLS recursion
- Clear mental model: "You see trips you created or are a member of"

#### 2.2 Ensure Trigger Guarantees Creator Membership

**Verify Trigger Exists:**
```sql
-- This should already exist from 20251214010520, but verify:
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgrelid = 'public.trips'::regclass 
AND tgname = 'ensure_creator_membership';

-- If missing, recreate:
CREATE TRIGGER ensure_creator_membership
AFTER INSERT ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.ensure_creator_is_member();
```

**Backfill Existing Trips:**
```sql
-- Ensure ALL existing trips have their creators as members
INSERT INTO public.trip_members (trip_id, user_id, role, status)
SELECT 
  t.id,
  t.created_by,
  'admin',
  'active'
FROM public.trips t
WHERE NOT EXISTS (
  SELECT 1 FROM public.trip_members tm
  WHERE tm.trip_id = t.id AND tm.user_id = t.created_by
)
ON CONFLICT (trip_id, user_id) DO NOTHING;
```

---

### **PHASE 3: Fix Auth Race Conditions in Data Loading** (HIGH PRIORITY)

#### 3.1 Ensure Auth is Truly Ready Before Queries

```typescript
// src/hooks/useTripDetailData.ts

// CHANGE: Don't just check isAuthLoading - also verify session is valid
const { user, session, isLoading: isAuthLoading } = useAuth();

// NEW: Add session validation
const [sessionValid, setSessionValid] = useState<boolean | null>(null);

useEffect(() => {
  if (!isAuthLoading && session) {
    // Validate session has required claims
    try {
      const token = session.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (payload.sub && payload.sub === session.user.id) {
        setSessionValid(true);
      } else {
        console.error('[useTripDetailData] Invalid session - missing or mismatched sub claim');
        setSessionValid(false);
      }
    } catch (e) {
      console.error('[useTripDetailData] Token validation failed:', e);
      setSessionValid(false);
    }
  } else if (!isAuthLoading && !session) {
    setSessionValid(false);
  }
}, [isAuthLoading, session]);

// CHANGE: Gate queries on sessionValid too
const isQueryEnabled = 
  !!tripId && 
  !shouldUseDemoPath && 
  !isAuthLoading && 
  sessionValid === true && // NEW: Must be explicitly true
  !!session?.user?.id; // Use session.user.id directly
```

#### 3.2 Add Retry Logic for Transient Auth Failures

```typescript
const tripQuery = useQuery({
  queryKey: [...tripKeys.detail(tripId!), session?.user?.id],
  queryFn: async () => {
    // RETRY AUTH if first attempt fails with 403
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const data = await tripService.getTripById(tripId!);
        return data;
      } catch (error) {
        if (error instanceof Error && error.message.includes('AUTH_REQUIRED')) {
          attempts++;
          if (attempts < maxAttempts) {
            console.warn(`[useTripDetailData] Auth failed, refreshing session (attempt ${attempts}/${maxAttempts})`);
            await supabase.auth.refreshSession();
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }
        throw error;
      }
    }
    
    throw new Error('AUTH_REQUIRED');
  },
  enabled: isQueryEnabled,
  // ... rest of config
});
```

---

### **PHASE 4: Implement Granular Error Handling** (MEDIUM PRIORITY)

#### 4.1 Create Error Taxonomy

```typescript
// src/types/tripErrors.ts
export type TripErrorCode = 
  | 'AUTH_REQUIRED' // User not logged in
  | 'AUTH_INVALID' // Token is malformed/expired
  | 'ACCESS_DENIED' // User authenticated but not authorized
  | 'TRIP_NOT_FOUND' // Trip doesn't exist
  | 'NETWORK_ERROR' // Connection issues
  | 'RLS_FILTERED' // Query returned empty due to RLS
  | 'UNKNOWN';

export class TripError extends Error {
  constructor(
    public code: TripErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'TripError';
  }
}
```

#### 4.2 Update tripService to Throw Specific Errors

```typescript
// src/services/tripService.ts
async getTripById(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .maybeSingle();

  if (error) {
    // Parse error code
    if (error.code === 'PGRST301') {
      throw new TripError('AUTH_REQUIRED', 'Authentication required to view trip', { tripId });
    }
    if (error.message.includes('JWT')) {
      throw new TripError('AUTH_INVALID', 'Session expired or invalid', { tripId });
    }
    throw new TripError('NETWORK_ERROR', `Database error: ${error.message}`, { tripId, error });
  }

  if (!data) {
    // RLS filtered or genuinely doesn't exist - try edge function to distinguish
    try {
      return await fetchTripByIdViaEdgeFunction(tripId);
    } catch (edgeError) {
      if (edgeError instanceof Error) {
        if (edgeError.message.includes('AUTH_REQUIRED')) {
          throw new TripError('AUTH_REQUIRED', 'Authentication required', { tripId });
        }
        if (edgeError.message.includes('ACCESS_DENIED')) {
          throw new TripError('ACCESS_DENIED', 'You do not have access to this trip', { tripId });
        }
        if (edgeError.message.includes('TRIP_NOT_FOUND')) {
          throw new TripError('TRIP_NOT_FOUND', 'Trip does not exist', { tripId });
        }
      }
      throw new TripError('UNKNOWN', 'Failed to load trip', { tripId, error: edgeError });
    }
  }

  return data;
}
```

#### 4.3 Display Specific Error Messages with Actions

```typescript
// src/pages/TripDetailDesktop.tsx

// REPLACE generic error handling with:
if (tripError) {
  const errorCode = (tripError as TripError).code || 'UNKNOWN';
  
  const errorConfig = {
    'AUTH_REQUIRED': {
      title: 'Please Sign In',
      message: 'You need to be logged in to view this trip.',
      icon: <LogIn className="w-12 h-12 text-blue-400" />,
      actions: [
        { label: 'Sign In', onClick: () => navigate(`/auth?mode=signin&returnTo=/trip/${tripId}`), primary: true },
        { label: 'Back', onClick: () => navigate('/'), primary: false }
      ]
    },
    'AUTH_INVALID': {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      icon: <RefreshCw className="w-12 h-12 text-yellow-400" />,
      actions: [
        { label: 'Refresh', onClick: async () => {
          await supabase.auth.refreshSession();
          queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId!) });
        }, primary: true },
        { label: 'Sign In', onClick: () => navigate('/auth'), primary: false }
      ]
    },
    'ACCESS_DENIED': {
      title: 'Access Denied',
      message: 'You don\'t have permission to view this trip. You may need to be invited.',
      icon: <Lock className="w-12 h-12 text-red-400" />,
      actions: [
        { label: 'Request Access', onClick: () => {/* Open request modal */}, primary: true },
        { label: 'Back to My Trips', onClick: () => navigate('/'), primary: false }
      ]
    },
    'TRIP_NOT_FOUND': {
      title: 'Trip Not Found',
      message: 'This trip doesn\'t exist or may have been deleted.',
      icon: <AlertCircle className="w-12 h-12 text-gray-400" />,
      actions: [
        { label: 'Back to My Trips', onClick: () => navigate('/'), primary: true }
      ]
    },
    'NETWORK_ERROR': {
      title: 'Connection Error',
      message: 'Could not connect to load trip data. Check your internet connection.',
      icon: <Wifi className="w-12 h-12 text-orange-400" />,
      actions: [
        { label: 'Try Again', onClick: () => {
          queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId!) });
        }, primary: true },
        { label: 'Back', onClick: () => navigate('/'), primary: false }
      ]
    },
    'UNKNOWN': {
      title: 'Couldn\'t Load Trip',
      message: 'An unexpected error occurred. Please try again.',
      icon: <AlertCircle className="w-12 h-12 text-red-400" />,
      actions: [
        { label: 'Try Again', onClick: () => {
          queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId!) });
        }, primary: true },
        { label: 'Back', onClick: () => navigate('/'), primary: false }
      ]
    }
  };
  
  const config = errorConfig[errorCode] || errorConfig['UNKNOWN'];
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        {config.icon}
        <h1 className="text-3xl font-bold text-white mb-4 mt-4">{config.title}</h1>
        <p className="text-gray-400 mb-6">{config.message}</p>
        <div className="flex gap-3 justify-center">
          {config.actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={action.primary 
                ? "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
                : "bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors"
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 4.4 Add Toast Notifications for Specific Errors

```typescript
// In useTripDetailData error handler:
const tripQuery = useQuery({
  // ...
  onError: (error) => {
    if (error instanceof TripError) {
      const toastConfig = {
        'AUTH_REQUIRED': () => toast.error('Please sign in to view this trip'),
        'AUTH_INVALID': () => toast.error('Your session expired. Refreshing...', {
          action: {
            label: 'Refresh Now',
            onClick: async () => {
              await supabase.auth.refreshSession();
              queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId!) });
            }
          }
        }),
        'ACCESS_DENIED': () => toast.error('You don\'t have access to this trip'),
        'TRIP_NOT_FOUND': () => toast.error('Trip not found'),
        'NETWORK_ERROR': () => toast.error('Connection error. Check your internet.'),
        'UNKNOWN': () => toast.error('Failed to load trip. Please try again.')
      };
      
      const showToast = toastConfig[error.code] || toastConfig['UNKNOWN'];
      showToast();
    }
  }
});
```

---

### **PHASE 5: Add Diagnostic Logging** (LOW PRIORITY - Dev/Debug Only)

#### 5.1 Auth State Logger

```typescript
// src/utils/authDebug.ts
export const logAuthState = (context: string) => {
  if (import.meta.env.DEV) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          console.log(`[AUTH DEBUG - ${context}]`, {
            hasSub: !!payload.sub,
            sub: payload.sub?.slice(0, 8),
            userId: session.user.id.slice(0, 8),
            exp: new Date(payload.exp * 1000).toISOString(),
            isExpired: Date.now() > payload.exp * 1000,
            issuer: payload.iss
          });
        } catch (e) {
          console.error(`[AUTH DEBUG - ${context}] Token parse failed:`, e);
        }
      } else {
        console.warn(`[AUTH DEBUG - ${context}] No session`);
      }
    });
  }
};

// Use in key locations:
// useTripDetailData mount
// useAuth session changes
// Before critical queries
```

#### 5.2 RLS Explain Analyzer (Dev Tool)

```typescript
// src/utils/rlsDebug.ts
export const explainTripQuery = async (tripId: string) => {
  if (import.meta.env.DEV) {
    const { data, error } = await supabase.rpc('explain_trip_query', { trip_id: tripId });
    console.log('[RLS EXPLAIN]', data);
  }
};

// Requires SQL function:
CREATE OR REPLACE FUNCTION explain_trip_query(trip_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text;
BEGIN
  EXECUTE 'EXPLAIN (ANALYZE, VERBOSE, BUFFERS) SELECT * FROM trips WHERE id = $1'
  INTO result
  USING trip_id;
  RETURN result;
END;
$$;
```

---

## Implementation Order & Risk Assessment

### Phase 1: Auth Token Fixes (CRITICAL - DO FIRST)
**Estimated Time:** 2-3 hours
**Risk:** LOW - Defensive changes, won't break existing functionality
**Impact:** HIGH - Fixes root cause of 80%+ of trip loading failures
**Files Changed:**
- `src/hooks/useAuth.tsx` (add token validation)
- `src/App.tsx` (add session validation on mount)
- `src/integrations/supabase/client.ts` (add interceptor)

### Phase 2: RLS Simplification (HIGH PRIORITY - DO SECOND)
**Estimated Time:** 1-2 hours
**Risk:** MEDIUM - Requires migration, test on staging first
**Impact:** HIGH - Eliminates policy conflicts, improves performance
**Files Changed:**
- New migration: `20260126000000_simplify_trips_rls.sql`
- No code changes needed (RLS is server-side)

### Phase 3: Auth Race Condition Fixes (HIGH PRIORITY - DO THIRD)
**Estimated Time:** 2-3 hours
**Risk:** MEDIUM - Changes core data loading logic
**Impact:** MEDIUM - Fixes ~15% of edge case failures
**Files Changed:**
- `src/hooks/useTripDetailData.ts`
- `src/hooks/useProTrips.ts`
- `src/hooks/useEvents.ts`

### Phase 4: Error Handling (MEDIUM PRIORITY - DO FOURTH)
**Estimated Time:** 3-4 hours
**Risk:** LOW - Additive changes
**Impact:** HIGH - Dramatically improves user experience
**Files Changed:**
- `src/types/tripErrors.ts` (new)
- `src/services/tripService.ts`
- `src/pages/TripDetailDesktop.tsx`
- `src/pages/ProTripDetailDesktop.tsx`
- `src/pages/MobileTripDetail.tsx`
- `src/pages/MobileProTripDetail.tsx`

### Phase 5: Diagnostic Logging (LOW PRIORITY - OPTIONAL)
**Estimated Time:** 1 hour
**Risk:** NONE - Dev-only
**Impact:** LOW - Helps with future debugging
**Files Changed:**
- `src/utils/authDebug.ts` (new)
- `src/utils/rlsDebug.ts` (new)

---

## Testing Strategy

### Pre-Implementation Testing
1. **Reproduce Issue Reliably:**
   - Create test user account
   - Clear localStorage
   - Try to load trip → should fail
   - Check console for "403: invalid claim: missing sub claim"

### Post-Phase 1 Testing
1. **Token Validation:**
   - Check console for "[Auth] Token missing sub claim" warnings
   - Verify auto-refresh triggers
   - Confirm trips load after refresh

### Post-Phase 2 Testing
1. **RLS Policy Test:**
   ```sql
   -- As creator
   SELECT * FROM trips WHERE id = 'test-trip-id'; -- Should return 1 row
   
   -- As member
   SELECT * FROM trips WHERE id = 'test-trip-id'; -- Should return 1 row
   
   -- As non-member
   SELECT * FROM trips WHERE id = 'test-trip-id'; -- Should return 0 rows
   ```

2. **Performance Test:**
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM trips 
   WHERE id = 'test-trip-id';
   -- Should show single policy evaluation, not 3+
   ```

### Post-Phase 3 Testing
1. **Race Condition Test:**
   - Slow down network in DevTools
   - Load trip detail page
   - Verify loading state → success (not timeout)

### Post-Phase 4 Testing
1. **Error Scenarios:**
   - Sign out → load trip → see "Please Sign In" (not "Trip Not Found")
   - Invalid trip ID → see "Trip Not Found" with correct icon
   - Network off → see "Connection Error"

---

## Rollback Plan

### If Phase 1 Causes Issues:
- Remove token validation logic
- Clear all users' localStorage (force re-auth)
- Revert to previous useAuth.tsx

### If Phase 2 Causes Issues:
- Rollback migration:
  ```sql
  -- Restore old policies (from previous migration)
  -- Re-enable all 3 SELECT policies
  ```

### If Phase 3 Causes Issues:
- Revert useTripDetailData.ts to previous version
- Users may still see some loading failures but won't be worse than current state

### If Phase 4 Causes Issues:
- Revert to generic error messages
- Remove TripError class
- Won't affect trip loading functionality

---

## Success Metrics

### Immediate (Phase 1-2):
- [ ] Zero "403: invalid claim: missing sub claim" errors in auth logs
- [ ] Trip list loads successfully (baseline)
- [ ] 95%+ trip detail loads succeed on first attempt

### Short-term (Phase 3-4):
- [ ] Average trip load time <1 second
- [ ] Zero "Trip Not Found" errors for authenticated users on their own trips
- [ ] All error messages are specific and actionable

### Long-term:
- [ ] <0.1% trip load failure rate
- [ ] No Sentry errors related to trip loading
- [ ] User reports "can't see trip" reduced to zero

---

## Technical Debt Addressed

1. **Multiple RLS Policies** → Consolidated to single policy
2. **Auth State Complexity** → Added validation layer
3. **Generic Error Messages** → Specific error taxonomy
4. **No Retry Logic** → Graceful retry on transient failures
5. **Race Conditions** → Explicit session validation gates

---

## Files That Will Be Modified

### Phase 1 (Auth Fixes):
1. `src/hooks/useAuth.tsx` - Add token validation
2. `src/App.tsx` - Add mount-time session check
3. `src/integrations/supabase/client.ts` - Add request interceptor

### Phase 2 (RLS):
1. `supabase/migrations/20260126000000_simplify_trips_rls.sql` - New migration

### Phase 3 (Race Conditions):
1. `src/hooks/useTripDetailData.ts` - Add session validation
2. `src/hooks/useProTrips.ts` - Mirror changes
3. `src/hooks/useEvents.ts` - Mirror changes

### Phase 4 (Error Handling):
1. `src/types/tripErrors.ts` - New file
2. `src/services/tripService.ts` - Throw specific errors
3. `src/pages/TripDetailDesktop.tsx` - Specific error UI
4. `src/pages/ProTripDetailDesktop.tsx` - Specific error UI
5. `src/pages/MobileTripDetail.tsx` - Specific error UI
6. `src/pages/MobileProTripDetail.tsx` - Specific error UI

### Phase 5 (Diagnostics - Optional):
1. `src/utils/authDebug.ts` - New file
2. `src/utils/rlsDebug.ts` - New file

---

## Recommendation

**Start with Phase 1 only** - this will likely fix 80%+ of the issues since the auth logs clearly show JWT token problems. After deploying Phase 1:

1. Monitor for 24 hours
2. Check if "403: invalid claim" errors disappear
3. If trips still fail to load, proceed to Phase 2
4. Once loading is reliable, implement Phase 4 for better UX

**Do NOT implement all phases at once** - this makes it impossible to identify which change fixed or broke what.
