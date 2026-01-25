
# Crop Travel Intelligence Screenshots

## Problem
The two screenshots in the "Travel Intelligence" section have unwanted content:

### Screenshot 1 (AI Concierge - `ai-concierge.png`)
- **TOP**: Shows description box above the tab bar that needs to be removed
- **BOTTOM**: Shows "vDev - development" text that needs to be removed
- **Desired crop**: Start at the tab bar (Chat, Calendar, Concierge...) and end before the development text

### Screenshot 2 (Places/BaseCamps - `places-maps.png`)  
- **TOP**: Shows description box above the tab bar that needs to be removed
- **Desired crop**: Start at the tab bar (Chat, Calendar, Concierge...)

---

## Solution: CSS Cropping

Apply the same CSS cropping technique used in ProblemSolutionSection - using `overflow-hidden` containers with negative margins to clip unwanted portions.

### File: `src/components/landing/sections/AiFeaturesSection.tsx`

#### Change 1: AI Concierge Screenshot (crop top AND bottom)

```tsx
{/* AI Concierge Screenshot - cropped to tab bar, hiding dev text */}
<motion.div 
  className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300"
  initial={{ opacity: 0, x: -30 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5 }}
  style={{ maxHeight: '420px' }}  // Constrain height to crop bottom
>
  <div style={{ marginTop: '-60px', marginBottom: '-30px' }}>  {/* Crop top and bottom */}
    <img 
      src={aiConcierge} 
      alt="AI Concierge providing personalized recommendations" 
      className="w-full h-auto object-cover"
    />
  </div>
</motion.div>
```

- `marginTop: '-60px'` shifts image up to hide the description box at top
- `marginBottom: '-30px'` crops the bottom to hide "vDev - development"
- `maxHeight: '420px'` constrains container to prevent overflow showing

#### Change 2: Places Screenshot (crop top only)

```tsx
{/* Places Screenshot - cropped to tab bar */}
<motion.div 
  className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-accent/30 transition-all duration-300"
  initial={{ opacity: 0, x: -30 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, delay: 0.1 }}
>
  <div style={{ marginTop: '-60px' }}>  {/* Crop top */}
    <img 
      src={placesMaps} 
      alt="Interactive maps and places discovery" 
      className="w-full h-auto object-cover"
    />
  </div>
</motion.div>
```

- `marginTop: '-60px'` shifts image up to hide the description box at top

---

## Technical Notes

### Why CSS Cropping vs New Images
- **Faster**: No need to create/upload new image assets
- **Adjustable**: Can fine-tune pixel values if cropping isn't perfect
- **Reversible**: Easy to undo if needed

### Pixel Values
The exact crop amounts may need adjustment based on actual image dimensions:
- `marginTop: '-60px'` is an estimate for hiding the description box
- `marginBottom: '-30px'` is an estimate for hiding the dev text
- These can be tweaked after implementation

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/landing/sections/AiFeaturesSection.tsx` | Add CSS cropping to both screenshots |

---

## Visual Result

### AI Concierge Screenshot
- **Before**: Shows description box → tab bar → content → "vDev - development"
- **After**: Shows only tab bar → content (clean, no dev text)

### Places/BaseCamps Screenshot
- **Before**: Shows description box → tab bar → map content
- **After**: Shows only tab bar → map content (clean)
