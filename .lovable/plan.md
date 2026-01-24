

# Travel Intelligence Section Copy Update

## Objective
Reposition the "Travel Intelligence" section to emphasize differentiation with context-aware AI, BaseCamps, and Broadcast capabilities. Update header, add subhead, and refresh all feature list items with sharper, more differentiated copy.

---

## File to Modify

| File | Changes |
|------|---------|
| `src/components/landing/sections/AiFeaturesSection.tsx` | Header copy, subhead addition, feature titles and descriptions |

---

## Copy Changes Summary

### Header Section

| Element | Current | New |
|---------|---------|-----|
| Main headline | "Travel Intelligence" | "Travel Intelligence: AI that understands your trip." |
| Subhead | *(none)* | "It reads your itinerary, places, tasks, and group decisions—so answers are actually useful." |

### Feature List 1 (Right of AI Concierge screenshot)

| Current Title | New Title | New Description |
|---------------|-----------|-----------------|
| AI Concierge | Context-Aware Concierge | "AI that understands your trip — not just your question." |
| Payment Summaries | Payment Tracking | "Keep track of who owes what, without the spreadsheets" |
| Polls | Decision Lock-In | "Persistent Poll View: No more scrolling to see who voted on what 3 weeks ago." |

### Feature List 2 (Right of Places screenshot)

| Current Title | New Title | New Description |
|---------------|-----------|-----------------|
| BaseCamps | BaseCamps *(unchanged)* | "No more fumbling to find the Airbnb or hotel address. Store it once for all trip members." *(keep as-is)* |
| Smart Notifications | Relevant Notifications | "Important updates without the message overload. You choose what matters" |
| AI Trip Summaries | Chravel Recap PDFs | "Overwhelmed or want to Share off App? Get a Simple Summary PDF of the trip" |

---

## Code Changes

### Lines 9-25 - Update aiFeatures1 array:

```typescript
const aiFeatures1 = [
  {
    icon: <Wand2 className="text-accent" size={28} />,
    title: 'Context-Aware Concierge',
    description: 'AI that understands your trip — not just your question.'
  },
  {
    icon: <DollarSign className="text-primary" size={28} />,
    title: 'Payment Tracking',
    description: 'Keep track of who owes what, without the spreadsheets'
  },
  {
    icon: <BarChart3 className="text-accent" size={28} />,
    title: 'Decision Lock-In',
    description: 'Persistent Poll View: No more scrolling to see who voted on what 3 weeks ago.'
  }
];
```

### Lines 28-44 - Update aiFeatures2 array:

```typescript
const aiFeatures2 = [
  {
    icon: <Compass className="text-primary" size={28} />,
    title: 'BaseCamps',
    description: 'No more fumbling to find the Airbnb or hotel address. Store it once for all trip members.'
  },
  {
    icon: <BellRing className="text-accent" size={28} />,
    title: 'Relevant Notifications',
    description: 'Important updates without the message overload. You choose what matters'
  },
  {
    icon: <ScrollText className="text-primary" size={28} />,
    title: 'Chravel Recap PDFs',
    description: 'Overwhelmed or want to Share off App? Get a Simple Summary PDF of the trip'
  }
];
```

### Lines 68-81 - Update header section:

```tsx
<motion.div 
  className="text-center space-y-4 max-w-4xl"
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5 }}
>
  <h2
    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
  >
    Travel Intelligence: AI that understands your trip.
  </h2>
  <p
    className="text-lg sm:text-xl md:text-2xl text-white/90 font-medium max-w-3xl mx-auto"
    style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
  >
    It reads your itinerary, places, tasks, and group decisions—so answers are actually useful.
  </p>
</motion.div>
```

---

## Visual Summary

### Before
```
┌──────────────────────────────────────────────────────────────┐
│                    Travel Intelligence                        │
│                                                               │
│  [Screenshot]  │  AI Concierge                                │
│                │  Payment Summaries                           │
│                │  Polls                                       │
│                                                               │
│  [Screenshot]  │  BaseCamps                                   │
│                │  Smart Notifications                         │
│                │  AI Trip Summaries                           │
└──────────────────────────────────────────────────────────────┘
```

### After
```
┌──────────────────────────────────────────────────────────────┐
│       Travel Intelligence: AI that understands your trip.    │
│  It reads your itinerary, places, tasks, and group decisions │
│              —so answers are actually useful.                 │
│                                                               │
│  [Screenshot]  │  Context-Aware Concierge                     │
│                │  Payment Tracking                            │
│                │  Decision Lock-In                            │
│                                                               │
│  [Screenshot]  │  BaseCamps                                   │
│                │  Relevant Notifications                      │
│                │  Chravel Recap PDFs                          │
└──────────────────────────────────────────────────────────────┘
```

---

## No Regressions

- Screenshots remain unchanged (aiConcierge.png, placesMaps.png)
- Layout structure preserved (2 rows, screenshot + 3 pills each)
- Animation variants unchanged
- Styling and responsive behavior preserved
- Icons remain the same for each feature

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Header reads "Travel Intelligence: AI that understands your trip." |
| 2 | Subhead reads "It reads your itinerary, places, tasks, and group decisions—so answers are actually useful." |
| 3 | "AI Concierge" renamed to "Context-Aware Concierge" |
| 4 | "Payment Summaries" renamed to "Payment Tracking" with new description |
| 5 | "Polls" renamed to "Decision Lock-In" with new description |
| 6 | "BaseCamps" title and description unchanged |
| 7 | "Smart Notifications" renamed to "Relevant Notifications" with new description |
| 8 | "AI Trip Summaries" renamed to "Chravel Recap PDFs" with new description |
| 9 | Screenshots and layout preserved |
| 10 | All animations and styling maintained |

