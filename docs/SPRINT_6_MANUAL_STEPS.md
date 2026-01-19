# Sprint 6: App Store Submission Assets - Manual Steps

**Status**: Sprint 6 of 6 (Final Sprint)
**Goal**: Prepare all metadata, screenshots, icons, and submission materials for App Store Connect
**Prerequisites**: Sprints 1-5 completed, TestFlight build successfully deployed

---

## Overview

This sprint covers the final assets and metadata required to submit Chravel to the App Store for public release. All work is done in **App Store Connect** web interface.

**Deliverables**:
- Screenshot sets for 3 device sizes (6.7", 6.5", 5.5")
- App Store description, subtitle, keywords
- App icon (1024x1024 PNG)
- Support, marketing, and privacy URLs
- Release notes
- App Store submission for review

---

## Section 1: App Store Screenshots

### Requirements

Apple requires screenshots for **at least one device size** in each family, but best practice is to provide all sizes for optimal display.

| Device Size | Resolution | Required | Display Devices |
|-------------|-----------|----------|-----------------|
| **6.7"** | 1290 x 2796 | ✅ Yes | iPhone 15 Pro Max, 15 Plus, 14 Pro Max, 14 Plus |
| **6.5"** | 1242 x 2688 | ✅ Yes | iPhone 11 Pro Max, XS Max |
| **5.5"** | 1242 x 2208 | ✅ Yes | iPhone 8 Plus, 7 Plus |
| 6.1" | 1179 x 2556 | No | iPhone 15, 14 |
| 5.8" | 1125 x 2436 | No | iPhone X, XS, 11 Pro |

**Chravel Strategy**: Provide screenshots for **6.7", 6.5", and 5.5"** to cover all size classes.

### Content Guidelines

**Screenshot Count**: 3-10 screenshots per device size (recommended: 5-8)

**Recommended Screens to Capture**:
1. **Trip Map View** - Showcase the core Google Maps integration with trip locations
2. **Chat Interface** - Show group chat with messages and media
3. **Calendar with Events** - Display trip timeline with scheduled activities
4. **Places Tab** - Show location recommendations and place details
5. **Payments Split** - Demonstrate expense splitting and payment tracking
6. **Polls** - Show voting interface for group decisions
7. **Media Gallery** - Display photo/video collection from trip
8. **Concierge Assistant** - Show AI assistant helping with trip planning

**Best Practices**:
- Use **sample data** that looks realistic but doesn't expose real user information
- Add **text overlays** explaining key features (optional but recommended)
- Show **diverse use cases** (weekend trip, international trip, large group)
- Ensure UI is in **final state** (no loading spinners, no empty states)
- Use **light mode** for consistency (or provide dark mode variants)

### Screenshot Generation Methods

#### Method 1: Xcode Simulator (Recommended)

```bash
# 1. Open Xcode and run on specific simulator
open -a Simulator

# 2. In Simulator menu: Window → Select Device
# Choose: iPhone 15 Pro Max (6.7")

# 3. Build and run Chravel
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 15 Pro Max' build

# 4. Navigate to each screen and capture
# Method A: Simulator menu → File → New Screen Shot (Cmd+S)
# Method B: macOS Screenshot tool (Cmd+Shift+4)

# 5. Repeat for other device sizes:
# - iPhone 11 Pro Max (6.5")
# - iPhone 8 Plus (5.5")
```

**Simulator Output Location**: `~/Desktop/Simulator Screen Shot - [Device] - [Date].png`

#### Method 2: Physical Device Capture

```bash
# 1. Connect iPhone via USB
# 2. Open Xcode → Window → Devices and Simulators
# 3. Select your device → Take Screenshot button
# 4. Screenshot saved to ~/Desktop
```

**Advantage**: Captures real haptic feedback, actual performance, authentic lighting

#### Method 3: Fastlane Screenshots (Automated)

```bash
# Install fastlane-plugin-snapshot
cd ios-release
bundle exec fastlane add_plugin snapshot

# Create Snapfile
cat > fastlane/Snapfile << 'EOF'
devices([
  "iPhone 15 Pro Max",
  "iPhone 11 Pro Max",
  "iPhone 8 Plus"
])

languages([
  "en-US"
])

output_directory("./screenshots")

clear_previous_screenshots(true)

override_status_bar(true)
EOF

# Run snapshot
bundle exec fastlane snapshot
```

**Note**: Requires UI tests (XCUITest) to navigate screens automatically. Manual capture is faster for first submission.

### Screenshot Editing

**Tools**:
- **macOS Preview**: Basic cropping, annotations
- **Figma**: Professional overlays, device frames, text
- **Sketch**: App Store template with device mockups
- **App Store Screenshot Generator**: Online tools like AppLaunchpad

**Recommended Edits**:
1. **Add device frame** (optional) - Makes screenshots look professional
2. **Add text overlays** (optional) - "Plan trips together", "Split expenses easily"
3. **Ensure status bar** shows full signal, WiFi, battery
4. **Remove sensitive data** - No real emails, phone numbers, locations

**Export Settings**:
- Format: PNG (required by App Store Connect)
- Color Profile: sRGB or Display P3
- Quality: Lossless (do not compress)

### Upload to App Store Connect

1. **Login**: https://appstoreconnect.apple.com
2. **Navigate**: My Apps → Chravel → App Store tab
3. **Select Version**: 1.0 Prepare for Submission
4. **Scroll to**: App Preview and Screenshots section
5. **For each device size**:
   - Click "+" to add screenshots
   - Upload 5-8 screenshots in order
   - Drag to reorder (first screenshot is most important)
   - Add captions (optional, rarely used)

**Tips**:
- First screenshot is used for App Store search results
- Show the most compelling feature first (Trip Map or Chat)
- Maintain consistent visual style across all screenshots

---

## Section 2: App Store Copy

### App Name

**Current**: `Chravel`
**Character Limit**: 30 characters
**Status**: ✅ Already configured in `ios-release/fastlane/Deliverfile`

**Guidelines**:
- Must match Bundle Display Name in `Info.plist`
- Cannot include promotional text or pricing
- Cannot violate trademarks

### Subtitle

**Character Limit**: 30 characters
**Purpose**: Brief description shown below app name in search results

**Recommended Subtitle**:
```
Group Travel & Trip Planning
```

**Alternatives**:
- `Plan trips with friends`
- `Travel together, simplified`
- `Group trip coordination`

**Guidelines**:
- Describe core functionality
- Use keywords for App Store search optimization
- No promotional language ("best", "free", "#1")

### Description

**Character Limit**: 4000 characters
**Current Status**: Needs to be written

**Recommended Description**:

```
Chravel makes planning group trips effortless. Whether you're organizing a weekend getaway, international adventure, or bachelor party, Chravel keeps everyone connected and on the same page.

KEY FEATURES

📍 SHARED TRIP MAP
• See all trip locations on an interactive map
• Add places to visit, restaurants, and activities
• Get AI-powered recommendations based on your group's interests

💬 GROUP CHAT
• Real-time messaging with everyone on your trip
• Share photos and videos instantly
• React to messages and keep conversations organized

📅 TRIP CALENDAR
• Coordinate schedules with shared calendar
• Create events with location, time, and notes
• Set up recurring activities (daily breakfast, nightly meetups)

💰 EXPENSE SPLITTING
• Track shared expenses and split bills fairly
• Support for multiple currencies
• See who owes what at a glance
• Settle up easily with integrated payment requests

🗳️ GROUP POLLS
• Make decisions together with polls
• Choose destinations, restaurants, or activities
• Everyone gets a vote

✅ TASK MANAGEMENT
• Create shared to-do lists
• Assign tasks to trip members
• Track progress and stay organized

🤖 AI CONCIERGE
• Get personalized trip recommendations
• Ask questions about destinations
• Plan itineraries with AI assistance

📸 SHARED MEDIA
• Collect all trip photos and videos in one place
• Automatic organization by location and date
• Download albums to keep memories forever

PERFECT FOR
• Weekend getaways with friends
• Family vacations
• Bachelor/bachelorette parties
• Work retreats and conferences
• International group travel
• Road trips and camping adventures

WHY CHRAVEL?
Unlike group chats that get messy and spreadsheets that get lost, Chravel is purpose-built for group travel. Everything you need—communication, planning, expenses, and memories—in one beautiful app.

SUBSCRIPTION OPTIONS
Chravel offers two subscription tiers:
• Explorer: Basic features for casual travelers
• Frequent Chraveler: Premium features including unlimited trips, AI concierge, and priority support

Free trial available. Subscriptions managed through App Store and can be cancelled anytime.

PRIVACY & SECURITY
• End-to-end encryption for sensitive data
• No ads, no data selling
• Privacy policy: https://chravel.app/privacy

SUPPORT
Questions or feedback? Contact us at support@chravel.app or visit https://chravel.app/support
```

**Character Count**: ~2,100 characters (leaves room for future additions)

**Best Practices**:
- **Front-load benefits**: First 2-3 lines are most important (shown in collapsed view)
- **Use emojis sparingly**: Makes features scannable but avoid overuse
- **Include keywords naturally**: "group travel", "trip planning", "expense splitting"
- **Mention subscriptions**: Required if app has IAP
- **Link to privacy policy**: Builds trust
- **Call to action**: Encourage download without being salesy

### Keywords

**Character Limit**: 100 characters (comma-separated, no spaces)
**Current Status**: Needs to be written

**Recommended Keywords**:
```
group travel,trip planner,expense split,travel chat,itinerary,vacation,group chat,travel planning,trip organizer,shared calendar
```

**Character Count**: 100 characters (exact limit)

**Keyword Strategy**:
- **Focus on functionality**: What users search for, not brand names
- **Avoid duplicates**: Don't repeat words from app name/subtitle
- **No spaces after commas**: Maximizes character limit
- **Research competitors**: Check Travel category top apps
- **Think user intent**: "group travel" not "travel app"

**Keywords to Avoid**:
- Competitor names (TripIt, Splitwise)
- Generic terms (app, best, free)
- Trademarked terms (Google, Apple)
- Irrelevant categories (gaming, dating)

**Testing Keywords**:
1. Use Apple Search Ads Keyword Planner: https://searchads.apple.com
2. Check search popularity for each term
3. Monitor post-launch via App Analytics → Sources → App Store Search

### Promotional Text

**Character Limit**: 170 characters
**Purpose**: Editable without new version submission (great for announcements)

**Recommended Promotional Text**:
```
🎉 Now with AI Trip Planning! Get personalized recommendations and instant answers. Try Chravel free for 7 days and make your next group trip unforgettable.
```

**Character Count**: 168 characters

**Best Practices**:
- Update seasonally ("Summer road trips made easy")
- Highlight new features
- Include call to action
- Can be changed anytime without app review

### Release Notes (What's New)

**Character Limit**: 4000 characters
**Purpose**: Shown to users when updating app

**For Version 1.0 (Initial Release)**:
```
Welcome to Chravel! 🎉

This is the first public release of Chravel, the ultimate app for planning group trips and making memories with friends and family.

WHAT'S INCLUDED:
✅ Shared trip maps with Google integration
✅ Real-time group chat with media sharing
✅ Coordinated calendars and event planning
✅ Easy expense splitting with multi-currency support
✅ Group polls for making decisions together
✅ Shared task management
✅ AI concierge for trip recommendations
✅ Beautiful media galleries to preserve memories

We've been testing Chravel with hundreds of travelers and can't wait for you to try it. Download now and start planning your next adventure!

Questions? Reach us at support@chravel.app

Happy travels! ✈️
The Chravel Team
```

**For Future Updates (Example v1.1)**:
```
NEW IN THIS UPDATE:

🗺️ Offline Maps
• Download maps for offline access during travel
• View trip locations without internet connection

💬 Message Reactions
• React to messages with emojis
• See who reacted to each message

📸 Improved Media Uploads
• Faster photo uploads
• Support for HEIC format
• Better compression for shared albums

🐛 Bug Fixes
• Fixed issue with calendar event notifications
• Improved expense calculation accuracy
• Resolved crash when viewing large trip archives

As always, thank you for using Chravel! Share your feedback at support@chravel.app
```

### Copyright

**Required Field**: Company name or developer name

**Recommended**:
```
2025 Chravel Inc.
```

or (if sole proprietor):
```
2025 Meech [Last Name]
```

**Note**: Year updates automatically each January in App Store Connect

---

## Section 3: App Icon

### Requirements

**Size**: 1024 x 1024 pixels
**Format**: PNG (no transparency)
**Color Space**: sRGB or Display P3
**Layers**: Flattened (single layer)

**Guidelines**:
- No alpha channel (no transparency)
- No rounded corners (iOS applies automatically)
- No text unless part of logo
- Recognizable at small sizes (test at 60x60)
- Consistent with brand guidelines

### Current Icon Location

```bash
# iOS app icon set
ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Contains multiple sizes for different contexts:
# - 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024
```

### Exporting from Design Tool

#### From Figma

1. Select app icon frame (1024x1024)
2. Right-click → Export
3. Format: PNG
4. Scale: 1x (not 2x)
5. Settings: Uncheck "Include 'id' attribute"
6. Download

#### From Sketch

1. Select icon artboard
2. Make Exportable → + (add export option)
3. Format: PNG
4. Size: 1x
5. Export Selected

#### From Adobe Illustrator

1. File → Export → Export for Screens
2. Format: PNG
3. Scale: 1x
4. Canvas: 1024x1024
5. Color Space: sRGB
6. Export

### Icon Best Practices

**Visual Design**:
- Use bold, simple shapes (recognizable at 60x60)
- Avoid fine details or small text
- High contrast between foreground and background
- Test on various wallpapers (light, dark, colorful)

**Brand Consistency**:
- Match website and marketing materials
- Use company brand colors
- Maintain visual identity across platforms

**Testing**:
```bash
# Preview icon at multiple sizes
sips -z 60 60 AppIcon-1024.png --out AppIcon-60.png
sips -z 120 120 AppIcon-1024.png --out AppIcon-120.png
sips -z 180 180 AppIcon-1024.png --out AppIcon-180.png

# View in Finder at different sizes
open AppIcon-60.png AppIcon-120.png AppIcon-180.png
```

### Upload to App Store Connect

**Location**: App Store → App Information → App Icon

1. Navigate to App Store Connect → Chravel
2. Click "App Information" (left sidebar)
3. Scroll to "App Icon" section
4. Click "Choose File"
5. Upload 1024x1024 PNG
6. Click "Save"

**Important**: This is separate from the icon in Xcode. The App Store Connect icon is used for:
- App Store search results
- App Store product page
- App Analytics

---

## Section 4: Support and Marketing URLs

### Required URLs

All URLs must be **HTTPS** and **publicly accessible**.

| URL Type | Required | Purpose | Recommended URL |
|----------|----------|---------|-----------------|
| **Support URL** | ✅ Yes | Customer support, help articles | `https://chravel.app/support` |
| **Privacy Policy** | ✅ Yes | Data collection and usage | `https://chravel.app/privacy` |
| **Marketing URL** | ❌ No | Landing page for app | `https://chravel.app` |

**Current Status**: Already configured in `ios-release/fastlane/Deliverfile` (lines 74-81)

### Support URL Content

**Minimum Requirements**:
- Contact email: support@chravel.app
- FAQ section addressing common questions
- Troubleshooting guides for common issues
- Link to terms of service

**Recommended Content Sections**:

```markdown
# Chravel Support

## Getting Started
- How to create your first trip
- Inviting friends to your trip
- Navigating the app interface

## Features
- Using the shared map
- Splitting expenses
- Creating polls
- Managing trip calendar
- Uploading photos and videos

## Account & Billing
- How subscriptions work
- Canceling your subscription
- Restoring purchases
- Changing subscription tier

## Troubleshooting
- App crashes or freezes
- Messages not sending
- Location not updating
- Payment issues

## Privacy & Security
- What data does Chravel collect?
- How is my data protected?
- Deleting your account

## Contact Us
Email: support@chravel.app
Response time: Within 24 hours
```

### Privacy Policy Content

**Required Disclosures** (based on PrivacyInfo.xcprivacy):

```markdown
# Privacy Policy

Last Updated: [Date]

## Data We Collect

### Contact Information
- Email address (for account creation)
- Name (for profile)
- Phone number (optional, for notifications)

### Location Data
- Precise location (when adding places to trip map)
- Location history (for trip timeline)

### User Content
- Chat messages
- Photos and videos
- Trip plans and itineraries
- Expense records

### Identifiers
- User ID (internal identifier)
- Device ID (for push notifications)

### Usage Data
- App interactions
- Feature usage
- Performance metrics

### Financial Information
- Purchase history
- Subscription status

### Diagnostics
- Crash reports
- Performance data
- Error logs

## How We Use Your Data

- Provide app functionality
- Enable collaboration with trip members
- Process payments and subscriptions
- Improve app performance
- Customer support

## Data Sharing

- **Supabase**: Backend infrastructure (data processing)
- **RevenueCat**: Subscription management
- **Google Maps**: Location services
- **Apple**: In-app purchases, push notifications

We DO NOT:
- Sell your data to third parties
- Use your data for advertising
- Share your data with unauthorized parties

## Your Rights

- Access your data
- Delete your account
- Export your data
- Opt out of optional data collection

## Contact

For privacy questions: privacy@chravel.app
```

### Marketing URL Content

**Purpose**: Landing page that converts visitors to users

**Recommended Sections**:
1. Hero section with app screenshot and download button
2. Key features (map, chat, expenses, etc.)
3. Testimonials or social proof
4. Pricing information
5. FAQ
6. Download on the App Store badge

**Example Structure**:
```html
https://chravel.app/
  ├── / (home - landing page)
  ├── /features (detailed feature descriptions)
  ├── /pricing (subscription plans)
  ├── /support (help center)
  ├── /privacy (privacy policy)
  ├── /terms (terms of service)
  └── /download (redirect to App Store)
```

### Verifying URLs

Before submission, test all URLs:

```bash
# Check HTTP status codes
curl -I https://chravel.app/support
curl -I https://chravel.app/privacy
curl -I https://chravel.app

# Expected output: HTTP/2 200 (success)
# If 404 or 500, Apple will reject submission
```

**Common Issues**:
- URLs redirect to HTTP (not HTTPS)
- Pages require login
- 404 Not Found errors
- Broken SSL certificates

---

## Section 5: App Store Connect Configuration

### App Information

**Navigate**: App Store Connect → Chravel → App Information

#### Primary Category

**Recommended**: `Travel`

**Subcategory** (optional): None (Travel has no subcategories)

**Secondary Category** (optional): `Social Networking`

**Rationale**: Primary focus is group travel, but social features (chat, media sharing) are core to the experience.

#### Age Rating

Based on Chravel's features, the app should be rated:

**Rating**: `17+` (due to user-generated content)

**Questionnaire Answers**:

| Question | Answer | Reasoning |
|----------|--------|-----------|
| Cartoon or Fantasy Violence | None | No violent content |
| Realistic Violence | None | No violent content |
| Sexual Content or Nudity | None | User photos only, no explicit content |
| Profanity or Crude Humor | Infrequent/Mild | User messages may contain profanity |
| Alcohol, Tobacco, or Drug Use | None | Travel app, no substance references |
| Mature/Suggestive Themes | None | General travel content |
| Horror/Fear Themes | None | No scary content |
| Gambling | None | No gambling features |
| Contests | None | No contests |
| Unrestricted Web Access | Yes | Uses webviews for OAuth |
| User Generated Content | Frequent/Intense | Chat, photos, videos |

**Resulting Rating**: `17+` (primarily due to user-generated content)

**Note**: Apple requires 17+ for apps with unmoderated user-generated content unless you implement robust moderation systems.

### Pricing and Availability

**Recommended Settings**:

| Setting | Value | Notes |
|---------|-------|-------|
| **Price** | Free | App is free with subscriptions |
| **Availability** | All countries | Or select specific countries |
| **Pre-orders** | No | Not needed for v1.0 |
| **App Distribution Method** | Public | Listed on App Store |

**Country Considerations**:
- Start with US, Canada, UK, Australia (English-speaking)
- Expand to EU after localizing (requires translated metadata)
- Consider payment method availability (RevenueCat support)

### Version Information

**Navigate**: App Store Connect → Chravel → iOS App → 1.0 Prepare for Submission

#### Build Selection

1. Click **+ Build** under "Build" section
2. Select the TestFlight build from Sprint 1
3. Build number should match `ios/App/App.xcodeproj/project.pbxproj` (e.g., `1`)

**Status Check**:
```bash
# Verify build is available in App Store Connect
# Should show "Ready to Submit" status
```

#### Export Compliance

**Does your app use encryption?**

Answer: **Yes** (HTTPS network requests use encryption)

**Is your app exempt from export compliance?**

Answer: **Yes** (standard HTTPS encryption is exempt)

**Exemption Reasoning**: App uses standard encryption protocols (TLS/SSL) for HTTPS communication. No proprietary or custom encryption algorithms.

**Documentation**: https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations

### App Privacy

**Navigate**: App Store Connect → Chravel → App Privacy

#### Data Collection Summary

Based on `ios/App/App/PrivacyInfo.xcprivacy`, configure:

**Contact Info**:
- ✅ Email Address (linked to user, used for app functionality)
- ✅ Name (linked to user, used for app functionality)
- ✅ Phone Number (linked to user, used for app functionality)

**Location**:
- ✅ Precise Location (linked to user, used for app functionality)

**User Content**:
- ✅ Photos or Videos (linked to user, used for app functionality)
- ✅ Other User Content (chat messages, linked to user, used for app functionality)

**Identifiers**:
- ✅ User ID (linked to user, used for app functionality)

**Usage Data**:
- ✅ Product Interaction (not linked to user, used for analytics)

**Diagnostics**:
- ✅ Crash Data (not linked to user, used for app functionality)
- ✅ Performance Data (not linked to user, used for analytics)

**Financial Info**:
- ✅ Purchase History (linked to user, used for app functionality)

**For each data type, indicate**:
- **Purpose**: App Functionality, Analytics, or Product Personalization
- **Linked to User**: Yes (except diagnostics and some usage data)
- **Used for Tracking**: No (Chravel does not track users across apps/websites)

### App Review Information

**Navigate**: App Store Connect → Chravel → App Review Information

#### Contact Information

```
First Name: [Your First Name]
Last Name: [Your Last Name]
Phone: [Your Phone Number]
Email: support@chravel.app
```

**Note**: This contact info is for Apple reviewers only, not displayed to users.

#### Demo Account

**Required**: Yes (app requires account to access features)

**Create dedicated review account**:

```
Username: applereview@chravel.app
Password: [Secure password, share in "Notes" field]
```

**Account Setup**:
1. Create account via normal sign-up flow
2. Create 2-3 sample trips with realistic data:
   - **Trip 1**: "Weekend in Napa Valley" (3 members, 5 places, 10 messages)
   - **Trip 2**: "NYC Bachelor Party" (8 members, 12 places, 50+ messages, expenses)
   - **Trip 3**: "Italy Vacation" (4 members, calendar events, polls, tasks)
3. Add varied content: photos, videos, calendar events, expenses, polls, tasks
4. Ensure account has active subscription (Frequent Chraveler) for full feature access

**Demo Account Notes** (in App Store Connect "Notes" field):
```
Demo Account Credentials:
Username: applereview@chravel.app
Password: [password]

Test Trips:
1. "Weekend in Napa Valley" - Demonstrates map, places, chat
2. "NYC Bachelor Party" - Shows expenses, payments, polls
3. "Italy Vacation" - Full feature set: calendar, tasks, concierge

Subscription: Active "Frequent Chraveler" plan (no charges will occur during review)

Testing Notes:
- Create a new trip to test trip creation flow
- Join "Weekend in Napa Valley" via invite code: NAPA2025
- Test payments in sandbox mode (will not charge real money)
```

#### Notes

**Optional but recommended**: Provide guidance for reviewers

```
REVIEW GUIDANCE FOR CHRAVEL

1. GETTING STARTED
Upon login with provided credentials, you'll see 3 pre-populated trips. Tap any trip to explore features.

2. KEY FEATURES TO TEST
- Map: View trip locations, add new places via search
- Chat: Send messages, upload photos/videos
- Calendar: Create events, set recurring schedules
- Expenses: Add expenses, view split calculations
- Polls: Create poll, vote on options
- Tasks: Add tasks, mark complete
- Media: View shared photo gallery
- Concierge: Ask AI questions about destinations

3. CREATING NEW TRIP
- Tap "+" button on home screen
- Enter trip name and dates
- Invite members (optional for testing)

4. SUBSCRIPTION TESTING
- Demo account has active subscription
- RevenueCat sandbox mode (no real charges)
- Restore purchases works with demo account

5. PERMISSIONS
- Location: Required for adding places to map
- Camera: Optional for uploading photos
- Photo Library: Optional for selecting existing photos
- Notifications: Optional for real-time updates

6. EDGE CASES TESTED
- Poor network (offline mode gracefully handles)
- Large trips (100+ messages, 50+ photos)
- Concurrent editing (multiple users editing same trip)

7. PRIVACY COMPLIANCE
- Privacy policy: https://chravel.app/privacy
- Support URL: https://chravel.app/support
- Account deletion: Settings → Delete Account

8. CONTACT
For questions during review: support@chravel.app
Response within 2 hours during business hours (9am-5pm PST)

Thank you for reviewing Chravel!
```

---

## Section 6: Final Submission Checklist

### Pre-Submission Validation

**Complete all items before clicking "Submit for Review"**

#### Metadata Checklist

- [ ] **App Name**: "Chravel" (30 chars or less)
- [ ] **Subtitle**: Set (30 chars, e.g., "Group Travel & Trip Planning")
- [ ] **Description**: Written and uploaded (4000 chars max)
- [ ] **Keywords**: Set (100 chars, comma-separated)
- [ ] **Promotional Text**: Set (170 chars, optional but recommended)
- [ ] **Support URL**: https://chravel.app/support (live and accessible)
- [ ] **Marketing URL**: https://chravel.app (optional, but recommended)
- [ ] **Privacy Policy URL**: https://chravel.app/privacy (required, live and accessible)

#### Visual Assets Checklist

- [ ] **App Icon**: 1024x1024 PNG uploaded to App Information
- [ ] **Screenshots (6.7")**: 5-8 screenshots uploaded
- [ ] **Screenshots (6.5")**: 5-8 screenshots uploaded
- [ ] **Screenshots (5.5")**: 5-8 screenshots uploaded
- [ ] **App Preview Video**: Optional (not required for v1.0)

#### Version Information Checklist

- [ ] **Version**: 1.0
- [ ] **Build**: Selected from TestFlight builds
- [ ] **Copyright**: Set (e.g., "2025 Chravel Inc.")
- [ ] **Release Notes**: Written ("What's New in 1.0")
- [ ] **Export Compliance**: Answered (Yes, exempt for standard HTTPS)

#### Pricing & Availability Checklist

- [ ] **Price**: Free
- [ ] **Availability**: Countries selected (recommend starting with US)
- [ ] **In-App Purchases**: Linked (Explorer, Frequent Chraveler, Weekly, Monthly, Yearly, Lifetime)

#### App Privacy Checklist

- [ ] **Data Types**: All 9 data types configured
- [ ] **Privacy Policy**: Link verified
- [ ] **Data Usage**: Purposes set for each data type
- [ ] **Tracking**: Confirmed "No" (Chravel doesn't track)

#### App Review Information Checklist

- [ ] **Contact Info**: Name, phone, email set
- [ ] **Demo Account**: Created and tested
- [ ] **Demo Account Credentials**: Provided in "Sign-in required" section
- [ ] **Demo Content**: 2-3 sample trips with realistic data
- [ ] **Subscription Active**: Demo account has Frequent Chraveler subscription
- [ ] **Notes for Reviewer**: Guidance provided (optional but helpful)

#### Technical Checklist

- [ ] **Build Status**: "Ready to Submit" (not "Processing" or "Invalid Binary")
- [ ] **TestFlight Testing**: Build tested on TestFlight with no critical bugs
- [ ] **Crash Rate**: <1% crash rate in TestFlight
- [ ] **Performance**: No ANRs (App Not Responding) issues
- [ ] **Memory**: No memory leaks detected
- [ ] **Battery**: No excessive battery drain reported
- [ ] **Permissions**: All required permissions have usage descriptions in Info.plist
- [ ] **Privacy Manifest**: PrivacyInfo.xcprivacy matches App Privacy configuration

#### Legal Checklist

- [ ] **Age Rating**: Set (recommended 17+ for user-generated content)
- [ ] **Content Rights**: All content (images, text, music) is owned or licensed
- [ ] **Trademark**: App name doesn't violate trademarks
- [ ] **Third-Party Content**: All third-party SDKs disclosed (Google Maps, RevenueCat)
- [ ] **Subscription Terms**: Clearly stated in app and description
- [ ] **Restore Purchases**: Button present on paywall (required by Apple)

#### Compliance Checklist

- [ ] **Sign in with Apple**: Implemented and tested
- [ ] **Account Deletion**: Available in Settings → Delete Account
- [ ] **Restore Purchases**: Works correctly
- [ ] **Subscription Management**: Link to App Store subscriptions
- [ ] **Privacy Policy**: Accessible from app (Settings → Privacy Policy)
- [ ] **Terms of Service**: Accessible from app (Settings → Terms)
- [ ] **COPPA Compliance**: If targeting children <13 (Chravel: 17+, N/A)
- [ ] **GDPR Compliance**: If available in EU (data export, deletion)

---

## Section 7: Submission Process

### Step-by-Step Submission

#### Step 1: Final Review

```bash
# 1. Login to App Store Connect
open https://appstoreconnect.apple.com

# 2. Navigate to app
My Apps → Chravel → iOS App → 1.0 Prepare for Submission

# 3. Scroll through entire page
# Verify all sections show green checkmarks (no red errors)
```

**Common Errors**:
- Missing screenshot for required device size
- Build not selected
- Privacy Policy URL inaccessible (404 error)
- Export compliance not answered

#### Step 2: Submit for Review

1. **Click**: "Submit for Review" (top right)
2. **Final Questionnaire**:

**Does your app include third-party content?**
- Answer: No (all content is user-generated or owned by Chravel)

**Does your app use the Advertising Identifier (IDFA)?**
- Answer: No (Chravel doesn't use IDFA for advertising)

**Does your app include paid product placements?**
- Answer: No (no sponsored content)

3. **Confirm Submission**: Click "Submit"

#### Step 3: Confirmation

**Expected Outcome**:
- Status changes to: **"Waiting for Review"**
- Email sent to developer account: "Your submission is now waiting for review"
- Estimated review time: 24-48 hours (varies)

**What Happens Next**:
1. **Waiting for Review** (usually 12-24 hours)
2. **In Review** (Apple reviewer testing app, 1-48 hours)
3. **Pending Developer Release** (approved, ready to publish)
4. **Ready for Sale** (live on App Store!)

### Monitoring Review Status

**App Store Connect Dashboard**:
```bash
# Check status
open https://appstoreconnect.apple.com

# Navigate to: My Apps → Chravel → Activity tab
# Shows timeline of review progress
```

**Email Notifications**:
- Status changes (In Review, Approved, Rejected)
- Sent to developer account email
- Check spam folder if not receiving

**Resolution Center**:
- Navigate: App Store Connect → Chravel → Resolution Center
- View any issues or questions from Apple reviewers
- Respond within 30 days or submission expires

---

## Section 8: Handling Review Outcomes

### If Approved ✅

**Status**: "Pending Developer Release" or "Ready for Sale"

**Options**:

**Option A: Release Immediately**
1. Navigate to App Store Connect → Chravel → 1.0
2. Click "Release This Version"
3. App goes live within 1-4 hours
4. Users can download from App Store

**Option B: Schedule Release**
1. Select "Manually release this version"
2. Set future release date/time
3. Useful for coordinating with marketing launches

**Post-Release Tasks**:

```bash
# 1. Verify app is live
open "https://apps.apple.com/us/app/chravel/[APP_ID]"

# 2. Test download and installation
# Download from App Store on physical device
# Verify it's the correct build

# 3. Monitor crash reports
# App Store Connect → Chravel → TestFlight → Crashes and Organizer

# 4. Monitor reviews
# App Store Connect → Chravel → Ratings and Reviews
# Respond to user reviews (especially negative ones)

# 5. Track metrics
# App Store Connect → Analytics → App Store
# Metrics: Impressions, Product Page Views, Downloads, Conversion Rate
```

**Announcement Templates**:

**Social Media**:
```
🎉 Chravel is now live on the App Store!

Plan group trips effortlessly:
📍 Shared maps & itineraries
💬 Real-time group chat
💰 Easy expense splitting
🗳️ Group polls & voting
📸 Shared photo albums

Download now: [App Store link]
Free 7-day trial of all premium features!
```

**Email to Beta Testers**:
```
Subject: Chravel v1.0 is LIVE on the App Store! 🎉

Hi [Name],

After months of building and testing, Chravel is officially live on the App Store!

Thank you for being a beta tester and helping us shape the product. Your feedback was invaluable.

Download the production version here: [App Store link]

What's included in v1.0:
- Everything you tested in beta
- Improved performance and stability
- Polished UI/UX based on your feedback

As a thank-you, all beta testers receive 3 months of Frequent Chraveler free (check your email for redemption code).

Happy traveling!
The Chravel Team
```

### If Rejected ❌

**Status**: "Rejected" with reason(s) listed

**Common Rejection Reasons & Fixes**:

#### 1. Missing or Broken Demo Account

**Rejection Message**: "We were unable to sign in with the demo account information you provided."

**Fix**:
1. Verify credentials work:
   ```bash
   # Test login at: https://chravel.app/login
   # Username: applereview@chravel.app
   # Password: [provided password]
   ```
2. Ensure account still exists (not deleted)
3. Reset password if needed
4. Update credentials in App Store Connect → App Review Information
5. Click "Submit for Review" again (no new build needed)

#### 2. In-App Purchase Issues

**Rejection Message**: "Your app's in-app purchase products do not comply with guideline X.X."

**Common IAP Issues**:
- Missing "Restore Purchases" button → Add to paywall (already implemented at PaywallView.swift:192)
- Subscription terms not clear → Add to description and paywall UI
- Prices not shown before purchase → Verify RevenueCat shows prices
- Can't complete purchase → Test in sandbox mode

**Fix**:
1. Verify IAP implementation matches Sprint 3 requirements
2. Test complete purchase flow in sandbox
3. Screenshot working flow, reply to Resolution Center
4. May need to submit new build if code changes required

#### 3. Privacy Violations

**Rejection Message**: "Your app collects user data but doesn't have a privacy policy."

**Fix**:
1. Verify privacy policy URL: https://chravel.app/privacy
2. Ensure URL returns 200 OK (not 404)
3. Check privacy policy covers all data types in App Privacy section
4. Add "Privacy Policy" link in app (Settings → Privacy Policy)
5. Update App Store Connect if URL changed

#### 4. Broken Links

**Rejection Message**: "The support URL you provided does not lead to a working webpage."

**Fix**:
```bash
# Test all URLs
curl -I https://chravel.app/support    # Should return 200
curl -I https://chravel.app/privacy    # Should return 200
curl -I https://chravel.app            # Should return 200

# If any return 404, fix links on website
# Update URLs in App Store Connect
# No new build needed
```

#### 5. Crash on Launch

**Rejection Message**: "Your app crashed on launch or during use."

**Fix**:
1. Check crash logs: App Store Connect → Chravel → TestFlight → Crashes
2. Reproduce crash on device
3. Fix bug in code
4. Increment build number: `agvtool next-version -all`
5. Build new IPA, upload to TestFlight
6. Test thoroughly on physical device
7. Submit new build for review

#### 6. Guideline 2.1 - Performance: App Completeness

**Rejection Message**: "We were unable to access key features in your app."

**Fix**:
1. Improve demo account setup
2. Add clearer notes for reviewers (see Section 5: Demo Account Notes)
3. Consider recording a demo video showing how to use app
4. Reply to Resolution Center with detailed instructions

#### 7. Guideline 4.2 - Design: Minimum Functionality

**Rejection Message**: "Your app does not provide enough functionality or content."

**Fix** (unlikely for Chravel, but if happens):
1. Highlight all features in Notes to Reviewer
2. Explain value proposition clearly
3. Provide examples of how users benefit
4. Show that app is not just a wrapper for website

### Resolution Center Communication

**How to Respond**:

1. Navigate: App Store Connect → Chravel → Resolution Center
2. Click on rejection message
3. Click "Reply" to start conversation
4. Provide:
   - Clear explanation of fix
   - Updated credentials (if demo account issue)
   - Screenshots showing working features
   - Links to documentation

**Response Template**:
```
Hello,

Thank you for reviewing Chravel. We've addressed the issue you mentioned:

[Issue]: [Describe the rejection reason]

[Resolution]:
- [Bullet point 1: What you fixed]
- [Bullet point 2: How to verify the fix]

[Updated Information]:
- Demo Account: applereview@chravel.app / [new password]
- Test Trip: "Weekend in Napa Valley" has [X] pre-populated data

[Screenshots]:
[Attach 2-3 screenshots showing the fix]

Please let us know if you need any additional information. We're available at support@chravel.app for any questions.

Thank you,
[Your Name]
Chravel Team
```

**Response Time**:
- Reply within 24-48 hours (faster is better)
- If no response within 30 days, submission expires (must start over)

---

## Section 9: Post-Launch Monitoring

### Week 1: Critical Monitoring

**Daily Tasks**:

```bash
# 1. Check crash rate
# App Store Connect → Analytics → Crashes
# Target: <1% crash rate
# If >5%, investigate immediately

# 2. Monitor reviews
# App Store Connect → Ratings and Reviews
# Respond to 1-star reviews within 24 hours
# Thank 5-star reviewers

# 3. Track downloads
# App Store Connect → Analytics → App Units
# Compare to expectations, adjust marketing if needed

# 4. Watch for bugs
# Check support email: support@chravel.app
# Create GitHub issues for reported bugs
# Prioritize: Crash > Data loss > Feature broken > UX issue
```

**Red Flags** (require immediate action):
- Crash rate >5%
- Multiple reports of same bug
- Payment/subscription issues
- Data loss reports
- Security vulnerabilities

**Green Lights** (indicate success):
- Crash rate <1%
- Average rating >4.0 stars
- Positive user reviews
- Organic downloads increasing
- Low support ticket volume

### Week 2-4: Optimization

**Tasks**:
1. **Analyze user behavior**: Which features are used most? Least?
2. **Review retention**: What % of users return after 1 day? 7 days?
3. **Optimize conversion**: How many downloads → signups → subscriptions?
4. **Plan v1.1**: Prioritize features based on user feedback
5. **Internationalization**: Consider adding languages (Spanish, French)

**Tools**:
- App Store Connect Analytics (built-in)
- Mixpanel or Amplitude (event tracking)
- RevenueCat dashboard (subscription metrics)
- Supabase dashboard (backend monitoring)

### Long-Term: Version Planning

**v1.1 Timeline** (4-6 weeks after v1.0 launch):
- Fix bugs discovered in production
- Improve performance based on real-world usage
- Add 1-2 requested features
- Optimize onboarding flow

**v2.0 Timeline** (3-6 months):
- Major new features
- UI/UX overhaul if needed
- New platforms (Android, web)

---

## Section 10: Quick Reference

### Important URLs

| Resource | URL |
|----------|-----|
| App Store Connect | https://appstoreconnect.apple.com |
| Apple Developer Portal | https://developer.apple.com/account |
| App Store Review Guidelines | https://developer.apple.com/app-store/review/guidelines/ |
| Human Interface Guidelines | https://developer.apple.com/design/human-interface-guidelines/ |
| RevenueCat Dashboard | https://app.revenuecat.com |
| Supabase Dashboard | https://app.supabase.com |

### Key Commands

```bash
# Build production IPA
cd ios-release
bundle exec fastlane ios release

# Check app status
open https://appstoreconnect.apple.com

# Monitor TestFlight
open https://appstoreconnect.apple.com/apps/[APP_ID]/testflight

# View crash logs
open https://appstoreconnect.apple.com/apps/[APP_ID]/activity/ios/crashes
```

### Contact Information

| Issue Type | Contact |
|------------|---------|
| App Review Questions | https://developer.apple.com/contact/app-store/ |
| Technical Support | https://developer.apple.com/support/ |
| RevenueCat Support | support@revenuecat.com |
| Supabase Support | support@supabase.com |
| Internal Issues | support@chravel.app |

---

## Final Checklist: Ready to Submit?

**Review this checklist one final time before clicking "Submit for Review":**

### Metadata ✅
- [ ] App name, subtitle, description written
- [ ] Keywords optimized (100 chars)
- [ ] Screenshots uploaded for all required sizes
- [ ] App icon uploaded (1024x1024)
- [ ] URLs verified (support, privacy, marketing)

### Configuration ✅
- [ ] Build selected and "Ready to Submit"
- [ ] Pricing set (Free with IAP)
- [ ] Countries selected
- [ ] Age rating configured (17+)
- [ ] Export compliance answered

### Privacy & Legal ✅
- [ ] App Privacy data types configured
- [ ] Privacy policy live and accessible
- [ ] Demo account created and tested
- [ ] Subscription terms clear
- [ ] Account deletion available

### Technical ✅
- [ ] TestFlight testing complete (no critical bugs)
- [ ] Crash rate <1%
- [ ] Performance targets met (Sprint 5)
- [ ] All permissions have usage descriptions
- [ ] RevenueCat integration tested
- [ ] Push notifications working

### Compliance ✅
- [ ] Sign in with Apple working
- [ ] Restore Purchases button present
- [ ] Privacy Manifest matches App Privacy
- [ ] AASA file deployed and verified
- [ ] Production APNs certificate configured

**If all items checked**: You're ready to submit! 🚀

**If any items unchecked**: Address remaining issues before submission to avoid rejection.

---

## Conclusion

Sprint 6 represents the final step in your App Store submission journey. With all assets prepared, metadata written, and technical requirements met, Chravel is ready for Apple's review.

**Next Steps**:
1. Complete all items in Final Checklist (Section 10)
2. Click "Submit for Review" in App Store Connect
3. Monitor status in Resolution Center
4. Respond promptly to any reviewer questions
5. Celebrate when approved! 🎉

**Estimated Timeline**:
- Asset preparation: 4-8 hours
- Metadata writing: 2-4 hours
- App Store Connect configuration: 1-2 hours
- Review wait time: 24-48 hours
- **Total**: ~3-4 days from start to "Ready for Sale"

Good luck with your submission! 🚀✈️

---

**Document Version**: 1.0
**Last Updated**: 2025-01-19
**Maintained By**: iOS Release Team
