# App Store Screenshots

## Current Status - COMPLETE ✅

All required App Store assets have been generated and are ready for submission.

### App Icon (1024x1024) ✅
Located in: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- `AppIcon-1024x1024.png` - Main app icon for App Store

### Splash Screen ✅
Located in: `ios/App/App/Assets.xcassets/Splash.imageset/`
- `splash-2732x2732-new.png` - Launch screen image

---

## iPhone 6.7" Screenshots (iPhone 15 Pro Max) - 1290 × 2796 ✅
Located in `iPhone-6.7/`:
- ✅ `01-home-dashboard.png` - Trip dashboard with active trips
- ✅ `02-trip-chat.png` - Group chat with messages
- ✅ `03-calendar-itinerary.png` - Calendar/itinerary view
- ✅ `04-ai-concierge.png` - AI assistant chat
- ✅ `05-expense-splitting.png` - Payment/expense splitting
- ✅ `06-maps-places.png` - Maps with saved places
- ✅ `07-media-gallery.png` - Shared photo albums
- ✅ `08-polls-voting.png` - Group polls feature

---

## iPhone 6.5" Screenshots (iPhone 11 Pro Max) - 1242 × 2688
Located in `iPhone-6.5/`:
> **Note:** Use iPhone 6.7" screenshots - Apple accepts 6.7" for 6.5" display

---

## iPad Pro 12.9" Screenshots - 2048 × 2732 ✅
Located in `iPad-Pro-12.9/`:
- ✅ `01-home-dashboard.png` - Trip dashboard (tablet layout)
- ✅ `02-trip-chat.png` - Channel-based chat (sidebar)
- ✅ `03-calendar-itinerary.png` - Calendar view (full width)
- ✅ `04-maps-places.png` - Maps with saved places

---

## Screenshot Dimensions Reference

| Device | Resolution | Status |
|--------|------------|--------|
| iPhone 6.7" | 1290 × 2796 | ✅ Complete (8 screenshots) |
| iPhone 6.5" | 1242 × 2688 | ✅ Use 6.7" screenshots |
| iPhone 5.5" | 1242 × 2208 | Optional |
| iPad 12.9" | 2048 × 2732 | ✅ Complete (4 screenshots) |

---

## Upload Instructions

### For App Store Connect:

1. **Go to**: App Store Connect → Your App → App Store → Screenshots
2. **Upload iPhone screenshots** to "iPhone 6.7" Display" section
3. **Upload iPad screenshots** to "iPad Pro 12.9" Display" section
4. Apple will auto-scale for other device sizes

### Using Fastlane (Automated):

```bash
cd ios-release
fastlane deliver --screenshots_path ../appstore/screenshots
```

---

## Asset Locations Summary

```
appstore/
├── screenshots/
│   ├── iPhone-6.7/          # 8 iPhone screenshots
│   ├── iPhone-6.5/          # (uses 6.7" screenshots)
│   ├── iPad-Pro-12.9/       # 4 iPad screenshots
│   └── README.md            # This file
│
ios/App/App/Assets.xcassets/
├── AppIcon.appiconset/
│   └── AppIcon-1024x1024.png  # App icon
└── Splash.imageset/
    └── splash-2732x2732-new.png  # Splash screen
```

---

## Best Practices Applied

- ✅ Dark theme matching app design
- ✅ Feature headlines on each screenshot
- ✅ Consistent branding (Chravel blue #3A60D0)
- ✅ Real UI mockups (not generic placeholders)
- ✅ Covers key features: trips, chat, calendar, AI, payments, maps, media, polls
