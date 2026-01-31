
# Redesign Advertiser Hub to Match Settings Design Language

## Overview

Transform the Advertiser Hub from a separate full-page dashboard into an embedded settings section that matches the existing Consumer/Enterprise/Events settings design. This ensures visual consistency and makes Advertiser feel like part of the app rather than a separate product.

## Current Problems Identified

| Issue | Current State | Target State |
|-------|---------------|--------------|
| Background color | Navy blue (`bg-gray-900`) | Pure black (`bg-black` / `#000000`) |
| Gold accent shade | `yellow-600` | `hsl(42, 92%, 56%)` - same as primary |
| Tab alignment | Left-aligned | Centered |
| Layout structure | Standalone page with own header | Embedded in Settings modal like other tabs |
| Metric boxes | Missing Saves | Add Saves metric box |
| CTR metric | Present | Replace with Saves |

## What is CTR?

CTR (Click-Through Rate) = (Clicks / Impressions) × 100

It measures how effective a campaign is at getting users to click. However, for Chravel Recs where the goal is "Book Now" conversions, having **Saves** is more valuable because:
- Users saving a rec shows intent even without immediate booking
- Brands see longer-term interest, not just immediate clicks
- Aligns with how Chravel Recs works (save for later feature)

**Decision**: Replace CTR with Saves. The new metrics will be:
1. **Total Impressions** - How many users viewed the trip card
2. **Total Clicks** - Who clicked on the card (for details)
3. **Saves** - Who saved it to their Saved Places
4. **Conversions** - Who clicked "Book Now" and completed a purchase

---

## Technical Implementation

### File Changes

| File | Changes |
|------|---------|
| `src/components/SettingsMenu.tsx` | Add inline Advertiser content instead of navigating away |
| `src/pages/AdvertiserDashboard.tsx` | Keep for direct URL access, update styling |
| `src/components/advertiser/AdvertiserSettingsPanel.tsx` | NEW - Embedded version for Settings modal |
| `src/components/advertiser/CampaignAnalytics.tsx` | Replace CTR with Saves, center tabs |
| `src/components/advertiser/CampaignList.tsx` | Update stats grid to show Saves instead of CTR |
| `src/types/advertiser.ts` | Add `saves` field to Campaign type |

---

### 1. Create Embedded Advertiser Panel

Create `src/components/advertiser/AdvertiserSettingsPanel.tsx` - a version designed to render inside the Settings modal (no separate header, matching styling):

```typescript
// Structure mirrors ConsumerSettings.tsx
const sections = [
  { id: 'campaigns', label: 'Campaigns', icon: Plus },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

// Left sidebar with sections, right content area
// Black background, gold-tinted borders, white text
```

### 2. Update SettingsMenu.tsx

Replace the Advertiser button that navigates to `/advertiser` with inline rendering:

```typescript
// Current (navigates away):
onClick={() => navigate('/advertiser')}

// New (stays in settings):
setSettingsType('advertiser')

// Add advertiser case to renderSection:
case 'advertiser':
  return <AdvertiserSettingsPanel currentUserId={currentUser.id} />;
```

### 3. Restyle for Design Consistency

**Background and Cards:**
```typescript
// Change from:
className="bg-gray-900"
className="bg-white/5 border-gray-700"

// To:
className="bg-transparent"  // inherits black from Settings modal
className="bg-white/5 border-white/10 hover:border-primary/30"
```

**Tabs (Campaigns/Analytics/Settings):**
```typescript
// Current: left-aligned
<TabsList className="mb-8 bg-gray-800 border-gray-700">

// New: centered with proper gold theme
<TabsList className="w-full justify-center bg-white/5 border-white/10 p-1">
  <TabsTrigger 
    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
  >
```

**Sub-tabs (Performance/Engagement/Top Campaigns):**
```typescript
// Current: left-aligned
<TabsList className="bg-gray-800 border-gray-700">

// New: centered
<div className="flex justify-center">
  <TabsList className="bg-white/5 border-white/10">
```

### 4. Update Analytics Metrics

**Replace CTR box with Saves:**

