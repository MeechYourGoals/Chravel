# Chravel iOS App Store Release - Master Guide

**App Name:** Chravel - Group Travel & Event Planner
**Bundle ID:** com.chravel.app
**Target:** iOS 15.0+
**Generated:** December 2025

---

## Deliverables Status

| # | Deliverable | Status | Location |
|---|------------|--------|----------|
| 1 | App Store metadata templates | ✅ Complete | `/appstore/metadata/` |
| 2 | Privacy policy & terms | ✅ Complete | `/appstore/legal/` |
| 3 | Privacy mapping (nutrition label) | ✅ Complete | `/appstore/legal/PRIVACY_MAPPING.md` |
| 4 | App icon generation script | ✅ Complete | `/appstore/scripts/generate-icons.sh` |
| 5 | Screenshot capture automation | ✅ Complete | `/appstore/scripts/capture-screenshots.sh` |
| 6 | Push notification setup docs | ✅ Complete | `/ios-release/docs/PUSH_NOTIFICATIONS_SETUP.md` |
| 7 | Deep links / Universal Links docs | ✅ Complete | `/ios-release/docs/DEEP_LINKS_SETUP.md` |
| 8 | Fastlane configuration | ✅ Complete | `/ios-release/fastlane/` |
| 9 | GitHub Actions CI/CD | ✅ Complete | `/ios-release/ci/ios-release.yml` |
| 10 | Release checklist | ✅ Complete | `/ios-release/docs/RELEASE_CHECKLIST.md` |
| 11 | App Review notes | ✅ Complete | `/appstore/metadata/review_notes.md` |

---

## File Tree

```
Chravel/
├── appstore/
│   ├── metadata/
│   │   ├── app_name.txt              # "Chravel"
│   │   ├── subtitle.txt              # "Group Travel & Event Planner"
│   │   ├── promo_text.txt            # 170-char promo
│   │   ├── keywords.txt              # 100-char keywords
│   │   ├── description.md            # Full App Store description
│   │   ├── whats_new.txt             # Version release notes
│   │   └── review_notes.md           # App Review instructions
│   │
│   ├── screenshots/
│   │   ├── 6.7-inch/                 # iPhone 15 Pro Max (1290x2796)
│   │   ├── 6.5-inch/                 # iPhone 14 Plus (1284x2778)
│   │   ├── 5.5-inch/                 # iPhone 8 Plus (1242x2208)
│   │   └── ipad-12.9-inch/           # iPad Pro (2048x2732)
│   │
│   ├── icons/                        # Generated app icons
│   │   └── (run generate-icons.sh to populate)
│   │
│   ├── legal/
│   │   ├── privacy_policy.md         # Privacy Policy
│   │   ├── terms.md                  # Terms of Service
│   │   └── PRIVACY_MAPPING.md        # Apple Privacy Label mapping
│   │
│   └── scripts/
│       ├── generate-icons.sh         # Icon generation from 1024 master
│       └── capture-screenshots.sh    # Screenshot capture automation
│
├── ios-release/
│   ├── fastlane/
│   │   ├── Fastfile                  # Fastlane lanes
│   │   ├── Appfile                   # App configuration
│   │   ├── Matchfile                 # Certificate management
│   │   ├── Gymfile                   # Build configuration
│   │   └── Deliverfile               # App Store Connect config
│   │
│   ├── ci/
│   │   └── ios-release.yml           # GitHub Actions workflow
│   │
│   └── docs/
│       ├── RELEASE_CHECKLIST.md      # Step-by-step release guide
│       ├── PUSH_NOTIFICATIONS_SETUP.md  # Push notification docs
│       └── DEEP_LINKS_SETUP.md       # Universal Links docs
│
└── IOS_APP_STORE_RELEASE_MASTER.md   # This file
```

---

## Quick Start Commands

### 1. Generate App Icons

```bash
# Requires ImageMagick: brew install imagemagick
./appstore/scripts/generate-icons.sh /path/to/logo-1024.png

# Uses existing logo:
./appstore/scripts/generate-icons.sh public/chravel-logo.png
```

### 2. Build for iOS

```bash
# Install dependencies
npm install

# Build production assets
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 3. Run Fastlane

```bash
cd ios-release/fastlane

# Install Fastlane
bundle install

# Build app
bundle exec fastlane build

# Upload to TestFlight
bundle exec fastlane testflight_upload

# Full release to TestFlight
bundle exec fastlane release_testflight

