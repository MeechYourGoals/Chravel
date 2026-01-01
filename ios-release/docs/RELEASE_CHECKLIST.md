# Chravel iOS Release Checklist

**App Name:** Chravel
**Bundle ID:** com.chravel.app
**Target:** iOS 15.0+
**Last Updated:** December 2025

---

## Quick Reference: Clone to TestFlight to App Store

```bash
# 1. Clone and setup
git clone https://github.com/MeechYourGoals/Chravel.git
cd Chravel
npm install

# 2. Build web assets
npm run build

# 3. Sync iOS
npx cap sync ios

# 4. Open in Xcode
npx cap open ios

# 5. Configure signing (manual or use fastlane)
# - Set Team
# - Configure bundle ID
# - Select provisioning profile

# 6. Archive and upload
# Xcode: Product → Archive → Distribute App → App Store Connect

# OR using Fastlane:
cd ios-release/fastlane
bundle install
bundle exec fastlane release_testflight
```

---

## Pre-Release Checklist

### Phase 1: Development Completion ✅

#### Code Quality
- [ ] All TypeScript compiles without errors (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No `console.log` statements in production code
- [ ] No hardcoded development URLs
- [ ] All API keys are environment variables
- [ ] Error boundaries implemented for crash recovery
- [ ] Offline mode works for core features

#### Feature Testing
- [ ] Authentication flow (sign up, sign in, sign out, password reset)
- [ ] Trip creation and editing
- [ ] Real-time chat messaging
- [ ] Media upload (photos, videos)
- [ ] Expense splitting and payments
- [ ] Calendar/itinerary management
- [ ] AI Concierge responses
- [ ] Push notifications received
- [ ] Deep links open correct screens
- [ ] Pull-to-refresh works
- [ ] Haptic feedback triggers

### Phase 2: iOS Configuration 🔧

#### Xcode Project
- [ ] Bundle ID is `com.chravel.app`
- [ ] Display name is "Chravel"
- [ ] Version number set (e.g., 1.0.0)
- [ ] Build number incremented
- [ ] Deployment target is iOS 15.0
- [ ] All required device orientations set
- [ ] Launch storyboard configured

#### Capabilities & Entitlements
- [ ] Push Notifications capability enabled
- [ ] Associated Domains configured (`applinks:chravel.app`)
- [ ] Background Modes → Remote notifications enabled
- [ ] Sign in with Apple capability (if using)
- [ ] App Groups (if using shared data)
- [ ] Keychain Sharing (if needed)

#### Info.plist
- [ ] `NSCameraUsageDescription` - Explains camera use
- [ ] `NSPhotoLibraryUsageDescription` - Explains photo library access
- [ ] `NSPhotoLibraryAddUsageDescription` - Explains saving photos
- [ ] `NSLocationWhenInUseUsageDescription` - Explains location use
- [ ] `NSMicrophoneUsageDescription` - Explains microphone use (if voice notes)
- [ ] `NSFaceIDUsageDescription` - Explains Face ID use (if applicable)
- [ ] No unused permission strings
- [ ] `ITSAppUsesNonExemptEncryption` set to `NO` or `YES` with key

#### Code Signing
- [ ] Apple Developer account active
- [ ] Distribution certificate valid (not expired)
- [ ] App Store provisioning profile valid
- [ ] Profile includes Push Notification entitlement
- [ ] Team ID correct in project settings

### Phase 3: Assets & Branding 🎨

#### App Icons
- [ ] 1024x1024 App Store icon (no transparency, no alpha)
- [ ] All icon sizes generated (run `./appstore/scripts/generate-icons.sh`)
- [ ] Icons look good at all sizes
- [ ] Icons match brand guidelines
- [ ] No beta/development badges on icons

#### Launch Screen
- [ ] Launch screen configured (LaunchScreen.storyboard)
- [ ] Logo centered and appropriate size
- [ ] Background color matches brand
- [ ] Works on all device sizes
- [ ] No text that might not load in time

#### Screenshots
- [ ] 6.7" iPhone screenshots (8-10 images)
- [ ] 6.5" iPhone screenshots (8-10 images)
- [ ] 5.5" iPhone screenshots (8-10 images)
- [ ] Screenshots show actual app (not mockups)
- [ ] Screenshots are in English (or localized)
- [ ] No placeholder text visible
- [ ] Demo data looks realistic
- [ ] Optional: Text overlays added for features

### Phase 4: App Store Connect Metadata 📝

#### Basic Information
- [ ] App name: "Chravel" (30 chars max)
- [ ] Subtitle: "Group Travel & Event Planner" (30 chars max)
- [ ] Promotional text (170 chars, can be updated without review)
- [ ] Description (4000 chars, compelling copy)
- [ ] Keywords (100 chars, comma-separated)
- [ ] What's New text (for updates)

#### Categorization
- [ ] Primary category: Travel
- [ ] Secondary category: Productivity
- [ ] Age rating questionnaire completed

#### URLs & Contact
- [ ] Support URL: https://chravel.app/support
- [ ] Marketing URL: https://chravel.app
- [ ] Privacy Policy URL: https://chravel.app/privacy

#### Pricing
- [ ] App price tier set (Free)
- [ ] In-App Purchases configured (Plus, Pro)
- [ ] Subscription pricing and terms clear

### Phase 5: Privacy & Compliance 🔒

#### Privacy Nutrition Label
- [ ] Data types collected declared accurately
- [ ] Purposes for collection specified
- [ ] Linked/not linked status correct
- [ ] Tracking disclosure accurate (we don't track)

#### Legal
- [ ] Privacy Policy URL accessible
- [ ] Terms of Service URL accessible
- [ ] EULA configured (if custom)
- [ ] Age rating accurate

#### App Review Information
- [ ] Demo account credentials provided
- [ ] Demo account has sample data
- [ ] Review notes explain key features
- [ ] Contact information for reviewers
- [ ] Any special instructions noted

### Phase 6: Build & Upload 🚀

#### Production Build
- [ ] Remove development server URL from Capacitor config
- [ ] Environment is production
- [ ] Build configuration is Release
- [ ] Code is from `main` branch (or release branch)
- [ ] All git changes committed

```bash
# Build steps
npm run build
npx cap sync ios

# In Xcode:
# Product → Archive
# Window → Organizer → Select Archive → Distribute App
```

#### Archive & Upload
- [ ] Archive created successfully
- [ ] Archive validated (no errors)
- [ ] Upload to App Store Connect successful
- [ ] Build appears in TestFlight
- [ ] Build processing completes
- [ ] No compliance issues flagged

### Phase 7: Testing 🧪

#### TestFlight Internal Testing
- [ ] Add internal testers
- [ ] TestFlight build available
- [ ] Test on physical iPhone
- [ ] Test on physical iPad (if supported)
- [ ] Test all critical user flows
- [ ] Test crash scenarios
- [ ] Test network error handling
- [ ] Test on iOS 15, 16, 17, 18
- [ ] Verify push notifications work
- [ ] Verify deep links work

#### TestFlight External Testing (Optional)
- [ ] External beta group created
- [ ] Beta App Review submitted
- [ ] Beta testers invited
- [ ] Feedback collected and addressed

### Phase 8: Submission 📤

#### Final Checks
- [ ] All screenshots uploaded
- [ ] All metadata complete
- [ ] Version and build selected
- [ ] App Review information filled
- [ ] Export compliance answered
- [ ] Content rights confirmed
- [ ] Advertising identifier disclosed

#### Submit for Review
- [ ] Review all information one more time
- [ ] Submit for App Review
- [ ] Note submission date/time
- [ ] Monitor App Store Connect for updates

### Phase 9: Post-Submission 📊

#### During Review
- [ ] Monitor email for rejection/questions
- [ ] Be ready to respond quickly
- [ ] Don't make changes during review

#### If Rejected
- [ ] Read rejection reason carefully
- [ ] Address specific issues mentioned
- [ ] Resubmit with resolution details
- [ ] Update review notes if needed

#### After Approval
- [ ] Choose release option (manual/automatic)
- [ ] Release app
- [ ] Verify app appears in App Store
- [ ] Test download from App Store
- [ ] Announce launch

### Phase 10: Post-Launch 🎉

#### Monitoring
- [ ] Monitor crash reports in App Store Connect
- [ ] Monitor crash reports in Sentry/Crashlytics
- [ ] Monitor user reviews
- [ ] Respond to reviews promptly

#### Analytics
- [ ] Verify analytics events flowing
- [ ] Set up conversion tracking
- [ ] Monitor download numbers
- [ ] Track subscription conversions

#### Communication
- [ ] Announce launch on social media
- [ ] Email existing users (if applicable)
- [ ] Update website with App Store badge
- [ ] Submit for App Store featuring (optional)

---

## Common Rejection Reasons & Solutions

### 1. Guideline 2.1 - App Completeness
**Issue:** App crashes or has incomplete features
**Solution:** Test thoroughly on device, ensure demo account works

### 2. Guideline 2.3.3 - Screenshots
**Issue:** Screenshots don't match app or are marketing mockups
**Solution:** Use actual app screenshots, no rendered devices

### 3. Guideline 3.1.1 - In-App Purchase
**Issue:** Subscription benefits unclear, pricing not shown
**Solution:** Clear feature comparison, show prices before paywall

### 4. Guideline 4.2.3 - Minimum Functionality
**Issue:** App is just a wrapped website
**Solution:** Implement native features (push, haptics, deep links)

### 5. Guideline 5.1.1 - Data Collection
**Issue:** Privacy labels don't match actual collection
**Solution:** Audit code and update privacy labels accurately

### 6. Guideline 5.1.2 - Data Use and Sharing
**Issue:** Unclear why data is collected
**Solution:** Add clear explanations in permission dialogs

---

## Secrets Required for CI/CD

Store these in GitHub Secrets:

| Secret Name | Description |
|------------|-------------|
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |
| `ITC_TEAM_ID` | App Store Connect Team ID |
| `APPLE_ID` | Apple ID email for App Store Connect |
| `APPLE_CERTIFICATE_BASE64` | Distribution certificate (.p12) base64 encoded |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 certificate |
| `PROVISIONING_PROFILE_BASE64` | App Store provisioning profile base64 encoded |
| `KEYCHAIN_PASSWORD` | Password for CI keychain |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect API Key ID |
| `APP_STORE_CONNECT_API_ISSUER_ID` | App Store Connect API Issuer ID |
| `APP_STORE_CONNECT_API_KEY` | App Store Connect API Key content |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (optional) |
| `SENTRY_ORG` | Sentry organization (optional) |
| `SENTRY_PROJECT` | Sentry project (optional) |
| `MATCH_GIT_URL` | Git repo for certificates (for Match) |
| `MATCH_PASSWORD` | Password for Match encryption |

---

## Quick Commands

```bash
# Check build readiness
npm run lint && npm run typecheck && npm run build

# Sync iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Generate icons
./appstore/scripts/generate-icons.sh

# Fastlane commands (from ios-release/fastlane/)
bundle exec fastlane build           # Build only
bundle exec fastlane testflight_upload    # Upload to TestFlight
bundle exec fastlane release_testflight   # Full TestFlight release
bundle exec fastlane release_appstore     # Full App Store release
bundle exec fastlane bump_version type:patch  # Bump version
bundle exec fastlane bump_build           # Bump build number
bundle exec fastlane upload_metadata      # Upload metadata only
bundle exec fastlane upload_screenshots   # Upload screenshots only
```

---

## Support

- **Fastlane Issues:** https://github.com/fastlane/fastlane/issues
- **App Store Review:** https://developer.apple.com/app-store/review/
- **Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines/
- **Chravel Support:** support@chravel.app

---

**Document Version:** 1.0
**Last Review:** December 2025