```typescript
// Current 4 boxes: Impressions, Clicks, CTR, Conversions

// New 4 boxes: Impressions, Clicks, Saves, Conversions
<Card className="bg-white/5 border-white/10">
  <CardHeader>
    <CardTitle className="text-xs tablet:text-sm font-medium text-white">Saves</CardTitle>
    <Bookmark className="h-3 w-3 tablet:h-4 tablet:w-4 text-gray-400" />
  </CardHeader>
  <CardContent>
    <div className="text-lg tablet:text-2xl font-bold text-white">
      {totalSaves.toLocaleString()}
    </div>
    <p className="text-xs text-gray-400">
      <TrendingUp className="h-3 w-3 inline text-green-500" /> +12.4% from last week
    </p>
  </CardContent>
</Card>
```

### 5. Update Type Definitions

Add `saves` to Campaign interface in `src/types/advertiser.ts`:

```typescript
export interface Campaign {
  // ... existing fields
  impressions: number;
  clicks: number;
  saves: number;      // NEW
  conversions: number;
  // ...
}
```

### 6. Update CampaignList Stats Grid

Change the campaign card stats section:

```typescript
// Current: Impressions | Clicks | CTR | Conversions
// New: Impressions | Clicks | Saves | Conversions

<div className="text-center">
  <div className="flex items-center justify-center text-gray-400 mb-1">
    <Bookmark className="h-4 w-4 mr-1" />
    <span className="text-xs">Saves</span>
  </div>
  <p className="text-2xl font-semibold text-white">
    {campaign.saves?.toLocaleString() || '0'}
  </p>
</div>
```

---

## Visual Design Specifications

### Color Palette (matching Settings)

| Element | Value |
|---------|-------|
| Background | `bg-black` / transparent (inherits) |
| Cards | `bg-white/5` |
| Borders | `border-white/10` |
| Active tab | `bg-primary` (gold #F4B23A) |
| Active tab text | `text-primary-foreground` (black) |
| Inactive tab | `text-gray-400` |
| Heading text | `text-white` |
| Body text | `text-gray-300` |
| Muted text | `text-gray-400` |
| Accent links | `text-primary` (gold) |

### Tab Styling

```css
/* Centered tab container */
.tab-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Tab group */
.tabs-list {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 4px;
}

/* Active tab */
.tab-active {
  background: hsl(42, 92%, 56%);  /* Gold primary */
  color: black;
}
```

---

## Metrics Explanation for Brands

| Metric | Description | Business Value |
|--------|-------------|----------------|
| **Impressions** | Number of times the trip card was viewed | Brand awareness / reach |
| **Clicks** | Users who clicked the card for details | Interest measurement |
| **Saves** | Users who saved to their Saved Places | Intent to book later |
| **Conversions** | Users who clicked "Book Now" | Actual revenue driver |

---

## Mock Data Updates

Update the mock campaigns in `AdvertiserDashboard.tsx` to include saves:

```typescript
const mockCampaigns: CampaignWithTargeting[] = [
  {
    // ... existing fields
    impressions: 15234,
    clicks: 1203,
    saves: 342,       // NEW
    conversions: 89,
    // ...
  }
];
```

---

## Summary of Changes

1. **SettingsMenu.tsx** - Add 'advertiser' as a settingsType option with inline rendering
2. **AdvertiserSettingsPanel.tsx** (NEW) - Embedded version matching Settings design
3. **CampaignAnalytics.tsx** - Replace CTR with Saves, center both tab groups
4. **CampaignList.tsx** - Replace CTR with Saves in stats grid
5. **AdvertiserDashboard.tsx** - Update standalone page styling for consistency
6. **advertiser.ts** - Add `saves: number` to Campaign interface

---

## Test Plan

1. Open Settings modal
2. Click "Advertiser" tab
3. Verify:
   - Background is black (matches other settings tabs)
   - Gold accents match the Settings modal gold (not yellow-600)
   - Campaigns/Analytics/Settings tabs are centered
   - Performance/Engagement/Top Campaigns sub-tabs are centered
4. Go to Analytics tab
5. Verify 4 metric boxes: Impressions, Clicks, Saves, Conversions (no CTR)
6. Verify styling consistency with Consumer Settings
