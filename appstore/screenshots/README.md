# App Store Screenshots

## Current Status

### iPhone 6.7" (iPhone 15 Pro Max) - 1290 × 2796
Located in `iPhone-6.7/`:
- ✅ `01-home-dashboard.png` - Trip dashboard with active trips
- ✅ `02-trip-chat.png` - Group chat with broadcasts  
- ✅ `03-media-hub.png` - Media gallery

### Recommended Additional Screenshots
- `04-calendar-itinerary.png` - Itinerary/calendar view
- `05-ai-concierge.png` - AI chat assistant
- `06-map-places.png` - Interactive map with saved places
- `07-expense-tracking.png` - Payment splitting
- `08-polls-voting.png` - Group polls

## Screenshot Dimensions

| Device | Resolution | Required |
|--------|------------|----------|
| iPhone 6.7" | 1290 × 2796 | Yes |
| iPhone 6.5" | 1242 × 2688 | Yes |
| iPhone 5.5" | 1242 × 2208 | Optional |
| iPad 12.9" | 2048 × 2732 | If targeting iPad |

## Capture Instructions

### Using Xcode Simulator
1. Run app in simulator: `npx cap run ios`
2. Select device (e.g., iPhone 15 Pro Max)
3. Navigate to screen
4. Cmd + S to screenshot
5. Screenshots save to Desktop by default

### Using Script
```bash
./appstore/scripts/capture-screenshots.sh
```

## Best Practices
- Use demo data for realistic content
- Capture in light/dark mode as appropriate
- Show key features prominently
- Avoid showing status bar clock/battery (Apple may reject)
- Use 100% simulator scale for accurate dimensions
