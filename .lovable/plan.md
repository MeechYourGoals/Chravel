
# Revert Chat Message Bubbles to iMessage Blue

## Problem
When updating the landing page theme to black & gold, the global `--primary` color was changed from blue to gold. Since `MessageBubble.tsx` uses `bg-primary` for own-message styling, chat bubbles inadvertently became gold/yellow instead of the intended iMessage-style blue.

## Solution
Add dedicated chat color tokens that are isolated from the global primary color, ensuring chat bubbles remain blue while the landing page keeps its gold theme.

---

## Implementation

### Step 1: Add Chat-Specific Color Tokens
Add new CSS custom properties in `src/index.css` under the `:root` section:

```css
/* iMessage-style chat colors - isolated from landing page theme */
--chat-bubble-own: 210 100% 52%;        /* iMessage blue #007AFF */
--chat-bubble-own-foreground: 0 0% 100%; /* White text */
--chat-bubble-other: 0 0% 20%;           /* Dark gray for received */
--chat-bubble-other-foreground: 0 0% 100%;
```

### Step 2: Update MessageBubble.tsx
Replace the `bg-primary` usage with the new chat-specific tokens:

**Current (line 351-353):**
```tsx
isOwnMessage
  ? 'bg-primary text-primary-foreground'
  : 'bg-muted/80 text-white',
```

**New:**
```tsx
isOwnMessage
  ? 'bg-[hsl(var(--chat-bubble-own))] text-[hsl(var(--chat-bubble-own-foreground))]'
  : 'bg-muted/80 text-white',
```

Alternatively, add Tailwind utility classes in `tailwind.config.ts`:
```js
colors: {
  'chat-own': 'hsl(var(--chat-bubble-own))',
  'chat-own-foreground': 'hsl(var(--chat-bubble-own-foreground))',
}
```

Then use:
```tsx
isOwnMessage
  ? 'bg-chat-own text-chat-own-foreground'
  : 'bg-muted/80 text-white',
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Add `--chat-bubble-own` and related tokens (~4 lines) |
| `tailwind.config.ts` | Add `chat-own` color utilities (optional but cleaner) |
| `src/features/chat/components/MessageBubble.tsx` | Replace `bg-primary` with `bg-chat-own` |

---

## Result
- Chat message bubbles: Blue background with white text (iMessage style)
- Landing page: Keeps gold accents and gold buttons
- Clean separation between app UI colors and marketing theme
