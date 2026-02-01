
# Fix Color Inconsistency: Standardize to Gold Theme Across App

## Problem Summary

The app has inconsistent button and accent colors across different tabs:

| Location | Current Color | Target Color |
|----------|---------------|--------------|
| Trip Card "View" button | ✅ `from-yellow-500 to-yellow-600` + black text | Keep as-is (reference) |
| Polls "Create Poll" button | `accentColors.gradient` + white text | Gold gradient + **black text** |
| Tasks "Add Task" / "Add First Task" | `bg-orange-600` (orange) | Gold gradient + black text |
| Agenda "Add Session" / "Upload Agenda" | `bg-orange-600` (orange) | Gold gradient + black text |
| Line-up icon | `text-orange-400` (orange) | Gold icon color |
| EventTasksTab icon | `text-orange-400` (orange) | Gold icon color |

**Reference**: The "View" button on trip cards (`TripCard.tsx` line 554):
```
bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold
```

This is the standard gold button styling to apply everywhere.

---

## Root Cause

1. **TripVariantContext.tsx** uses `glass-orange` and `glass-yellow` color tokens that **don't exist** in `tailwind.config.ts`
2. Event-specific components hardcode `bg-orange-600` instead of using the design system gold
3. Polls button uses white text on gold background (low contrast)

---

## Implementation Plan

### 1. Update TripVariantContext.tsx - Fix Consumer Accent Colors

**File**: `src/contexts/TripVariantContext.tsx`

Change the consumer variant from non-existent `glass-orange/glass-yellow` to actual gold colors:

```typescript
// Line 48-53: Change consumer accentColors
: {
    primary: 'yellow-500',
    secondary: 'yellow-600',
    gradient: 'from-yellow-500 to-yellow-600', 
    badge: 'from-yellow-500 to-yellow-600'
  };
```

This makes `accentColors.gradient` resolve to the same gold as the View button.

### 2. Fix Polls "Create Poll" Button Text Color

**File**: `src/components/CommentsWall.tsx`

Line 26-27: Change `text-white` to `text-black`:

```typescript
// Before
className={`...bg-gradient-to-r ${accentColors.gradient} ...text-white...`}

// After
className={`...bg-gradient-to-r ${accentColors.gradient} ...text-black font-semibold...`}
```

### 3. Fix EventTasksTab - Orange to Gold

**File**: `src/components/events/EventTasksTab.tsx`

**Changes**:
- Line 90: Icon color `text-orange-400` → `text-yellow-500`
- Line 102: Button `bg-orange-600 hover:bg-orange-700` → `bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold`
- Line 137: Same button fix for "Add Task" in form
- Line 191: Task number badge `bg-orange-600/20 border-orange-500/50` → `bg-yellow-500/20 border-yellow-500/50`
- Line 192: Task number text `text-orange-400` → `text-yellow-500`
- Line 239: "Add First Task" button - same gold gradient

### 4. Fix AgendaModal - Orange to Gold

**File**: `src/components/events/AgendaModal.tsx`

**Changes**:
- Line 233: "Add Session" button `bg-orange-600 hover:bg-orange-700` → Gold gradient + black text
- Line 557: "Upload Agenda" button `bg-orange-600 hover:bg-orange-700` → Gold gradient + black text
- Line 571: Demo mode indicator `bg-orange-600/10 border-orange-500/20` → `bg-yellow-500/10 border-yellow-500/20`
- Line 572: Demo mode text `text-orange-300` → `text-yellow-300`

### 5. Fix LineupTab - Orange to Gold Icons

**File**: `src/components/events/LineupTab.tsx`

**Changes**:
- Line 27: Header icon `text-orange-400` → `text-yellow-500`
- Line 56: Avatar gradient `from-orange-500 to-pink-500` → `from-yellow-500 to-yellow-600`
- Line 69: Company text `text-orange-400` → `text-yellow-500`
- Line 109: Modal avatar gradient - same gold gradient
- Line 122: Modal company text - same gold color

### 6. Add Lineup Member Creation (for Event Organizers)

**File**: `src/components/events/LineupTab.tsx`

Currently the LineupTab only displays speakers but has no way for organizers to add them. Adding a button and form:

```typescript
// Add after search input (around line 43)
{userRole === 'organizer' && (
  <Button
    onClick={() => setIsAddingMember(true)}
    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
  >
    <Plus size={16} className="mr-2" />
    Add to Line-up
  </Button>
)}

// Add form state and handler for adding lineup members
const [isAddingMember, setIsAddingMember] = useState(false);
const [newMember, setNewMember] = useState({ name: '', title: '', company: '', bio: '' });
```

Add a simple form card that appears when the button is clicked, allowing the organizer to enter name, title, company, and bio.

### 7. Fix EnhancedAgendaTab Button Styling  

**File**: `src/components/events/EnhancedAgendaTab.tsx`

Line 148: Button uses `bg-primary` which should already be gold, but ensure consistency:
- Line 291: "Add Session" submit button - verify gold styling

---

## Standardized Button Class

Create a consistent gold button class to use everywhere:

```css
/* Gold CTA Button - matches Trip Card "View" button */
bg-gradient-to-r from-yellow-500 to-yellow-600 
hover:from-yellow-600 hover:to-yellow-700 
text-black font-semibold 
shadow-lg hover:shadow-yellow-500/25
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/TripVariantContext.tsx` | Update consumer gradient to use yellow-500/600 |
| `src/components/CommentsWall.tsx` | Change poll button text from white to black |
| `src/components/events/EventTasksTab.tsx` | Replace all orange-600 with gold gradient, fix icons |
| `src/components/events/AgendaModal.tsx` | Replace all orange-600 with gold gradient |
| `src/components/events/LineupTab.tsx` | Fix icon/text colors, add "Add to Line-up" button + form |
| `src/components/events/EnhancedAgendaTab.tsx` | Verify button uses consistent gold styling |

---

## Expected Visual Result

After these changes:
- **All primary action buttons** will use the same gold gradient (`from-yellow-500 to-yellow-600`) with black text
- **All accent icons** will use `text-yellow-500` instead of `text-orange-400`
- **Polls, Tasks, Agenda, Line-up** will all match the visual language of the Trip Card "View" button
- **Line-up tab** will allow organizers to add members to the lineup

---

## Test Checklist

1. Navigate to any trip → Polls tab
   - ✓ "Create Poll" button should be gold with black text
2. Navigate to Events trip → Tasks tab
   - ✓ Icon should be gold, not orange
   - ✓ "Add Task" button should be gold with black text
   - ✓ "Add First Task" in empty state should be gold
3. Navigate to Events trip → Agenda tab
   - ✓ "Add Session" button should be gold
   - ✓ "Upload Agenda" button should be gold
4. Navigate to Events trip → Line-up tab
   - ✓ Icon should be gold
   - ✓ Company names should be gold text
   - ✓ Organizers should see "Add to Line-up" button
5. Compare all buttons to Trip Card "View" button
   - ✓ All should match the same gold shade and gradient