# Submit to App Store
bundle exec fastlane release_appstore
```

### 4. Capture Screenshots

```bash
./appstore/scripts/capture-screenshots.sh
# Follow interactive prompts
```

---

## Environment Setup

### Required GitHub Secrets

```
APPLE_TEAM_ID=YOUR_TEAM_ID
ITC_TEAM_ID=YOUR_ITC_TEAM_ID
APPLE_ID=developer@chravel.app
APPLE_CERTIFICATE_BASE64=<base64 encoded .p12>
APPLE_CERTIFICATE_PASSWORD=<password>
PROVISIONING_PROFILE_BASE64=<base64 encoded .mobileprovision>
KEYCHAIN_PASSWORD=<password>
APP_STORE_CONNECT_API_KEY_ID=<key id>
APP_STORE_CONNECT_API_ISSUER_ID=<issuer id>
APP_STORE_CONNECT_API_KEY=<key content>
```

### Required Environment Variables (Local)

```bash
export APPLE_TEAM_ID="YOUR_TEAM_ID"
export ITC_TEAM_ID="YOUR_ITC_TEAM_ID"
export APPLE_ID="developer@chravel.app"
export MATCH_GIT_URL="git@github.com:your-org/certificates.git"
export MATCH_PASSWORD="your_match_password"
```

---

## App Store Metadata Summary

| Field | Value |
|-------|-------|
| **Name** | Chravel |
| **Subtitle** | Group Travel & Event Planner |
| **Category (Primary)** | Travel |
| **Category (Secondary)** | Productivity |
| **Age Rating** | 4+ |
| **Price** | Free (with In-App Purchases) |
| **Keywords** | travel,trip planner,group travel,itinerary,team,budget,chat,vacation,tour,event |

### Demo Account

```
Email: demo@chravel.app
Password: DemoTrip2025!
```

---

## Privacy Nutrition Label Summary

### Data Types Collected

| Data Type | Linked to User | Used for Tracking |
|-----------|----------------|-------------------|
| Email Address | Yes | No |
| Name | Yes | No |
| Phone Number (optional) | Yes | No |
| Photos/Videos | Yes | No |
| Precise Location | Yes | No |
| User ID | Yes | No |
| Device ID | Yes | No |
| Product Interaction | Yes | No |
| Crash Data | Yes | No |
| Purchase History | Yes | No |

### Data NOT Collected
- IDFA (Advertising Identifier)
- Health Data
- Financial Info
- Browsing History
- Contacts

---

## Required iOS Permissions

| Permission | Info.plist Key | Required? |
|------------|---------------|-----------|
| Camera | NSCameraUsageDescription | Yes |
| Photo Library (Read) | NSPhotoLibraryUsageDescription | Yes |
| Photo Library (Write) | NSPhotoLibraryAddUsageDescription | Yes |
| Location (When In Use) | NSLocationWhenInUseUsageDescription | Yes |
| Microphone | NSMicrophoneUsageDescription | Optional |
| Push Notifications | (Runtime request) | Yes |

---

## Release Flow

```
                    ┌─────────────────┐
                    │  Development    │
                    │   Complete      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  npm run build  │
                    │  npx cap sync   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Generate Icons  │
                    │ Take Screenshots│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Fastlane Build  │
                    │ or Xcode Archive│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   TestFlight    │
                    │ Internal Testing│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  App Store      │
                    │  Submission     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Apple Review   │
                    │  (1-3 days)     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Release!      │
                    └─────────────────┘
```

---

## Remaining Tasks Before Submission

### Must Complete (Blocking)

1. **Apple Developer Account**
   - [ ] Ensure membership is active
   - [ ] Create App ID for `com.chravel.app`
   - [ ] Generate APNs Authentication Key
   - [ ] Create Distribution Certificate
   - [ ] Create App Store Provisioning Profile

2. **App Store Connect**
   - [ ] Create app listing
   - [ ] Fill in metadata from `/appstore/metadata/`
   - [ ] Upload screenshots
   - [ ] Configure In-App Purchases
   - [ ] Set pricing and availability

3. **Xcode Project**
   - [ ] Remove development server URL from Capacitor config
   - [ ] Set correct version and build numbers
   - [ ] Configure code signing
   - [ ] Add all permission usage descriptions

4. **Assets**
   - [ ] Run icon generation script
   - [ ] Capture App Store screenshots
   - [ ] Verify logo has no transparency

### Recommended (Not Blocking)

- [ ] Set up Sentry/Crashlytics for crash reporting
- [ ] Configure Firebase Analytics
- [ ] Create TestFlight beta testing group
- [ ] Prepare marketing website with App Store badge
- [ ] Write press release / launch announcement

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Code signing error" | Run `fastlane sync_certs` or configure manually in Xcode |
| "Build fails in CI" | Check all secrets are set correctly |
| "Screenshots rejected" | Use actual app screenshots, not mockups |
| "Privacy label doesn't match" | Audit code against PRIVACY_MAPPING.md |
| "App crashes on launch" | Test on physical device, check Info.plist |
| "Push notifications don't work" | Verify APNs key is uploaded to Firebase |

---

## Support & Resources

- **Fastlane Docs:** https://docs.fastlane.tools
- **Apple Developer:** https://developer.apple.com
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines/
- **Chravel Support:** support@chravel.app

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2025 | Initial release documentation |

---

**Next Step:** Complete the "Remaining Tasks Before Submission" checklist above, then follow the detailed `/ios-release/docs/RELEASE_CHECKLIST.md` for step-by-step submission instructions.
