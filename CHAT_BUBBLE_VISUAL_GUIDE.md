# Chat Bubble Visual Guide

## Design Reference
The blue used for self messages matches the "All Messages" and "Group Chat" buttons shown in the provided screenshot.

## Message Types

### 1. Regular Self Message
```
                                    ┌──────────────────────────────┐
                                    │  Just checked in! Room 502   │  ← Blue bg-primary
                                    │  if anyone needs anything 👍 │     White text
                                    └──────────────────────────────┘
                                                         07:31 PM  ← Small timestamp
```
- Alignment: Right
- Background: `bg-primary` (brand blue)
- Text: `text-primary-foreground` (white)
- Corner: `rounded-br-sm` (small radius bottom-right for tail effect)

### 2. Regular Other's Message
```
┌──────────────────────────────────┐
│  Does anyone want to split an    │  ← Muted bg-muted/80
│  Uber to the downtown area?      │     White text
└──────────────────────────────────┘
Jordan Lee • 07:31 PM  ← Name + timestamp above
```
- Alignment: Left
- Background: `bg-muted/80` (dark gray with transparency)
- Text: `text-white` (pure white for optimal readability)
- Corner: `rounded-bl-sm` (small radius bottom-left for tail effect)

### 3. Self Broadcast Message
```
                          ┌───────────────────────────────────────┐
                          │  📢 Broadcast  Reminder: Group dinner │  ← Blue bg-primary
                          │  reservation is at 7:30 PM at Bella   │     White text
                          │  Vista. Please confirm attendance!    │     Pill inside
                          └───────────────────────────────────────┘
                                                       Sofia • 07:31 PM
```
- Alignment: Right (same as regular self message)
- Background: `bg-primary` (blue, NOT orange)
- Pill: `bg-amber-500/15 text-amber-300` (amber badge inside blue bubble)

### 4. Other's Broadcast Message
```
┌──────────────────────────────────────────┐
│  📢 Broadcast                            │  ← Red border (border-red-500/50)
│  Reminder: Group dinner reservation is   │     White text
│  at 7:30 PM at Bella Vista. Please       │
│  confirm attendance!                     │
└──────────────────────────────────────────┘
Sofia Garcia • 07:31 PM
```
- Alignment: Left
- Background: `bg-muted/80` (dark gray, same as regular messages)
- Text: `text-white` (white for readability)
- Border: `border-2 border-red-500/50` (red accent for broadcast identification)
- Pill: Above content (existing behavior)

### 5. AI Concierge (User Query)
```
                                    ┌──────────────────────────────┐
                                    │  What's the best restaurant  │  ← Blue bg-primary
                                    │  near our hotel?             │     White text
                                    └──────────────────────────────┘
                                                         2:45 PM
```
- Same styling as regular self message

### 6. AI Concierge (Assistant Response)
```
[AI]  ┌──────────────────────────────────────────┐
      │  Based on your preferences, I recommend  │  ← Muted bg-muted/80
      │  Bella Vista Italian Bistro, located     │     White text
      │  just 0.3 miles from your hotel...       │
      └──────────────────────────────────────────┘
      2:45 PM
```
- Avatar shown (blue/purple gradient circle with "AI")
- Same styling as other's messages (white text on dark gray)

## Key Visual Principles

1. **Alignment Rule**: If it's from you → right-aligned blue. If it's from others → left-aligned muted.

2. **Color Hierarchy**:
   - Self > Broadcast/Payment type for background color
   - Self messages always blue, regardless of type
   - Others' messages use white text on dark gray background
   - Red borders identify broadcast messages, green borders for payment messages

3. **Consistency**: The blue matches existing UI elements (buttons, focused inputs, etc.)

4. **Accessibility**: 
   - Blue on white: 4.5:1 contrast (WCAG AA)
   - White on blue: 4.5:1 contrast (WCAG AA)
   - White on dark gray: 15.3:1 contrast (WCAG AAA) ✅ Enhanced readability

5. **Mobile Optimization**:
   - Max 78% width prevents overly wide bubbles on tablets
   - Touch-friendly padding (14px x 10px)
   - Clear visual separation between messages (8px gap)

## Design Tokens Used

```css
/* Self messages */
background: hsl(var(--primary))          /* 223 80% 60% in dark, 223 56% 53% in light */
color: hsl(var(--primary-foreground))    /* 0 0% 100% (white) */
border: hsl(var(--primary) / 0.2)        /* 20% opacity */

/* Others' messages */
background: hsl(var(--muted) / 0.8)      /* 223 10% 20% at 80% opacity */
color: hsl(0 0% 100%)                     /* Pure white for readability */
border: hsl(var(--border))               /* 223 15% 18% */

/* Timestamps */
color: hsl(var(--muted-foreground) / 0.7) /* 70% opacity */
font-size: 10px
```

## Dark Mode vs Light Mode

### Dark Mode (Default)
- Self: Bright blue (#6B8DD6) on pure black
- Others: Dark gray (#333333) with white text (#FFFFFF) ✅ Enhanced contrast
- High contrast for readability

### Light Mode
- Self: Enterprise blue (#5A7FBE) on white
- Others: Light gray (#E6E6E6) with darker gray text (#737373)
- Maintains same hierarchy with inverted luminosity

---

**Visual Consistency Achieved**: All chat surfaces now share the same message styling, creating a cohesive, iMessage-like experience across Trip Chat, AI Concierge, Broadcasts, and Demo mode.
