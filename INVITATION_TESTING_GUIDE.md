# 🧪 Trip Invitation Testing Guide

## Overview

This guide provides comprehensive testing procedures for the trip invitation bug fixes. Follow these steps to ensure all fixes are working correctly before deploying to production.

---

## 🎯 Testing Objectives

1. Verify invite generation works without errors
2. Ensure no race conditions occur during concurrent invite creation
3. Confirm proper error handling and user-friendly messages
4. Validate database integrity (FK constraints, indexes)
5. Test end-to-end invitation flow from creation to joining

---

## 📋 Pre-Deployment Testing Checklist

### ✅ Environment Setup

- [ ] Deployed to staging environment
- [ ] Database migration applied successfully
- [ ] Edge function deployed
- [ ] Frontend code deployed
- [ ] Test accounts created (minimum 3 users)

### ✅ Database Verification

```sql
-- 1. Check foreign key constraint exists
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE conname = 'trip_invites_trip_id_fkey';

-- Expected: 1 row showing the FK constraint

-- 2. Check for orphaned invites (should be 0)
SELECT COUNT(*) as orphaned_count
FROM trip_invites
WHERE trip_id NOT IN (SELECT id FROM trips);

-- Expected: 0

-- 3. Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'trip_invites'
AND indexname IN (
    'idx_trip_invites_trip_id',
    'idx_trip_invites_active_by_trip',
    'idx_trip_invites_code'
);

-- Expected: 3 rows

-- 4. Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'trip_invites';

-- Expected: 5 policies
```

---

## 🧪 Functional Testing

### Test Case 1: Basic Invite Generation

**Objective**: Verify invite can be created successfully

**Steps**:
1. Log in as User A
2. Create a new trip
3. Open invite modal
4. Generate invite link
5. Copy invite link

**Expected Results**:
- ✅ Invite link generated within 2 seconds
- ✅ Link format: `https://p.chravel.app/j/chravel{8_chars}`
- ✅ Success toast message appears
- ✅ Link can be copied to clipboard

**SQL Verification**:
```sql
-- Check invite was created in database
SELECT id, code, trip_id, created_by, is_active, require_approval
FROM trip_invites
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Test Case 2: Invite with Approval Required

**Objective**: Verify invite with approval flag works

**Steps**:
1. Create trip as User A
2. Generate invite with "Require Approval" enabled
3. User B clicks invite link
4. User B requests to join
5. User A approves request

**Expected Results**:
- ✅ Invite created with `require_approval = true`
- ✅ User B sees "Request to Join" button
- ✅ User A receives join request notification
- ✅ After approval, User B becomes trip member

---

### Test Case 3: Invite with 7-Day Expiration

**Objective**: Verify expiration works correctly

**Steps**:
1. Create invite with "Expire in 7 days" enabled
2. Check database for `expires_at` timestamp
3. Attempt to use invite immediately (should work)
4. Manually set `expires_at` to past date
5. Attempt to use expired invite

**Expected Results**:
- ✅ `expires_at` set to now + 7 days
- ✅ Fresh invite works
- ✅ Expired invite shows error: "Invite Link Expired"
- ✅ Error message includes action hint

**SQL to test expiration**:
```sql
-- Manually expire an invite for testing
UPDATE trip_invites
SET expires_at = NOW() - INTERVAL '1 day'
WHERE code = 'YOUR_INVITE_CODE';

-- Verify
SELECT code, is_active, expires_at < NOW() as is_expired
FROM trip_invites
WHERE code = 'YOUR_INVITE_CODE';
```

---

### Test Case 4: Race Condition Prevention

**Objective**: Ensure no duplicate invites created under load

**Steps**:
1. Use tool like Apache Bench or custom script to create 100 concurrent invite requests
2. Check database for duplicate codes
3. Verify all requests completed successfully

**Test Script** (`test-race-condition.sh`):
```bash
#!/bin/bash

# Test concurrent invite creation
TRIP_ID="your-trip-id"
AUTH_TOKEN="your-auth-token"
PROJECT_URL="https://your-project.supabase.co"

echo "Testing concurrent invite generation..."

# Create 100 concurrent requests
for i in {1..100}; do
  curl -X POST "$PROJECT_URL/functions/v1/generate-invite-code" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"tripId\":\"$TRIP_ID\",\"requireApproval\":false,\"expiresIn7Days\":false}" \
    > /dev/null 2>&1 &
done

wait  # Wait for all requests to complete

