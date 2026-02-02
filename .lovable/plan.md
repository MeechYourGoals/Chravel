

# Hide Advertiser Tab for Authenticated Users

## Summary

Hide the Advertiser tab from the Settings menu for authenticated users in production. The tab will only be visible in Demo Mode (app-preview) or for Super Admins. This keeps the infrastructure intact while providing a cleaner production experience.

---

## Current State

| Condition | Advertiser Tab Visibility |
|-----------|--------------------------|
| Demo Mode (app-preview) | Visible, enabled |
| Super Admin | Visible, enabled |
| Regular authenticated user | Visible, **disabled with "Soon" badge** |

## Desired State

| Condition | Advertiser Tab Visibility |
|-----------|--------------------------|
| Demo Mode (app-preview) | Visible, enabled |
| Super Admin | Visible, enabled |
| Regular authenticated user | **Hidden completely** |

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/SettingsMenu.tsx` | Wrap Advertiser button in conditional to hide when not `canAccessAdvertiser` |

---

## Technical Changes

### SettingsMenu.tsx - Conditionally Render Advertiser Button

**Lines 167-184:**

```tsx
// FROM:
<button
  onClick={() => canAccessAdvertiser && setSettingsType('advertiser')}
  disabled={!canAccessAdvertiser}
  className={`py-2 px-4 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
    settingsType === 'advertiser'
      ? 'bg-primary text-white shadow-lg'
      : canAccessAdvertiser
        ? 'text-gray-400 hover:text-white hover:bg-white/5'
        : 'text-gray-500 cursor-not-allowed opacity-60'
  }`}
>
  Advertiser
  {!canAccessAdvertiser && (
    <span className="text-xs bg-gray-600 text-gray-300 px-1 py-0.5 rounded-full">
      Soon
    </span>
  )}
</button>

// TO:
{canAccessAdvertiser && (
  <button
    onClick={() => setSettingsType('advertiser')}
    className={`py-2 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
      settingsType === 'advertiser'
        ? 'bg-primary text-white shadow-lg'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    Advertiser
  </button>
)}
```

**Changes:**
1. Wrap entire button in `{canAccessAdvertiser && (...)}` - hides it completely when not accessible
2. Remove `disabled` prop - no longer needed since button won't render
3. Remove "Soon" badge - no longer needed
4. Simplify className - remove disabled styling branch

---

## Visual Result

### Authenticated Users (Production)
```text
Settings tabs: [ Group ] [ Enterprise ] [ Events ]
(Advertiser tab completely hidden - no placeholder, no "Soon" badge)
```

### Demo Mode / Super Admin
```text
Settings tabs: [ Group ] [ Enterprise ] [ Events ] [ Advertiser ]
(Full access to Advertiser Hub)
```

---

## Benefits

1. **Cleaner production UI** - No grayed-out tab or "Coming Soon" placeholder
2. **Consistent pattern** - Matches how Recs tab and Saved Places are now hidden
3. **Easy rollback** - When Advertiser feature is ready, change condition to `true` or add user-specific logic
4. **Infrastructure preserved** - AdvertiserSettingsPanel and all routes remain intact

