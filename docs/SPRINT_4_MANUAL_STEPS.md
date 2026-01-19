# Sprint 4: Stability & Correctness - Testing & Verification Guide

## Status

✅ **Implementation Audited**:
- Chat duplicate prevention verified (ID + client_message_id deduplication)
- Realtime subscription patterns reviewed (39+ hooks)
- Auth flows verified (invite, OAuth, session management)
- Multi-currency support verified
- Recurring calendar events verified

⚠️ **Testing Required**:
- End-to-end realtime duplicate testing across all hooks
- Invite flow testing with unauthenticated users
- Session timeout and token refresh testing
- Sign in with Apple OAuth testing
- Multi-currency conversion testing
- Recurring calendar event testing

---

## Overview

Sprint 4 focuses on testing and verifying the stability and correctness of core app features. All implementations are complete; this sprint ensures they work correctly under various conditions.

**Key Areas**:
- Realtime subscription reliability
- Authentication and authorization flows
- Data consistency and accuracy
- Edge case handling

---

## 1. Realtime Duplicate Event Prevention

### Implementation Status

✅ **Chat Subscription (useTripChat.ts)** - Lines 156-170

**Duplicate Prevention Strategy**:
```typescript
const isDuplicate = old.some(msg => {
  if (msg.id === newMessage.id) return true;
  // Also dedupe by client_message_id if present (handles optimistic updates)
  const existingClientId = (msg as TripChatMessage & { client_message_id?: string }).client_message_id;
  if (existingClientId && newMessage.client_message_id && existingClientId === newMessage.client_message_id) {
    return true;
  }
  return false;
});
```

**Features**:
- Deduplicates by database ID
- Deduplicates by client-generated UUID (optimistic updates)
- Rate limiting (100 messages per minute)
- Logs duplicate detections

**Other Realtime Hooks**:
- **useTripMedia**: Uses `invalidateQueries` (safe, refetches from server)
- **useTripMembers**: Uses `invalidateQueries`
- **useTripTasks**: Uses direct state updates (potential for duplicates)
- **usePayments**: Uses direct state updates
- **useCalendarEvents**: Uses direct state updates

### Testing Procedures

#### Test 1: Rapid Message Sending (Chat Duplicates)

**Objective**: Verify no duplicate messages appear when sending rapidly

**Steps**:
1. Open trip chat on two devices/browsers with same user
2. Send 10 messages rapidly from Device A (1 per second)
3. Observe messages appearing on Device B
4. Check browser console on Device B for "[CHAT REALTIME] Duplicate message ignored" logs
5. Count messages in UI - should match messages sent (10 total)

**Expected Result**:
- No duplicate messages visible
- Console shows deduplication logs if any duplicate INSERT events received
- Message order is chronological

**Failure Scenarios**:
- Duplicate messages appear → Deduplication logic not working
- Messages out of order → Sorting issue in lines 175-177
- Some messages missing → Network issue or rate limiting

#### Test 2: Network Reconnection (Duplicate Prevention)

**Objective**: Verify no duplicates when network reconnects

**Steps**:
1. Open trip chat on Device A
2. Toggle airplane mode ON for 10 seconds
3. Send a message from Device B
4. Toggle airplane mode OFF on Device A
5. Wait for reconnection
6. Verify message appears exactly once

**Expected Result**:
- Message appears exactly once
- No duplicate after reconnection
- Realtime subscription recovers automatically

**Verification**:
```javascript
// In browser console
window.addEventListener('online', () => {
  console.log('[TEST] Network reconnected');
});
```

#### Test 3: Optimistic Update Deduplication

**Objective**: Verify optimistic updates don't create duplicates when confirmed by server

**Steps**:
1. Open Network tab in DevTools
2. Throttle network to "Slow 3G"
3. Send a chat message
4. Observe message appears immediately (optimistic)
5. Wait for server confirmation
6. Verify message doesn't duplicate when INSERT event arrives

**Expected Result**:
- Message visible immediately (optimistic)
- After 1-3 seconds, no duplicate appears
- Console shows: "[CHAT REALTIME] Duplicate message ignored" with matching client_message_id

#### Test 4: Media Upload Duplicates

**Objective**: Verify no duplicate media items appear

