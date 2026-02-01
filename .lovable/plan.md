
# Advertiser Hub Data Consistency & Payment Settings Fix

## Summary of Issues Identified

### 1. Analytics Numbers Don't Match Campaign Cards
**Problem**: In the Campaigns tab, Uber shows 15,234 impressions. But when selecting "Uber" in Analytics dropdown, the totals still show aggregated numbers (33,999) instead of Uber-specific numbers (15,234).

**Root Cause**: The `CampaignAnalytics.tsx` component calculates totals from ALL campaigns (lines 29-32), regardless of which campaign is selected in the dropdown.

### 2. Chart Data is Static Mock Data
**Problem**: The `performanceData` array (lines 46-54) is hardcoded and doesn't reflect the actual campaign metrics or change when a specific campaign is selected.

### 3. Top Campaigns List Inconsistent
**Problem**: The Top Campaigns tab currently shows hardcoded data from the original AdvertiserDashboard.tsx mock campaigns which includes 3 campaigns (Uber, Lyft, Hotels.com), but AdvertiserSettingsPanel.tsx only has 2 mock campaigns (Uber, Hotels.com) - Lyft is missing.

### 4. API Access Section in Settings
**Problem**: The "API Access" card in AdvertiserSettings.tsx (lines 248-263) is confusing and not useful for MVP.

### 5. Missing Advertiser Payment Section
**Problem**: No way for advertisers to add a separate company card for billing CPMs, clicks, conversions.

### 6. Authenticated Users Should NOT See Mock Data
**Problem**: Currently `isPreviewMode = isDemoMode || isSuperAdmin` treats super admin the same as demo mode for data display. Super admin should see REAL data (empty state if no campaigns), not mock data.

---

## Technical Implementation Plan

### File Changes Summary

| File | Changes |
|------|---------|
| `src/components/advertiser/AdvertiserSettingsPanel.tsx` | Remove super admin from mock data logic - they should see real empty state |
| `src/components/advertiser/CampaignAnalytics.tsx` | Fix filtering to update totals when specific campaign selected; derive chart data from selected campaign metrics |
| `src/components/advertiser/AdvertiserSettings.tsx` | Remove API Access section, add Payment Method section |
| `src/pages/AdvertiserDashboard.tsx` | Same fix for super admin mock data logic |

---

### Fix 1: Campaign Analytics - Dynamic Filtering by Selected Campaign

**File**: `src/components/advertiser/CampaignAnalytics.tsx`

**Current behavior** (broken):
```typescript
const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
// Always shows ALL campaigns total regardless of dropdown selection
```

**Fixed behavior**:
```typescript
// Filter campaigns based on selection
const filteredCampaigns = selectedCampaign === 'all' 
  ? campaigns 
  : campaigns.filter(c => c.id === selectedCampaign);

// Compute totals from filtered campaigns
const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + c.impressions, 0);
const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.clicks, 0);
const totalSaves = filteredCampaigns.reduce((sum, c) => sum + (c.saves || 0), 0);
const totalConversions = filteredCampaigns.reduce((sum, c) => sum + c.conversions, 0);
```

**Chart data derivation** - Generate realistic daily data based on campaign totals:
```typescript
// Generate chart data proportionally from totals
const generatePerformanceData = (impressions: number, clicks: number, saves: number, conversions: number) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weights = [0.08, 0.11, 0.14, 0.12, 0.18, 0.22, 0.15]; // Realistic weekly distribution
  
  return days.map((date, i) => ({
    date,
    impressions: Math.round(impressions * weights[i]),
    clicks: Math.round(clicks * weights[i]),
    saves: Math.round(saves * weights[i]),
    conversions: Math.round(conversions * weights[i])
  }));
};

const performanceData = generatePerformanceData(totalImpressions, totalClicks, totalSaves, totalConversions);
```

---

### Fix 2: Consistent Mock Data Between Panel and Dashboard

**File**: `src/components/advertiser/AdvertiserSettingsPanel.tsx`

Ensure mock campaigns match exactly with `AdvertiserDashboard.tsx`. Currently the panel has 2 campaigns, dashboard has 3. We'll use the same 2-campaign set (Uber + Hotels.com) in both places for demo mode consistency.

The mock data in AdvertiserSettingsPanel already has:
- Uber: 15,234 impressions, 1,203 clicks, 342 saves, 89 conversions
- Hotels.com: 18,765 impressions, 1,456 clicks, 523 saves, 134 conversions

**Total (All Campaigns)**: 33,999 impressions, 2,659 clicks, 865 saves, 223 conversions

When "Uber" is selected:
- **Expected**: 15,234 impressions, 1,203 clicks, 342 saves, 89 conversions

When "Hotels.com" is selected:
- **Expected**: 18,765 impressions, 1,456 clicks, 523 saves, 134 conversions

---

