# 🎯 CURSOR EXECUTION PROMPT - Frequent Chraveler Implementation

**Copy this entire section below and paste into Cursor**

---

## 📋 TASK SUMMARY

Complete the Frequent Chraveler tier migration by updating TripCategorySelector to persist categories to the database and ensuring all integration points are working correctly.

## ✅ WHAT'S ALREADY DONE

**All critical fixes have been applied:**
- ✅ Stripe constants key renamed to `'consumer-frequent-chraveler'`
- ✅ Webhook tier mapping returns `'frequent-chraveler'`
- ✅ Database migration created and applied (trips.categories column + user_pro_trip_quota table)
- ✅ Type definitions correct (`'free' | 'explorer' | 'frequent-chraveler'`)
- ✅ All frontend components display correct tier names
- ✅ Feature access gates properly defined

**Current branch:** `claude/tier-migration-audit-011CUWHLd4sfTx2u9yq4PoTz`

## 🎯 YOUR TASKS

### Task 1: Update TripCategorySelector to Use Database Persistence

**File:** `src/components/trip/TripCategorySelector.tsx`

**Current behavior (lines 40-50):**
- Categories are only stored in localStorage via `onCategoriesChange()`
- No database persistence
- Data lost on browser clear

**Required changes:**
1. Update the `toggleCategory` function to persist to Supabase
2. Replace the localStorage-only approach with a database mutation
3. Add proper error handling
4. Keep the optimistic UI update

**Implementation:**

```typescript
const toggleCategory = async (categoryId: string) => {
  if (!canEdit) {
    toast.error('Upgrade to Explorer to add trip categories');
    return;
  }

  const newCategories = selectedCategories.includes(categoryId)
    ? selectedCategories.filter(id => id !== categoryId)
    : [...selectedCategories, categoryId];

  setIsSaving(true);
  try {
    // Optimistic update
    onCategoriesChange(newCategories);

    // Persist to database
    const { error } = await supabase
      .from('trips')
      .update({ categories: newCategories })
      .eq('id', tripId);

    if (error) throw error;

    toast.success('Categories updated');
  } catch (error) {
    console.error('Error updating categories:', error);
    toast.error('Failed to update categories');
    // Revert optimistic update
    onCategoriesChange(selectedCategories);
  } finally {
    setIsSaving(false);
  }
};
```

**Key points:**
- Use optimistic updates for instant UI feedback
- Revert on error
- Proper error handling with user-friendly messages
- Loading state already exists (`isSaving`)

---

### Task 2: Add Initial Categories Loading

**File:** `src/components/trip/TripCategorySelector.tsx`

**Problem:** Categories aren't loaded from database on component mount

**Add this useEffect:**

```typescript
useEffect(() => {
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('categories')
        .eq('id', tripId)
        .single();

      if (error) throw error;

      if (data?.categories && Array.isArray(data.categories)) {
        onCategoriesChange(data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Silent fail - categories will be empty array
    }
  };

  loadCategories();
}, [tripId]);
```

**Add after line 23** (after state declarations, before the `canEdit` check)

---

### Task 3: Verify Integration Points

**Check these files for correct tier usage:**

1. **src/hooks/useConsumerSubscription.tsx**
   - ✅ Should reference `STRIPE_PRODUCTS['consumer-frequent-chraveler']` (already fixed)
   - ✅ Should map tier correctly from webhook

2. **src/components/consumer/ConsumerBillingSection.tsx**
   - ✅ Should display "Frequent Chraveler" tier (already correct)
   - Verify upgrade flow works with `upgradeToTier('frequent-chraveler', 'annual')`

3. **src/components/conversion/PricingSection.tsx**
   - ✅ Should display "Frequent Chraveler" tier with correct features (already correct)

**No changes needed** - just verify these are working correctly.

---

### Task 4: Add Pro Trip Quota Check (Optional Enhancement)

**File:** `src/components/CreateTripModal.tsx` or wherever Pro trips are created

**Add quota check before creating Pro trip:**