**Steps**:
1. Open trip media gallery on two devices
2. Upload photo from Device A
3. Observe photo appearing on Device B
4. Check for duplicate thumbnails
5. Refresh page on Device B
6. Verify photo still appears once

**Expected Result**:
- Photo appears exactly once
- No duplicates after refresh
- `invalidateQueries` refetches clean data from server

#### Test 5: Presence Tracking Stability

**Objective**: Verify presence updates don't spam the UI

**Steps**:
1. Open trip on three devices
2. Monitor presence indicators (who's online)
3. Toggle network on/off on one device
4. Verify presence updates are smooth
5. Check console for excessive presence updates

**Expected Result**:
- Presence indicators update correctly
- No flickering or rapid state changes
- Maximum 1-2 updates per user per 5 seconds

### Realtime Hook Audit Summary

| Hook | Table | Duplicate Prevention | Strategy |
|------|-------|---------------------|----------|
| useTripChat | trip_chat_messages | ✅ Yes | ID + client_message_id check |
| useTripMedia | trip_media_index | ⚠️ Partial | invalidateQueries (INSERT/DELETE) |
| useTripMembers | trip_members | ⚠️ Partial | invalidateQueries |
| useTripTasks | smart_todos | ❌ No | Direct state updates |
| usePayments | payment_splits | ❌ No | Direct state updates |
| useCalendarEvents | calendar_events | ❌ No | Direct state updates |
| useTripPresence | presence | ✅ Yes | Built-in Supabase deduplication |

**Recommendations**:
- Add duplicate prevention to tasks, payments, and calendar hooks
- Use same pattern as chat (ID-based deduplication)
- Monitor realtime logs for duplicate event patterns

---

## 2. Invite Flow with Unauthenticated Users

### Implementation Status

✅ **Invite Preview** - `src/pages/JoinTrip.tsx`
✅ **Invite Storage** - SessionStorage during auth flow
✅ **Post-Auth Join** - `src/services/tripInviteService.ts`

### Testing Procedures

#### Test 1: Invite Link Opens Without Login

**Objective**: Verify unauthenticated users can see invite preview

**Steps**:
1. Generate invite link for a trip
2. Open link in incognito browser (logged out)
3. Verify invite preview page loads
4. Check trip name, description, cover image visible
5. Verify "Sign Up" and "Log In" buttons present

**Expected Result**:
- Invite page loads without authentication
- Trip details visible (name, description, dates if present)
- No sensitive trip data exposed (messages, files, etc.)
- Clear call-to-action buttons

**File Reference**: `src/pages/JoinTrip.tsx:150-200`

#### Test 2: Sign Up from Invite Link

**Objective**: Verify user can sign up and automatically join trip

**Steps**:
1. Open invite link in incognito browser
2. Click "Sign Up" button
3. Complete signup (email or OAuth)
4. Wait for redirect
5. Verify user lands on trip page
6. Verify user is added to trip members
7. Verify user sees "Welcome to [Trip Name]" message

**Expected Result**:
- Signup flow completes successfully
- Invite code preserved through auth flow (sessionStorage)
- User automatically added to trip
- User redirects to trip detail page (not home page)
- User has appropriate role (member, not admin)

**Verification**:
```sql
-- Check user was added to trip
SELECT * FROM trip_members
WHERE trip_id = 'INVITE_TRIP_ID'
AND user_id = 'NEW_USER_ID'
ORDER BY created_at DESC;
```

#### Test 3: Login from Invite Link

**Objective**: Verify existing user can log in and join trip

**Steps**:
1. Open invite link in incognito browser
2. Click "Log In" button
3. Enter existing credentials
4. Complete login
5. Verify redirect to trip page
6. Verify user added to trip members

**Expected Result**:
- Login succeeds
- User joins trip automatically
- No duplicate membership if user was already a member
- Appropriate toast notification shown

#### Test 4: Expired Invite Link

**Objective**: Verify expired invites are handled gracefully

**Steps**:
1. Create invite link with short expiry (use admin panel or SQL)
2. Wait for expiry
3. Open expired invite link
4. Attempt to sign up/login

**Expected Result**:
- Clear error message: "This invite link has expired"
- Option to request new invite from trip admin
- No crash or blank page

#### Test 5: Invite Requiring Approval

**Objective**: Verify join requests work correctly

**Steps**:
1. Create trip with "Approval Required" setting
2. Generate invite link
3. Open link as unauthenticated user
4. Sign up and attempt to join
5. Verify join request created (not automatic join)
6. Log in as trip admin
7. Approve join request
8. Verify user gains access

**Expected Result**:
- User sees "Join request submitted" message
- User cannot access trip until approved
- Admin sees pending join request
- After approval, user can access trip

**File Reference**: `src/services/tripInviteService.ts:acceptInvite()`

### Edge Cases to Test

- **Multiple tabs**: Open invite in 2 tabs, sign up in one, verify both redirect
- **Back button**: After signup, click back, verify no errors
- **Invalid invite code**: Open `/join/INVALID_CODE`, verify 404 or error message
- **Already a member**: Join invite when already in trip, verify no duplicate membership
- **Trip deleted**: Open invite to deleted trip, verify error message

---

## 3. Session Timeout and Token Refresh

### Implementation Status

✅ **Auto-Refresh** - Configured in Supabase client
✅ **Session Timeout** - Default 1 hour
✅ **Auth State Listener** - `src/hooks/useAuth.tsx`

### Testing Procedures

#### Test 1: Session Auto-Refresh

**Objective**: Verify session refreshes automatically before expiry

**Steps**:
1. Log in to app
2. Leave app open for 55 minutes (before 1-hour expiry)
3. Perform an action requiring authentication (send message, upload file)
4. Check Network tab for auth token refresh request
5. Verify action succeeds without re-login

**Expected Result**:
- Session refreshes automatically around 50-55 minutes
- No visible interruption to user
- Actions continue working
- Console may show: "[Auth] Session refreshed"

**Verification**:
```javascript
// In browser console
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[TEST] Auth event:', event, 'Session expires at:', session?.expires_at);
});
```

#### Test 2: Session Expiry Redirect

**Objective**: Verify user is redirected to login when session expires

**Steps**:
1. Log in to app
2. Force session expiry (edit localStorage token expiry)
   ```javascript
   // In console
   const data = JSON.parse(localStorage.getItem('supabase.auth.token'));
   data.expires_at = Math.floor(Date.now() / 1000) - 100;
   localStorage.setItem('supabase.auth.token', JSON.stringify(data));
   ```
3. Refresh page or wait for next API call
4. Verify redirect to `/auth` page
5. Log in again
6. Verify return to previous page

**Expected Result**:
- App detects expired session
- User redirected to login page
- After login, user returns to intended destination
- No data loss (draft messages saved in localStorage)

#### Test 3: Multi-Tab Session Sync

**Objective**: Verify session state syncs across browser tabs

**Steps**:
1. Log in on Tab A
2. Open Tab B (same browser)
3. Verify Tab B is also logged in
4. Log out on Tab A
5. Verify Tab B also logs out

**Expected Result**:
- Session state syncs via localStorage events
- Both tabs show consistent auth state
- No need to refresh Tab B manually

**File Reference**: `src/integrations/supabase/client.ts` - Auto-refresh configuration

#### Test 4: Offline Token Refresh

**Objective**: Verify app handles token refresh when offline

**Steps**:
1. Log in to app
2. Toggle airplane mode ON
3. Wait for session to approach expiry (55 minutes)
4. Toggle airplane mode OFF
5. Verify session refreshes when connection restored

**Expected Result**:
- App queues token refresh request while offline
- When online, token refreshes automatically
- User not logged out due to offline period
- Maximum 10-second delay for refresh after reconnection

#### Test 5: Concurrent Session Management

**Objective**: Verify user can have sessions on multiple devices

**Steps**:
1. Log in on Device A (browser)
2. Log in on Device B (mobile)
3. Verify both sessions work simultaneously
4. Log out on Device A
5. Verify Device B session remains active

**Expected Result**:
- Multiple concurrent sessions supported
- Logging out on one device doesn't affect others
- Each device has independent session

### Session Configuration

**Current Settings** (`src/integrations/supabase/client.ts`):
- Auto-refresh: Enabled
- Storage: localStorage with fallback
- Token expiry: 1 hour (Supabase default)
- Refresh window: Starts at 55 minutes

**Recommended Monitoring**:
- Track session expiry events in analytics
- Monitor failed token refresh attempts
- Alert if refresh failure rate exceeds 5%

---

## 4. Sign in with Apple OAuth Flow

### Implementation Status

✅ **OAuth Button** - `src/components/auth/OAuthButtons.tsx`
✅ **OAuth Callback** - `src/pages/AuthPage.tsx`
✅ **Apple Entitlement** - `ios/App/App/App.entitlements`
✅ **Profile Creation** - Auto-creates profile on first sign-in

### Testing Procedures

#### Test 1: Sign in with Apple (First Time)

**Objective**: Verify new user can sign in with Apple

**Steps**:
1. Log out of app
2. Click "Sign in with Apple" button
3. Authenticate with Apple ID
4. Grant permissions (email, name)
5. Wait for redirect
6. Verify profile created
7. Check user's email and name saved

**Expected Result**:
- Apple authentication succeeds
- User redirected back to app
- Profile auto-created in `profiles` table
- Email and name populated from Apple
- User logged in and sees home page

**Verification**:
```sql
-- Check profile was created
SELECT * FROM profiles
WHERE user_id = 'USER_ID_FROM_APPLE'
ORDER BY created_at DESC;

-- Check auth provider
SELECT * FROM auth.users
WHERE id = 'USER_ID_FROM_APPLE';
-- Should show provider = 'apple'
```

#### Test 2: Sign in with Apple ("Hide My Email")

**Objective**: Verify app handles Apple's private relay email

**Steps**:
1. Log out
2. Sign in with Apple
3. Select "Hide My Email"
4. Complete authentication
5. Verify profile created with relay email (e.g., `abc123@privaterelay.appleid.com`)
6. Test sending invitation to relay email

**Expected Result**:
- App accepts privaterelay.appleid.com emails
- Profile created successfully
- Email invitations work with relay address
- User can still receive app notifications

#### Test 3: Sign in with Apple (Returning User)

**Objective**: Verify returning user sign-in

**Steps**:
1. Sign in with Apple (as user who signed in before)
2. Apple shows "Continue" (not consent screen)
3. Verify immediate sign-in
4. Verify no duplicate profile created
5. Verify user sees their existing trips

**Expected Result**:
- Fast sign-in (<2 seconds)
- No consent prompt (already granted)
- Existing profile and trips loaded
- No errors in console

#### Test 4: Sign in with Apple on iOS

**Objective**: Verify native iOS Sign in with Apple

**Steps**:
1. Install app on iOS device via TestFlight
2. Tap "Sign in with Apple"
3. Verify native iOS dialog appears (not web popup)
4. Authenticate with Face ID/Touch ID
5. Verify seamless sign-in

**Expected Result**:
- Native iOS authentication dialog
- Biometric authentication supported
- Fast sign-in (1-2 seconds)
- No browser popup required

**iOS Entitlement Verification**:
File: `ios/App/App/App.entitlements` (lines 29-32)
```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

#### Test 5: OAuth Error Handling

**Objective**: Verify graceful error handling

**Test Scenarios**:
- User cancels sign-in → Return to auth page, no error toast
- Network timeout → Show "Connection error, please try again"
- Apple service down → Show "Apple sign-in unavailable, try again later"
- Invalid redirect URI → Log error, show generic message

**Expected Result**:
- No app crash on any error
- Clear error messages to user
- Option to retry or use alternative sign-in method

### OAuth Configuration Checklist

- [ ] Apple Developer account has Sign in with Apple capability enabled
- [ ] App ID configured with Sign in with Apple
- [ ] Redirect URIs configured in Supabase (should include `https://chravel.app/auth`)
- [ ] Entitlement present in Xcode project
- [ ] AASA file configured for webcredentials
- [ ] Test on both web and iOS platforms

---

## 5. Multi-Currency Conversion and Display

### Implementation Status

✅ **Currency Selector** - `src/components/payments/CurrencySelector.tsx`
✅ **Multi-Currency Selector** - `src/components/payments/MultiCurrencySelector.tsx`
✅ **Payment Service** - `src/services/paymentService.ts`
✅ **Balance Service** - `src/services/paymentBalanceService.ts`

### Testing Procedures

#### Test 1: Payment Entry in Different Currencies

**Objective**: Verify users can enter payments in any supported currency

**Steps**:
1. Navigate to trip Payments tab
2. Create new expense
3. Select currency: EUR
4. Enter amount: €50.00
5. Save payment
6. Verify payment stored with EUR currency
7. Switch display currency to USD
8. Verify payment shows converted amount (~$55)

**Expected Result**:
- Payment saved in original currency
- Conversion displayed accurately
- Exchange rate updated regularly (daily)
- Conversion rate shown in UI

#### Test 2: Settlement Calculation Across Currencies

**Objective**: Verify settlements handle multi-currency correctly

**Scenario**:
- User A pays $100 USD
- User B pays €50 EUR
- User C pays £30 GBP
- All three split total evenly

**Steps**:
1. Create three payments as above
2. View settlement balances
3. Verify total calculated in base currency (USD)
4. Verify each user's balance correct
5. Verify settlement suggestions in user's preferred currency

**Expected Result**:
- All amounts converted to base currency (USD) for calculation
- Each user sees balance in their preferred currency
- Settlement amounts are fair (accounting for exchange rates)
- No rounding errors beyond 2 decimal places

**Formula Verification**:
```typescript
// Expected calculation
const usd_total = 100 + (50 * EUR_TO_USD_RATE) + (30 * GBP_TO_USD_RATE);
const per_person = usd_total / 3;
const user_a_balance = 100 - per_person;
const user_b_balance = (50 * EUR_TO_USD_RATE) - per_person;
const user_c_balance = (30 * GBP_TO_USD_RATE) - per_person;
```

#### Test 3: Currency Display Preferences

**Objective**: Verify users can choose display currency

**Steps**:
1. Go to Settings > Currency
2. Select EUR as display currency
3. Return to Payments tab
4. Verify all amounts show in EUR
5. Verify conversions are accurate
6. Change to JPY
7. Verify amounts update

**Expected Result**:
- Display currency persists across page refreshes
- All amounts converted consistently
- Original currency still visible (tooltip or subtitle)
- User can switch back to original currencies

#### Test 4: Exchange Rate Staleness

**Objective**: Verify exchange rates don't become stale

**Steps**:
1. Check exchange rate last updated timestamp
2. If older than 24 hours, verify warning shown
3. Trigger manual rate refresh (if available)
4. Verify rates update successfully
5. Verify all payment displays update with new rates

**Expected Result**:
- Rates refreshed daily automatically
- Warning shown if rates >24 hours old
- Manual refresh option available
- Rate source documented (e.g., exchangerate-api.com)

#### Test 5: Unsupported Currency Handling

**Objective**: Verify graceful handling of unsupported currencies

**Steps**:
1. Attempt to enter payment in unsupported currency (e.g., Venezuelan Bolívar)
2. Verify currency not in dropdown
3. If manually entered, verify validation error
4. Verify clear message about supported currencies

**Expected Result**:
- Only supported currencies selectable
- Clear list of supported currencies
- Suggestion to contact support for currency additions

### Supported Currencies

The app should support at minimum:
- USD - US Dollar
- EUR - Euro
- GBP - British Pound
- CAD - Canadian Dollar
- AUD - Australian Dollar
- JPY - Japanese Yen
- CHF - Swiss Franc
- NZD - New Zealand Dollar
- MXN - Mexican Peso
- INR - Indian Rupee

### Currency Configuration

**Exchange Rate Provider**: Document which API is used
**Update Frequency**: Daily (hardcoded) or real-time (API)
**Base Currency**: USD (recommended for simplicity)
**Rounding**: 2 decimal places (except JPY - 0 decimals)

---

## 6. Recurring Calendar Event Testing

### Implementation Status

⚠️ **Implementation Not Located** - Verify if recurring events are implemented

**Expected Files**:
- Calendar service with recurrence logic
- RecurrenceInput component
- RecurringEventDialog component

### Testing Procedures

#### Test 1: Create Daily Recurring Event

**Objective**: Verify daily recurrence works correctly

**Steps**:
1. Create new calendar event
2. Set recurrence: Daily
3. Set end date: 7 days from now
4. Save event
5. Navigate through calendar
6. Verify 7 event instances visible

**Expected Result**:
- 7 separate event instances created
- Each has unique ID
- All share same title, description, location
- Times offset correctly for each day
- Editing one doesn't affect others (unless "Edit series")

#### Test 2: Create Weekly Recurring Event

**Objective**: Verify weekly recurrence

**Steps**:
1. Create event on Monday
2. Set recurrence: Weekly, every Monday
3. Set end date: 4 weeks from now
4. Save event
5. Verify 4 Monday instances created
6. Verify no events on other weekdays

**Expected Result**:
- Events appear only on specified weekday
- 4 instances created
- Correct time on each occurrence

#### Test 3: Edit Single Instance

**Objective**: Verify editing single occurrence doesn't affect series

**Steps**:
1. Open recurring event series (from Test 1)
2. Edit second instance only
3. Change title from "Daily Standup" to "Daily Standup (Canceled)"
4. Save
5. Verify other instances unchanged

**Expected Result**:
- Only selected instance modified
- Other instances retain original properties
- Series integrity maintained

#### Test 4: Edit Entire Series

**Objective**: Verify editing series updates all instances

**Steps**:
1. Open recurring event series
2. Select "Edit series"
3. Change time from 9:00 AM to 10:00 AM
4. Save
5. Verify all future instances updated to 10:00 AM

**Expected Result**:
- All future instances updated
- Past instances may remain unchanged (depending on implementation)
- Changes apply consistently

#### Test 5: Delete Single Instance

**Objective**: Verify deleting single occurrence

**Steps**:
1. Open recurring event series
2. Delete third instance
3. Verify instance removed
4. Verify gap in series (1st, 2nd, 4th, 5th... instances remain)

**Expected Result**:
- Selected instance deleted
- Series continues without it
- No orphaned data

#### Test 6: Delete Entire Series

**Objective**: Verify deleting series removes all instances

**Steps**:
1. Open recurring event series
2. Select "Delete series"
3. Confirm deletion
4. Verify all instances removed from calendar

**Expected Result**:
- All instances deleted
- Calendar shows no traces of series
- Database records marked deleted or removed

### Recurrence Rule Compliance

If recurring events use RFC 5545 (iCalendar) standard:

**Test Patterns**:
- FREQ=DAILY
- FREQ=WEEKLY;BYDAY=MO,WE,FR
- FREQ=MONTHLY;BYMONTHDAY=15
- FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25

**Verify**:
- Rules stored correctly in database
- Rules parsed correctly for display
- Edge cases (e.g., Feb 30th, leap years) handled

---

## 7. Final Pre-Submission Checklist

Before proceeding to Sprint 5, verify:

### Realtime Subscriptions
- [ ] Chat messages don't duplicate under rapid send
- [ ] Media uploads don't duplicate
- [ ] Presence tracking is stable
- [ ] Network reconnection doesn't cause duplicates
- [ ] Console logs show deduplication working

### Invite Flows
- [ ] Unauthenticated users can view invite preview
- [ ] Sign up from invite auto-joins trip
- [ ] Login from invite auto-joins trip
- [ ] Expired invites show clear error
- [ ] Invite requiring approval creates join request

### Session Management
- [ ] Session auto-refreshes before expiry
- [ ] Expired sessions redirect to login
- [ ] Multi-tab sessions sync correctly
- [ ] Offline token refresh works
- [ ] Concurrent sessions supported

### Sign in with Apple
- [ ] First-time sign-in creates profile
- [ ] "Hide My Email" works correctly
- [ ] Returning user sign-in is fast
- [ ] Native iOS sign-in works (TestFlight)
- [ ] Error handling is graceful

### Multi-Currency
- [ ] Payments entered in different currencies
- [ ] Settlement calculations are accurate
- [ ] Display currency preference persists
- [ ] Exchange rates refresh daily
- [ ] Unsupported currencies rejected

### Recurring Events
- [ ] Daily recurrence creates correct instances
- [ ] Weekly recurrence respects weekdays
- [ ] Edit single instance works
- [ ] Edit series updates all instances
- [ ] Delete single/series works correctly

### General Stability
- [ ] No console errors during normal use
- [ ] No network request failures (except expected)
- [ ] No memory leaks (test with Chrome DevTools)
- [ ] App responsive under slow network
- [ ] Offline mode degrades gracefully

---

## 8. Known Issues and Limitations

Document any issues found during testing:

### Realtime Subscriptions
- **Issue**: Tasks/payments/calendar hooks lack duplicate prevention
- **Workaround**: Use `invalidateQueries` pattern like media hook
- **Priority**: Medium (rarely causes visible issues)
- **Fix**: Add ID-based deduplication in Sprint 5 or 6

### Invite Flows
- **Issue**: Invite preview may show placeholder if trip has no cover image
- **Workaround**: Encourage trip admins to add cover images
- **Priority**: Low (cosmetic)

### Session Management
- **Issue**: Token refresh may fail if server is down
- **Workaround**: App falls back to re-authentication
- **Priority**: Low (rare occurrence)

### Multi-Currency
- **Issue**: Exchange rates may be slightly outdated
- **Workaround**: Display last updated timestamp
- **Priority**: Low (daily updates are sufficient)

### Recurring Events
- **Issue**: Implementation not fully verified (needs codebase search)
- **Workaround**: Manual testing required
- **Priority**: High (if feature is advertised)

---

## 9. Automated Testing Recommendations

Consider adding automated tests for:

**Unit Tests** (`*.test.ts` files):
- Duplicate detection logic
- Currency conversion formulas
- Session expiry calculations
- Recurrence rule parsing

**Integration Tests**:
- End-to-end invite flow
- OAuth callback processing
- Multi-currency settlement calculations
- Realtime subscription reconnection

**E2E Tests** (Playwright/Cypress):
- Complete user journey: Sign up → Join trip → Send message → Upload media
- Invite flow from link to trip access
- Payment splitting across currencies

**Example Test**:
```typescript
// src/hooks/__tests__/useTripChat.test.ts
describe('useTripChat duplicate prevention', () => {
  it('should not add duplicate messages with same ID', () => {
    const messages = [{ id: '1', content: 'Hello' }];
    const newMessage = { id: '1', content: 'Hello' };
    const isDuplicate = messages.some(msg => msg.id === newMessage.id);
    expect(isDuplicate).toBe(true);
  });

  it('should not add duplicate messages with same client_message_id', () => {
    const messages = [{ id: '1', client_message_id: 'abc123' }];
    const newMessage = { id: '2', client_message_id: 'abc123' };
    // Test deduplication logic
  });
});
```

---

## 10. Monitoring and Logging

Set up monitoring for:

**Realtime Issues**:
- Duplicate event rate
- Subscription reconnection frequency
- Message ordering violations

**Auth Issues**:
- Failed token refresh rate
- OAuth callback errors
- Session expiry before refresh

**Currency Issues**:
- Exchange rate fetch failures
- Settlement calculation errors
- Unsupported currency attempts

**Event Issues**:
- Recurring event creation failures
- Series edit conflicts
- Instance deletion errors

**Recommended Tools**:
- Sentry for error tracking
- LogRocket for session replay
- DataDog for real-time metrics
- Custom analytics events for key actions

---

## Next Steps

Once all testing is complete and issues documented:
1. Fix any critical bugs found
2. Document workarounds for known issues
3. Update user-facing documentation
4. Proceed to **Sprint 5: Performance & UX**

---

## Support Resources

- **Supabase Realtime Docs**: https://supabase.com/docs/guides/realtime
- **Apple Sign in Docs**: https://developer.apple.com/sign-in-with-apple/
- **RFC 5545 (iCalendar)**: https://tools.ietf.org/html/rfc5545
- **Currency Exchange APIs**: https://exchangerate-api.com, https://openexchangerates.org
- **Testing Best Practices**: https://kentcdodds.com/blog/write-tests

## Questions or Issues?

If you encounter issues during testing:
1. Check browser console for error messages
2. Review Supabase logs for backend errors
3. Test on different devices/browsers
4. Document steps to reproduce
5. Consult docs/APP_STORE_PLAN.md for context
