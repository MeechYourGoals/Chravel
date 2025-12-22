# App Store Screenshot Guide

## Required Screenshots for App Store Submission

You need 3-10 screenshots for each device size. Capture these specific screens to showcase all features.

## Screenshot List (Priority Order)

### Screenshot 1: Trip Dashboard
**Purpose:** Show main interface and trip variety

**What to capture:**
- Multiple active trips (Consumer, Pro, Event types)
- Clean trip cards with images
- Bottom navigation visible
- User avatar/profile in top corner

**Device sizes needed:**
- 6.7" iPhone (1290 x 2796) - iPhone 15 Pro Max
- 6.5" iPhone (1284 x 2778) - iPhone 14 Plus
- 5.5" iPhone (1242 x 2208) - iPhone 8 Plus

---

### Screenshot 2: Itinerary Builder
**Purpose:** Demonstrate core planning features

**What to capture:**
- Drag-and-drop timeline interface
- Multiple events with times
- Location pins on events
- "Add Activity" button visible
- Conflict detection indicator (if available)

---

### Screenshot 3: Group Chat
**Purpose:** Show real-time collaboration

**What to capture:**
- Active conversation with multiple participants
- @mentions highlighted
- Typing indicators at bottom
- Message reactions (❤️, 👍)
- Voice note or media message
- Translation icon visible

---

### Screenshot 4: Travel Wallet
**Purpose:** Showcase unique loyalty program feature

**What to capture:**
- Loyalty Programs section with airline logo
- At least 2 loyalty programs (airline, hotel)
- Membership numbers visible (mock data)
- "Add Loyalty Program" button
- Payment methods section below

---

### Screenshot 5: Expense Tracking
**Purpose:** Highlight expense splitting

**What to capture:**
- Expense list with multiple transactions
- Split calculation visible
- OCR receipt scanning indicator
- Payment status indicators (Paid, Pending)
- Currency symbols showing multi-currency support

---

### Screenshot 6: Interactive Map
**Purpose:** Show location features

**What to capture:**
- Trip map with custom pins
- Route lines between locations
- Location detail popup open
- "Directions" button visible
- Map controls (zoom, layers)

---

### Screenshot 7: Game/Show Schedule (Pro feature)
**Purpose:** Demonstrate enterprise scheduling

**What to capture:**
- Calendar view with multiple games/shows
- Venue details visible
- Team/tour name at top
- SmartImport button or feature
- Status indicators (Confirmed, TBD)
- Pro badge or indicator

---

### Screenshot 8: Saved Recommendations
**Purpose:** Show personalized travel library

**What to capture:**
- Grid of saved places with images
- "Add to Trip" buttons on cards
- Category tags (Restaurant, Activity, Hotel)
- Heart/save icons
- Search bar at top

---

### Screenshot 9: Team Management (Pro feature)
**Purpose:** Highlight organization features

**What to capture:**
- Organization members list
- Role badges (Admin, Crew, Talent)
- "Invite Members" button
- Email invitation interface
- Department filters (if available)
- Pro badge

---

### Screenshot 10: Archive Dashboard
**Purpose:** Show trip history management

**What to capture:**
- Archived trips organized by type
- Restore button on trips
- Trip count indicators
- "Archive Trip" action visible
- Past trip dates shown

---

## How to Capture Screenshots

### Using Xcode Simulator

1. **Open Xcode and run the app:**
   ```bash
   npx cap open ios
   # Select simulator: Product → Destination → iPhone 15 Pro Max
   # Press Cmd + R to run
   ```

2. **Navigate to each feature screen**
   - Create demo data first (see Demo Account Setup below)
   - Navigate to each feature systematically

3. **Take screenshots:**
   - Press `Cmd + S` while simulator is focused
   - Screenshots save to Desktop automatically
   - Rename files clearly: `01-trip-dashboard.png`

