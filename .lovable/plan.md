

## Problem

Loading spinners throughout the app use inconsistent colors — some use `border-t-primary` (which maps to an HSL variable), others use hardcoded `border-blue-500`, `border-glass-orange`, or `text-primary` on Loader2 icons. The user wants all spinners to use the explicit metallic gold (`gold-primary` / `#c49746`).

## Changes

### 1. `src/components/LoadingSpinner.tsx` — Central spinner component
- Change `border-muted border-t-primary` → `border-gold-primary/30 border-t-gold-primary`
- This ensures the shared spinner always renders in metallic gold

### 2. `src/components/trip/MountedTabs.tsx` (line 16)
- `border-primary/30 border-t-primary` → `border-gold-primary/30 border-t-gold-primary`

### 3. `src/components/mobile/MobileTripTabs.tsx` (line 335)
- `border-blue-500/30 border-t-blue-500` → `border-gold-primary/30 border-t-gold-primary`

### 4. `src/components/events/EventDetailContent.tsx` (line 57)
- `border-blue-500/30 border-t-blue-500` → `border-gold-primary/30 border-t-gold-primary`

### 5. `src/pages/AdvertiserDashboard.tsx` (line 196)
- `border-b-2 border-primary` → `border-b-2 border-gold-primary`

### 6. `src/features/calendar/components/CalendarImportModal.tsx` (lines 438, 641)
- `border-b-2 border-primary` → `border-b-2 border-gold-primary`

### 7. `src/components/pro/admin/JoinRequestsPanel.tsx` (line 60)
- `border-b-2 border-primary` → `border-b-2 border-gold-primary`

### 8. `src/components/pro/admin/RoleManager.tsx` (lines 293, 437, 651)
- `border-b-2 border-primary` → `border-b-2 border-gold-primary`

### 9. `src/components/pro/admin/BulkRoleAssignmentDialog.tsx` (line 143)
- `text-primary` on Loader2 → `text-gold-primary`

### 10. `src/pages/OrganizationDashboard.tsx` (lines 129, 403)
- `border-glass-orange border-t-transparent` → `border-gold-primary/30 border-t-gold-primary`

### 11. `src/components/FilesTab.tsx` (line 358)
- `border-b-2 border-glass-orange` → `border-b-2 border-gold-primary`

### 12. `src/components/ai/ConciergeSearchModal.tsx` (line 214)
- `border-emerald-500/30 border-t-emerald-500` → `border-gold-primary/30 border-t-gold-primary`

**Not changed:** White spinners inside buttons during action states (e.g., "Processing...", "Uploading..." over dark backgrounds) — those should stay white for contrast. Also not changing contextual Loader2 icons inside buttons that are mid-action (they inherit button text color).

**Net result:** ~12 files updated, all loading spinners consistently use `gold-primary` metallic gold.