### Fix 3: Super Admin Should See Real Data (Not Mock)

**Files**: 
- `src/components/advertiser/AdvertiserSettingsPanel.tsx`
- `src/pages/AdvertiserDashboard.tsx`

**Current logic** (line 162-165 in Panel, line 271-274 in Dashboard):
```typescript
const activeAdvertiser = isDemoMode
  ? mockAdvertiser
  : advertiser || (isSuperAdmin ? superAdminAdvertiser : advertiser);
const activeCampaigns = isDemoMode ? mockCampaigns : campaigns;
```

This is already correct - mock data is only used when `isDemoMode` is true. However, line 31 shows:
```typescript
const isPreviewMode = isDemoMode || isSuperAdmin;
```

The `isPreviewMode` is only used for the banner display, which is fine. The actual data selection is correct.

**Verification**: Super admin with `isDemoMode = false` will:
1. Call `loadAdvertiserData()` 
2. Get real campaigns from database (likely empty)
3. `activeCampaigns` = real `campaigns` array (empty)
4. Show empty state in CampaignList

This is already working correctly per the code.

---

### Fix 4: Remove API Access, Add Payment Section

**File**: `src/components/advertiser/AdvertiserSettings.tsx`

**Remove** (lines 248-263):
```typescript
{/* API Access */}
<Card className="bg-white/5 border-gray-700">
  ...
</Card>
```

**Add Payment Method Section**:
```typescript
{/* Payment Method */}
<Card className="bg-white/5 border-white/10">
  <CardHeader className="pb-3 sm:pb-6">
    <CardTitle className="text-base sm:text-lg text-white">Payment Method</CardTitle>
    <CardDescription className="text-xs sm:text-sm text-gray-400">
      Add a company card for advertising billing
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4 px-4 sm:px-6">
    {/* Card on File indicator or Add Card form */}
    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
      <div className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm text-gray-400">No payment method on file</p>
          <p className="text-xs text-gray-500 mt-1">
            Add a company card to pay for impressions, clicks, and conversions
          </p>
        </div>
      </div>
    </div>
    
    <Button
      variant="outline"
      className="w-full border-white/10 hover:bg-white/5 text-white"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Payment Method
    </Button>
  </CardContent>
</Card>
```

For now, clicking "Add Payment Method" will show a toast indicating this feature is coming soon, keeping it simple for MVP.

---

### Fix 5: Realistic Engagement Chart Data

**File**: `src/components/advertiser/CampaignAnalytics.tsx`

The engagement chart (Saves vs Conversions bar chart) should also use the dynamically generated `performanceData` which now derives from the selected campaign's actual metrics.

---

### Fix 6: Sync AdvertiserDashboard Mock Data

**File**: `src/pages/AdvertiserDashboard.tsx`

Update `mockCampaigns` to match exactly 2 campaigns (Uber + Hotels.com) to prevent confusion. Remove the Lyft mock campaign (lines 95-138) to ensure consistency.

---

## Implementation Checklist

1. **CampaignAnalytics.tsx**
   - [ ] Add `filteredCampaigns` based on `selectedCampaign`
   - [ ] Recalculate totals from filtered campaigns
   - [ ] Generate performance chart data from campaign totals
   - [ ] Update engagement chart to use derived data

2. **AdvertiserSettings.tsx**
   - [ ] Remove API Access card
   - [ ] Add CreditCard import from lucide-react
   - [ ] Add Payment Method card with placeholder UI
   - [ ] Update border colors from `border-gray-700` to `border-white/10` for consistency

3. **AdvertiserDashboard.tsx**
   - [ ] Remove Lyft mock campaign to match 2-campaign set
   - [ ] Verify super admin sees real data when not in demo mode

4. **AdvertiserSettingsPanel.tsx**
   - [ ] Verify mock data matches dashboard (already correct)
   - [ ] Confirm super admin logic is correct (already correct)

---

## Expected Results After Fix

### Demo Mode ("All Campaigns" selected):
- Total Impressions: **33,999** 
- Total Clicks: **2,659**
- Saves: **865**
- Conversions: **223**

### Demo Mode ("Uber" selected):
- Total Impressions: **15,234**
- Total Clicks: **1,203**
- Saves: **342**
- Conversions: **89**

### Demo Mode ("Hotels.com" selected):
- Total Impressions: **18,765**
- Total Clicks: **1,456**
- Saves: **523**
- Conversions: **134**

### Authenticated User (not demo, not super admin):
- Shows real campaigns from database
- Empty state if no campaigns
- No mock data

### Super Admin (not demo mode):
- Shows real campaigns from database
- Empty state if no campaigns created
- Can create real campaigns

---

## Settings Tab Changes

**Before**:
1. Account Status
2. Company Information
3. API Access (remove)

**After**:
1. Account Status
2. Company Information
3. Payment Method (add)