```typescript
// Check if user can create Pro trip (Frequent Chraveler only)
const { canCreateProTrip, proTripQuota } = useConsumerSubscription();

const handleCreateProTrip = async () => {
  if (!canCreateProTrip) {
    toast.error('Upgrade to Frequent Chraveler to create Pro trips');
    return;
  }

  // Check quota via database function
  const { data: quotaData, error: quotaError } = await supabase
    .rpc('get_user_pro_trip_quota', { p_user_id: user.id });

  if (quotaError) {
    console.error('Error checking quota:', quotaError);
    toast.error('Failed to check Pro trip quota');
    return;
  }

  const { trips_created, quota_limit, can_create_more } = quotaData[0];

  if (!can_create_more) {
    toast.error(`You've reached your Pro trip limit (${trips_created}/${quota_limit} this month)`);
    return;
  }

  // Proceed with Pro trip creation
  // ... existing creation logic ...

  // After successful creation, increment quota
  await supabase.rpc('increment_pro_trip_count', { p_user_id: user.id });
};
```

**Note:** This is optional. The quota tracking table exists but enforcement is not strictly required for initial launch.

---

### Task 5: Test the Complete Flow

**Manual testing checklist:**

1. **Tier Detection**
   - [ ] Free tier user sees correct features
   - [ ] Explorer tier user can edit categories
   - [ ] Frequent Chraveler tier user can edit categories + create Pro trips

2. **Category Editing**
   - [ ] Click on trip → open category selector
   - [ ] Select categories → verify they save to database
   - [ ] Refresh page → categories persist
   - [ ] Free tier user sees "Upgrade to edit" message

3. **Subscription Flow**
   - [ ] Subscribe to Explorer via Stripe → tier detected correctly
   - [ ] Subscribe to Frequent Chraveler → tier detected correctly
   - [ ] Webhook returns `{ tier: 'frequent-chraveler' }`

4. **Error Handling**
   - [ ] Network error → shows error toast + reverts UI
   - [ ] Invalid trip ID → handles gracefully
   - [ ] Concurrent edits → last write wins (acceptable)

---

## 🐛 POTENTIAL ISSUES TO WATCH FOR

### Issue 1: Supabase Import Missing
**File:** `src/components/trip/TripCategorySelector.tsx`
**Fix:** Ensure this import exists at top of file:
```typescript
import { supabase } from '@/integrations/supabase/client';
```

### Issue 2: TypeScript Error on categories column
**Error:** `Property 'categories' does not exist on type 'trips'`
**Fix:** Regenerate Supabase types:
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Issue 3: RLS Policy Blocking Updates
**Error:** `new row violates row-level security policy`
**Fix:** Ensure trip_participants table has user entry, or update RLS policy to check trip ownership via `created_by` column.

### Issue 4: Categories Not Loading on Mount
**Symptom:** Categories don't appear after page refresh
**Fix:** Ensure the useEffect for loading categories runs and `onCategoriesChange` is called.

---

## 📦 DELIVERABLES

When you're done, ensure:

1. ✅ TripCategorySelector persists to database
2. ✅ Categories load from database on mount
3. ✅ Error handling is robust
4. ✅ Optimistic updates work correctly
5. ✅ All tier checks use correct values
6. ✅ TypeScript compiles with no errors
7. ✅ Manual testing checklist passed

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All TypeScript errors resolved
- [ ] npm run build succeeds
- [ ] Migration applied to production database
- [ ] Stripe products created (replace `prod_TBD_*` with real IDs)
- [ ] Webhook tested with real Stripe events
- [ ] End-to-end test: Subscribe → Edit Categories → Verify Persistence

---

## 📝 COMMIT MESSAGE TEMPLATE

After completing tasks, commit with:

```
feat: Complete Frequent Chraveler tier implementation

- Update TripCategorySelector to persist categories to database
- Add categories loading on component mount
- Improve error handling with optimistic updates
- Add Pro trip quota checking (optional)
- Complete integration of frequent-chraveler tier across app

Closes tier migration implementation
Builds on commit 2b5e201 (critical fixes)

All features tested and working:
- Tier detection from Stripe webhook
- Category editing and persistence
- Feature gating by subscription tier
- Pro trip quota tracking

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🎯 SUCCESS CRITERIA

**You're done when:**
1. User subscribes to Frequent Chraveler → tier detected
2. User opens trip → categories load from database
3. User edits categories → saves to database immediately
4. User refreshes page → categories persist
5. Free user tries to edit → sees upgrade prompt
6. No TypeScript errors
7. No console errors in browser

**Expected outcome:** Fully functional Frequent Chraveler tier with database-backed trip categories.

---

**Ready to execute!** Copy everything above and paste into Cursor.