4. **Repeat for other device sizes:**
   - iPhone 14 Plus (6.5")
   - iPhone 8 Plus (5.5")

### Screenshot Dimensions Reference

| Device | Size | Resolution |
|--------|------|------------|
| iPhone 15 Pro Max | 6.7" | 1290 x 2796 |
| iPhone 14 Plus | 6.5" | 1284 x 2778 |
| iPhone 8 Plus | 5.5" | 1242 x 2208 |

---

## Demo Data Setup

Before taking screenshots, create this test data:

### Consumer Account Demo Data
```
Email: demo@chravel.com
Password: DemoTrip2025!

Trips to Create:
1. "Hawaii Family Vacation" (5 participants)
   - 3 itinerary events
   - 2 expenses ($234.50 total)
   - 5 chat messages
   - 3 saved places

2. "Bachelor Party - Vegas" (8 participants)
   - 4 itinerary events
   - Pool party, dinner, show, nightclub
   - 4 expenses with splits
   - Active chat conversation

3. "Europe Backpacking" (3 participants)
   - 7-day itinerary
   - Multiple cities (Paris, Rome, Berlin)
   - Archived status

Travel Wallet:
- United MileagePlus: #MP1234567
- Marriott Bonvoy: #12345678901
- Hertz Gold Plus: #GP123456

Saved Recommendations:
- "Sunset Grill" (Restaurant, Hawaii)
- "Snorkeling Tour" (Activity, Hawaii)
- "Grand Canyon Helicopter" (Activity, Vegas)
- "Louvre Museum" (Activity, Paris)
- "Colosseum" (Activity, Rome)
```

### Pro Account Demo Data
```
Email: pro-demo@chravel.com  
Password: ProDemo2025!

Organization: "Demo Sports Team"

Members:
- John Smith (Head Coach)
- Sarah Johnson (Athletic Trainer)
- Mike Williams (Equipment Manager)
- Emily Davis (Team Coordinator)
+ 6 more with various roles

Game Schedule:
- 8 upcoming games with venues
- Mix of home/away games
- Status: Confirmed, TBD
- SmartImport with dates visible

Travel Wallet (Org-level):
- Team airline account
- Team hotel loyalty program
```

---

## Screenshot Best Practices

### Do's ✅
- Use realistic but fake data (names, numbers)
- Show features in use, not empty states
- Include context (nav bars, buttons)
- Use light mode for consistency (unless dark mode is key feature)
- Show 2-3 participants in group features
- Make text large enough to read when scaled down

### Don'ts ❌
- Don't show personal information
- Don't use Lorem Ipsum text
- Don't show error messages
- Don't crop important UI elements
- Don't use screenshots with low quality images
- Don't show unrealistic data (999+ messages)

---

## Screenshot File Naming Convention

Use this naming pattern for organization:

```
{number}-{feature}-{device}.png

Examples:
01-trip-dashboard-6.7.png
01-trip-dashboard-6.5.png
01-trip-dashboard-5.5.png
02-itinerary-builder-6.7.png
02-itinerary-builder-6.5.png
...
```

---

## Uploading to App Store Connect

1. **Go to App Store Connect:**
   - Navigate to your app → Version → App Store tab

2. **Select device size:**
   - Click "+ Add Screenshots" under each device size

3. **Drag and drop:**
   - Upload all screenshots for that size
   - Reorder by dragging if needed

4. **Verify:**
   - Screenshots appear in order
   - Images are clear and properly sized
   - No error messages about dimensions

---

## Optional: Adding Text Overlays

Consider adding text overlays to highlight features:

### Example Overlay Text:
- Screenshot 1: "Plan trips for any occasion"
- Screenshot 2: "Build itineraries together"
- Screenshot 3: "Stay in sync with chat"
- Screenshot 4: "Store loyalty programs securely"
- Screenshot 5: "Split expenses effortlessly"

### Tools for Adding Text:
- **Figma** (free, web-based)
- **Canva** (free templates)
- **Apple Keynote** (built-in)
- **Adobe Express** (free tier)

---

## Preview Screenshots Before Upload

Use these tools to preview how screenshots look in App Store:

- **App Store Screenshot Preview:** https://www.appstorescreenshot.com/
- **Preview on Device:** Transfer screenshots to iPhone and view in Photos

---

## Troubleshooting

### "Screenshots are the wrong size"
**Solution:** Check that simulator matches required device exactly

### "Screenshots look blurry"
**Solution:** Capture at 100% simulator scale, not 50% or 75%

### "Can't take screenshots"
**Solution:** Ensure simulator window is focused when pressing Cmd + S

### "Screenshots rejected by Apple"
**Solution:** Ensure they show actual app functionality, not just splash screens

---

**Last Updated:** 2025-01-XX  
**Required for:** App Store submission  
**Estimated Time:** 2-3 hours to capture all screenshots with demo data
