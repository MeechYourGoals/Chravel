
# MVP Decision: Hide Bio Field Until Profile Surface Exists

## Overview

The Bio field currently exists in Settings but has **no surface where other users can see it**. This is "dead UI" that makes the app feel unfinished. We'll take the minimal MVP approach: hide the Bio field (and note it's coming soon) while keeping the database schema intact for future use.

## Current State Audit

| Component | Bio Usage |
|-----------|-----------|
| Database (`profiles` table) | ✅ Column exists, stores data |
| `profiles_public` view | ✅ Exposed (always visible to co-members) |
| Settings > Profile UI | ✅ Editable textarea |
| Trip Members List | ❌ Not fetched, not displayed |
| Member Profile Modal | ❌ Does not exist |
| Click-to-view profile | ❌ No interaction implemented |

**Verdict**: Bio is editable but never shown to anyone else → dead UI.

---

## Chosen Path: A (Minimal - Hide Bio)

Hide the Bio field from the Consumer Profile Settings. Keep the database column intact for future use. Add a subtle "coming soon" indicator.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/consumer/ConsumerProfileSection.tsx` | Remove Bio textarea, remove bio state handling, add "Profile sharing coming soon" teaser |

---

## Implementation Details

### Remove Bio from ConsumerProfileSection

**Before (lines 280-289):**
```tsx
<div className="mt-3">
  <label className="block text-sm text-gray-300 mb-1">Bio</label>
  <textarea
    value={bio}
    onChange={e => setBio(e.target.value)}
    placeholder="Tell people a bit about yourself..."
    className="..."
    rows={3}
  />
</div>
```

**After:**
```tsx
{/* Bio field hidden until Member Profile Cards ship */}
<div className="mt-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-lg">
  <p className="text-sm text-gray-400 text-center">
    ✨ Member profile cards coming soon — you'll be able to share a bio with trip members
  </p>
</div>
```

### Remove bio state and save logic

**Remove from state initialization:**
```tsx
// Remove: const [bio, setBio] = useState(user?.bio || '');
```

**Remove from useEffect sync:**
```tsx
// Remove: setBio(user.bio || '');
```

**Remove from handleSave:**
```tsx
// Change this:
const { error } = await updateProfile({
  display_name: displayName,
  bio: bio,         // ← Remove this line
  phone: phone || null,
});

// To this:
const { error } = await updateProfile({
  display_name: displayName,
  phone: phone || null,
});
```

---

## What We're NOT Doing (to avoid scope creep)

- ❌ Not removing `bio` column from database (data preservation)
- ❌ Not adding `show_bio` privacy toggle yet (no surface to show bio)
- ❌ Not building Member Profile Card modal (future feature)
- ❌ Not modifying Enterprise or Pro profile sections (different contexts)
- ❌ Not touching `profiles_public` view (bio is harmless there since no UI consumes it)

---

## Future Roadmap (Not This PR)

When ready to ship profile visibility:

1. Add `show_bio` boolean to profiles table (default: true)
2. Create minimal `<MemberProfileCard>` modal component
3. Add click handler to member avatars in Trip Members list
4. Modal shows: Avatar, Display Name, Bio (if show_bio=true)
5. Add "View Profile" option to member context menus

---

## Why This Approach

| Consideration | Decision |
|---------------|----------|
| **Dead fields confuse users** | Hide until functional |
| **Database migration** | Not needed - keep schema for future |
| **Scope creep risk** | Zero - just hide one textarea |
| **Privacy risk** | None - bio isn't displayed anywhere |
| **Reversibility** | Easy - just unhide when profile cards ship |
| **User expectation** | Clear "coming soon" signal instead of broken feature |

---

## Test Plan

1. Go to Settings → Profile
2. Verify Bio textarea is gone
3. Verify "coming soon" placeholder is visible
4. Verify Display Name and Phone still editable
5. Verify Save Changes still works
6. Verify existing bio data is NOT deleted from database

---

## Summary

Single-file change to hide the Bio field with a friendly "coming soon" message. No database changes, no RLS updates, no new components. Clean MVP that removes dead UI while preserving the foundation for future profile sharing features.