echo "Done! Check database for results."
```

**SQL Verification**:
```sql
-- Check for duplicate codes (should be 0)
SELECT code, COUNT(*) as count
FROM trip_invites
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY code
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- Count successful invites
SELECT COUNT(*) as successful_invites
FROM trip_invites
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Expected: ~100 (some may have same code but were deduplicated)
```

---

### Test Case 5: Foreign Key Constraint

**Objective**: Verify FK prevents orphaned invites

**Steps**:
1. Create trip and invite
2. Attempt to delete trip via database (use CASCADE)
3. Verify invite was also deleted

**SQL Test**:
```sql
-- Create test trip
INSERT INTO trips (id, name, created_by)
VALUES ('test-trip-fk', 'FK Test Trip', 'your-user-id');

-- Create invite for test trip
INSERT INTO trip_invites (trip_id, code, created_by, is_active)
VALUES ('test-trip-fk', 'test-fk-code', 'your-user-id', true);

-- Verify invite exists
SELECT COUNT(*) FROM trip_invites WHERE trip_id = 'test-trip-fk';
-- Expected: 1

-- Delete trip (should cascade to invites)
DELETE FROM trips WHERE id = 'test-trip-fk';

-- Verify invite was deleted
SELECT COUNT(*) FROM trip_invites WHERE trip_id = 'test-trip-fk';
-- Expected: 0 (CASCADE worked!)
```

---

### Test Case 6: RLS Policy Access

**Objective**: Verify RLS policies allow proper access

**Steps**:
1. User A creates trip and invite
2. User B (not a member) tries to query `trip_invites` directly
3. User B uses edge function to view invite preview
4. User A views invite in dashboard

**Expected Results**:
- ✅ User B direct query returns empty (RLS blocks)
- ✅ User B edge function works (service role bypasses RLS)
- ✅ User A can see invite in dashboard

**SQL to test RLS**:
```sql
-- As User B (not trip member), try to query invites
-- This should return 0 rows due to RLS
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-b-id';

SELECT COUNT(*) FROM trip_invites WHERE trip_id = 'user-a-trip-id';
-- Expected: 0 (RLS blocks)

