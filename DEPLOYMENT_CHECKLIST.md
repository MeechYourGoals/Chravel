# ✅ Deployment Checklist: Trip Invitation Bug Fixes

**Date**: _________________
**Deployed by**: _________________
**Environment**: [ ] Staging [ ] Production

---

## 📋 Pre-Deployment

- [ ] All code changes reviewed and approved
- [ ] Branch `claude/fix-trip-invitation-bugs-t7fHh` merged to main
- [ ] All tests passing on staging environment
- [ ] Database backup created (production only)
- [ ] Team notified of deployment window
- [ ] Rollback plan reviewed and understood

---

## 🗄️ Database Deployment

- [ ] Migration file verified: `supabase/migrations/20260121230000_fix_trip_invites_comprehensive.sql`
- [ ] Migration applied to staging ✅
- [ ] Migration applied to production ⏳
- [ ] Foreign key constraint added
- [ ] Indexes created (3 total)
- [ ] RLS policies updated (5 total)
- [ ] Orphaned invites cleaned up

**Verification Commands**:
```sql
-- Check FK
SELECT 1 FROM pg_constraint WHERE conname = 'trip_invites_trip_id_fkey';

-- Check no orphans
SELECT COUNT(*) FROM trip_invites WHERE trip_id NOT IN (SELECT id FROM trips);
-- Result should be: 0

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'trip_invites';
-- Should see 3 new indexes
```

---

## ⚡ Edge Function Deployment

- [ ] Edge function directory exists: `supabase/functions/generate-invite-code/`
- [ ] CORS helper imported correctly
- [ ] Function deployed to staging
- [ ] Function tested on staging
- [ ] Function deployed to production

**Deployment Command**:
```bash
supabase functions deploy generate-invite-code
```

**Test Command**:
```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/generate-invite-code \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tripId":"test-id","requireApproval":false,"expiresIn7Days":false}'
```

---

## 🌐 Frontend Deployment

- [ ] Code changes deployed to staging
- [ ] Code changes deployed to production
- [ ] `src/hooks/useInviteLink.ts` updated
- [ ] `src/pages/JoinTrip.tsx` updated
- [ ] Build successful (no TypeScript errors)
- [ ] No console errors in production

**Build Verification**:
```bash
npm run typecheck
npm run build
```

---

## 🧪 Post-Deployment Testing

### Critical Path Tests (Do These First!)

- [ ] **Test 1**: Create new trip → Generate invite → Should complete in <2s
- [ ] **Test 2**: User clicks invite link → Should see trip preview
- [ ] **Test 3**: User joins via invite → Should become trip member
- [ ] **Test 4**: Check error message for invalid invite → Should show clear guidance
- [ ] **Test 5**: Generate 10 invites concurrently → All should succeed

### Edge Cases

- [ ] Invite with approval required works
- [ ] Invite with 7-day expiration works
- [ ] Expired invite shows proper error
- [ ] Deleted trip shows proper error
- [ ] Demo mode still works

**Refer to**: `INVITATION_TESTING_GUIDE.md` for detailed test procedures

---

## 📊 Monitoring (First 24 Hours)

- [ ] Set up alerts for:
  - Edge function error rate >10%
  - Invite creation failures >5%
  - Database constraint violations

- [ ] Monitor metrics:
  - Invite success rate (target: >95%)
  - Average invite generation time (target: <1s)
  - Edge function logs (no errors)
  - User reports of issues (target: 0)

**Dashboard Links**:
- Supabase Edge Functions: [Insert URL]
- Database Metrics: [Insert URL]
- Error Tracking: [Insert URL]

---

## 🎯 Success Metrics (Track for 48 Hours)

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Invitation success rate | 10-30% | >95% | ___% |
| Avg invite generation time | 2-5s | <1s | ___s |
| "Trip not found" errors/day | 40-50 | <5 | ___ |
| User support tickets/week | 20-30 | <5 | ___ |
| Edge function error rate | N/A | <1% | ___% |

---

## 🚨 Rollback Procedure

**Trigger rollback if:**
- Invitation success rate drops below 50%
- Database errors spike (>10% of requests)
- Edge function completely down
- Critical bug preventing core functionality

**Rollback Steps**:

1. **Revert Frontend**:
   ```bash
   git revert HEAD  # Or redeploy previous version
   npm run build
   # Deploy to production
   ```

2. **Remove Edge Function**:
   ```bash
   supabase functions delete generate-invite-code
   ```

3. **Revert Database** (if critical):
   ```sql
   -- Remove FK constraint
   ALTER TABLE trip_invites DROP CONSTRAINT trip_invites_trip_id_fkey;

   -- Remove indexes (optional, they don't hurt)
   DROP INDEX IF EXISTS idx_trip_invites_trip_id;
   DROP INDEX IF EXISTS idx_trip_invites_active_by_trip;
   ```

4. **Notify team** and investigate root cause

---

## 📝 Post-Deployment Actions

- [ ] Update team in Slack/Discord
- [ ] Monitor for 24 hours
- [ ] Gather user feedback
- [ ] Document any issues encountered
- [ ] Schedule follow-up review (1 week)
- [ ] Update runbooks with learnings

---

## ✅ Sign-Off

**Deployment Completed**: _________________
**All Tests Passing**: _________________
**Monitoring Active**: _________________
**Team Notified**: _________________

**Deployed by**: _________________
**Reviewed by**: _________________
**Date**: _________________

---

## 📞 Emergency Contacts

- **On-call Engineer**: [Name/Phone]
- **Database Admin**: [Name/Phone]
- **Product Owner**: [Name/Phone]

---

## 📚 Reference Documents

- **Analysis**: `TRIP_INVITATION_BUGS_ANALYSIS.md`
- **Testing**: `INVITATION_TESTING_GUIDE.md`
- **Deployment Script**: `deploy-invitation-fixes.sh`

---

**Questions or issues?** Contact the deployment team immediately.

**Good luck! 🚀**