RESET ROLE;
```

---

### Test Case 7: Error Messages

**Objective**: Verify all error scenarios show clear messages

| Error Scenario | Action | Expected Message | Includes "What to do" hint? |
|----------------|--------|------------------|----------------------------|
| Invalid invite code | Use code `invalid123` | "Invite Link Not Found" | ✅ "Ask organizer for new link" |
| Expired invite | Use expired code | "Invite Link Expired" | ✅ "Request new link" |
| Deactivated invite | Use inactive code | "Invite Link Deactivated" | ✅ "Contact organizer" |
| Deleted trip | Use code for deleted trip | "Trip Deleted" | ✅ "Trip no longer exists" |
| Max uses reached | Use code that hit limit | "Invite Link Full" | ✅ "Ask for new link" |
| Network error | Disconnect internet | "Connection Error" | ✅ "Check connection" + Retry button |
| Not trip admin | Non-admin generates invite | "Permission Denied" | ✅ Clear permission message |

**Test Each Error**:
```javascript
// Frontend test - run in browser console
const testErrors = async () => {
  const scenarios = [
    { code: 'invalid123', expected: 'NOT_FOUND' },
    { code: 'expired456', expected: 'EXPIRED' },
    // ... add more
  ];

  for (const { code, expected } of scenarios) {
    try {
      const response = await fetch(`/join/${code}`);
      console.log(`${code}: ${response.status === 404 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
      console.log(`${code}: ERROR`);
    }
  }
};

testErrors();
```

---

### Test Case 8: End-to-End Invitation Flow

**Objective**: Complete invitation lifecycle from creation to joining

**Steps**:
1. **User A**: Create trip "Coachella 2026"
2. **User A**: Generate invite link (no approval)
3. **User A**: Share link via email/SMS
4. **User B**: Click link in email
5. **User B**: See invite preview with trip details
6. **User B**: Click "Join Trip"
7. **User B**: Successfully join trip
8. **User B**: See trip in dashboard
9. **User A**: See User B in trip members list

**Expected Results**:
- ✅ Each step completes within 3 seconds
- ✅ No errors at any step
- ✅ User B becomes active trip member
- ✅ Both users can see shared trip data

---

### Test Case 9: Demo Mode

**Objective**: Ensure demo mode still works

**Steps**:
1. Access app without logging in
2. Browse demo trips
3. Click "Generate Invite" on demo trip
4. Verify demo invite link generated

**Expected Results**:
- ✅ Demo link format: `https://p.chravel.app/j/demo-{trip-id}-{timestamp}`
- ✅ No database insert occurs
- ✅ Demo link shows preview (even though not in DB)

---

## 📊 Performance Testing

### Load Test: Invite Generation

**Tool**: Apache Bench or k6

```bash
# Test 1000 invite generations over 30 seconds
ab -n 1000 -c 50 -T "application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -p invite-payload.json \
  https://your-project.supabase.co/functions/v1/generate-invite-code

# invite-payload.json:
# {"tripId":"test-trip-id","requireApproval":false,"expiresIn7Days":false}
```

**Success Criteria**:
- ✅ 95%+ requests complete successfully
- ✅ Average response time < 1 second
- ✅ No duplicate invite codes
- ✅ No database errors

---

### Load Test: Invite Joining

**Objective**: Simulate 100 users joining via invite simultaneously

```bash
# Create 100 concurrent join requests
for i in {1..100}; do
  curl -X POST "$PROJECT_URL/functions/v1/join-trip" \
    -H "Content-Type: application/json" \
    -d "{\"inviteCode\":\"YOUR_CODE\"}" &
done

wait
```

**Success Criteria**:
- ✅ All users join successfully (no duplicates)
- ✅ `trip_members` table shows 100 new members
- ✅ No foreign key violations
- ✅ No race conditions

---

## 🔍 Monitoring & Observability

### Edge Function Logs

Check logs in Supabase Dashboard:

```bash
# Or via CLI
supabase functions logs generate-invite-code --tail
```

**Look for**:
- ✅ `[INFO]` Invite created successfully
- ❌ `[ERROR]` Any errors (investigate)
- ⚠️ `[WARN]` Code collisions (should be rare, <0.1%)

### Database Monitoring

```sql
-- Invite creation rate (last hour)
SELECT
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as invites_created
FROM trip_invites
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC;

-- Error rate estimation
-- (If you have error logging table)
SELECT
  error_type,
  COUNT(*) as count
FROM error_logs
WHERE function_name = 'generate-invite-code'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY error_type;
```

---

## ✅ Final Acceptance Criteria

Before deploying to production, ensure:

- [ ] All 9 test cases pass
- [ ] No orphaned invites in database
- [ ] Foreign key constraint active
- [ ] All 3 indexes created
- [ ] 5 RLS policies active
- [ ] Edge function deploys without errors
- [ ] Error messages display correctly
- [ ] Load tests show 95%+ success rate
- [ ] No race conditions observed
- [ ] Demo mode still functional
- [ ] Edge function logs show no errors
- [ ] Performance meets targets (<1s avg)

---

## 🚨 Rollback Triggers

Immediately rollback if you observe:

- ❌ Invitation success rate drops below 50%
- ❌ Database errors spike (>10% of requests)
- ❌ Edge function errors spike (>10% of requests)
- ❌ User reports of lost invites or data
- ❌ Foreign key violations preventing trip deletion
- ❌ RLS policies blocking legitimate access

**Rollback Procedure**: See `TRIP_INVITATION_BUGS_ANALYSIS.md` → Rollback Plan

---

## 📞 Support & Debugging

### Common Issues

**Issue**: Edge function not found error
- **Solution**: Redeploy function: `supabase functions deploy generate-invite-code`

**Issue**: Foreign key violation when deleting trip
- **Solution**: Check if CASCADE is working: `\d trip_invites` in psql

**Issue**: RLS blocking legitimate access
- **Solution**: Check user's trip membership and RLS policies

**Issue**: Invite codes colliding
- **Solution**: Check collision rate in logs (should be <0.1%)

### Debug Queries

```sql
-- Find problematic invites
SELECT *
FROM trip_invites
WHERE trip_id NOT IN (SELECT id FROM trips)  -- Orphaned
   OR expires_at < NOW() AND is_active = true  -- Expired but still active
   OR created_at < NOW() - INTERVAL '90 days'  -- Very old;

-- Check trip membership for debugging access issues
SELECT
  t.name as trip_name,
  tm.user_id,
  tm.status,
  p.full_name
FROM trip_members tm
JOIN trips t ON t.id = tm.trip_id
JOIN profiles p ON p.id = tm.user_id
WHERE t.id = 'YOUR_TRIP_ID';
```

---

## 🎓 Learning & Improvement

After testing completes:

1. Document any edge cases discovered
2. Add integration tests for critical flows
3. Set up monitoring alerts for:
   - Invite creation failures (>5% in 5 min)
   - Edge function errors (>10 in 5 min)
   - Database constraint violations
4. Review error logs weekly for patterns
5. Gather user feedback on error messaging

---

**Testing Lead**: Assign someone to own this testing before production deploy

**Estimated Testing Time**: 3-4 hours for comprehensive testing

**Questions?** See `TRIP_INVITATION_BUGS_ANALYSIS.md` for detailed architecture info
