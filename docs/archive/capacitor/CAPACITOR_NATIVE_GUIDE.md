# Chravel iOS Native Implementation Guide

## Overview

Chravel's iOS app is built using **Capacitor 7.x**, which compiles the React/TypeScript web codebase into a native iOS application with full access to device APIs. This approach provides:

- ✅ **Single Codebase**: Same React/TypeScript code runs on web and iOS
- ✅ **Native Performance**: Compiled to native iOS binary
- ✅ **Full Device Access**: Camera, location, haptics, notifications, etc.
- ✅ **Shared Backend**: Both platforms use the same Supabase backend
- ✅ **Production Ready**: Used by Starbucks, Target, Southwest Airlines

**Architecture:**
```
┌─────────────────────────────────────┐
│   React + TypeScript Frontend       │
│   (src/ directory)                  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Capacitor Bridge Layer            │
│   (@capacitor/core)                 │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Native iOS (Swift/Objective-C)    │
│   (ios/App/ directory)              │
└─────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Supabase Backend                  │
│   (Shared with Web)                 │
└─────────────────────────────────────┘
```

---

## Native Features Implemented

### 1. **Camera & Photo Library**
**Plugin**: `@capacitor/camera`

**Implementation**: `src/services/capacitorIntegration.ts`

```typescript
// Take photo with camera
async takePicture(): Promise<string | null> {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera
  });
  return image.webPath || null;
}

// Select from photo library
async selectImage(): Promise<string | null> {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos
  });
  return image.webPath || null;
}
```

**Usage in App**:
- Trip cover photo uploads
- Media hub photo sharing
- Profile avatar updates

**iOS Permissions Required** (already configured in `Info.plist`):
- `NSCameraUsageDescription`: "Chravel needs access to your camera to take photos for your trips"
- `NSPhotoLibraryUsageDescription`: "Chravel needs access to your photo library to select photos for your trips"

---

### 2. **Geolocation**
**Plugin**: `@capacitor/geolocation`

**Implementation**: `src/services/capacitorIntegration.ts`

```typescript
async getCurrentPosition(): Promise<GeolocationPosition | null> {
  const coordinates = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000
  });
  return coordinates as GeolocationPosition;
}
```

**Usage in App**:
- Auto-detect current location for trip creation
- Map integration for event locations
- Location tagging for photos

**iOS Permissions Required** (already configured):
- `NSLocationWhenInUseUsageDescription`: "Chravel needs your location to help plan trips"
- `NSLocationAlwaysAndWhenInUseUsageDescription`: "Chravel needs your location for trip planning and navigation"

---

### 3. **Haptic Feedback**
**Plugin**: `@capacitor/haptics`

**Implementation**: `src/services/hapticService.ts`

```typescript
class HapticService {
  async light() {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  }

  async medium() {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  }

  async heavy() {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  }
}
```

**Usage in App**:
- Button taps (light haptic)
- Tab switches (light haptic)
- Success actions (medium haptic)
- Error notifications (heavy haptic)

**Examples**:
- `src/pages/MobileTripDetail.tsx` - Tab changes trigger haptics
- `src/components/mobile/MobileBottomNav.tsx` - Navigation taps

---

### 4. **Push Notifications**
**Plugin**: `@capacitor/push-notifications`

**Implementation**: `src/services/capacitorIntegration.ts`

```typescript
private async initializePushNotifications(): Promise<void> {
  await PushNotifications.requestPermissions();
  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value);
    // Send to Supabase for storing user device token
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Handle foreground notification
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Handle notification tap - navigate to relevant trip/chat
  });
}
```

**Usage in App**:
- Trip chat messages
- Itinerary updates
- Payment reminders
- Broadcast announcements

**Configuration Required**:
- Apple Developer Account with push notification capabilities
- APNs certificate/key in Supabase dashboard

---

### 5. **Local Notifications**
**Plugin**: `@capacitor/local-notifications`

**Implementation**: `src/services/capacitorIntegration.ts`

```typescript
async scheduleLocalNotification(
  title: string, 
  body: string, 
  scheduleAt: Date
): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [{
      title,
      body,
      id: Date.now(),
      schedule: { at: scheduleAt }
    }]
  });
}
```

**Usage in App**:
- Trip departure reminders
- Event start notifications
- Payment due date alerts

---

### 6. **Native Share Sheet**
**Plugin**: `@capacitor/share`

**Implementation**: `src/services/capacitorIntegration.ts`

```typescript
async shareContent(
  title: string, 
  text: string, 
  url?: string
): Promise<boolean> {
  await Share.share({
    title,
    text,
    url,
    dialogTitle: 'Share Trip'
  });
  return true;
}
```

**Usage in App**:
- Share trip invitation links
- Share itinerary PDFs
- Share trip photos to Instagram/Messages

---

### 7. **Status Bar**
**Plugin**: `@capacitor/status-bar`

**Implementation**: `src/services/capacitorIntegration.ts`

```typescript
private async initializeStatusBar(): Promise<void> {
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: '#000000' });
}
```

**Configuration**: Dark mode with black background to match app design

---

### 8. **File System**
**Plugin**: `@capacitor/filesystem`

**Implementation**: `src/services/capacitorIntegration.ts`

```typescript
async saveFile(data: string, filename: string): Promise<string | null> {
  const result = await Filesystem.writeFile({
    path: filename,
    data: data,
    directory: Directory.Documents
  });
  return result.uri;
}
```

**Usage in App**:
- Save itinerary PDFs locally
- Cache trip photos for offline viewing
- Export expense reports

---

## iOS Build Instructions

### **Prerequisites**

1. **macOS** (Ventura 13.0+ recommended)
2. **Xcode 15+** ([Download from Mac App Store](https://apps.apple.com/us/app/xcode/id497799835))
3. **Node.js 18+** and npm
4. **Apple Developer Account** ($99/year for App Store)
5. **Git** (for cloning repository)

---

### **Step 1: Clone & Install Dependencies**

```bash
# Clone from GitHub
git clone https://github.com/YOUR_ORG/chravel.git
cd chravel

# Install dependencies
npm install

# Install Capacitor CLI globally (optional but recommended)
npm install -g @capacitor/cli
```

---

### **Step 2: Add iOS Platform**

```bash
# Add iOS platform (only needed first time)
npx cap add ios

# This creates:
# - ios/App/ directory with Xcode project
# - ios/App/App/capacitor.config.json (auto-synced)
```

---

### **Step 3: Build Web Assets**

```bash
# Build React app for production
npm run build

# This creates dist/ folder with compiled web assets
```

---

### **Step 4: Sync to iOS**

```bash
# Copy web assets and sync native plugins
npx cap sync ios

# This:
# - Copies dist/ → ios/App/App/public/
# - Installs/updates native plugin dependencies
# - Updates capacitor.config.json
```

**⚠️ Run `npx cap sync ios` after:**
- Installing new Capacitor plugins
- Updating `capacitor.config.ts`
- Making changes to web build

---

### **Step 5: Open in Xcode**

```bash
# Open iOS project in Xcode
npx cap open ios

# OR manually open:
# open ios/App/App.xcworkspace
```

**⚠️ Important**: Always open `.xcworkspace`, NOT `.xcodeproj`

---

### **Step 6: Configure iOS Project**

#### **A. Update App Info**

In Xcode, select `App` target → `General` tab:

- **Display Name**: Chravel
- **Bundle Identifier**: `com.chravel.app` (must match Apple Developer account)
- **Version**: 1.0.0
- **Build**: 1

#### **B. Configure Signing**

Select `Signing & Capabilities` tab:

- Check **Automatically manage signing**
- Select your **Team** (Apple Developer account)
- Xcode will auto-generate provisioning profiles

**Required Capabilities** (already added in project):
- Push Notifications
- Background Modes (for location updates)

#### **C. Update App Icons**

1. Generate icon set: Use [appicon.co](https://appicon.co) or [icongen.app](https://icongen.app)
2. Upload base icon (1024x1024 PNG)
3. Download iOS icon set
4. Replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/` contents

**Icon Sizes Needed**:
- 20pt (40x40, 60x60)
- 29pt (58x58, 87x87)
- 40pt (80x80, 120x120)
- 60pt (120x120, 180x180)
- 1024pt (1024x1024 - App Store)

#### **D. Configure Splash Screen**

1. Create splash screen: 2732x2732 PNG with centered logo
2. Replace `ios/App/App/Assets.xcassets/Splash.imageset/splash.png`
3. Adjust `LaunchScreen.storyboard` if needed

---

### **Step 7: Test on Simulator**

1. Select simulator: iPhone 15 Pro (iOS 17.0+)
2. Click **Run** button (⌘R)
3. App should launch in simulator

**Test These Features**:
- ✅ Trip creation flow
- ✅ Chat messaging
- ✅ Calendar view
- ✅ Navigation tabs
- ⚠️ Camera (won't work in simulator)
- ⚠️ Haptics (won't work in simulator)
- ⚠️ Push notifications (needs real device)

---

### **Step 8: Test on Real Device**

1. Connect iPhone via USB
2. Select your device in Xcode device dropdown
3. Click **Run** button (⌘R)
4. First time: Trust developer certificate on device (Settings → General → Device Management)

**Test Native Features**:
- ✅ Camera photo upload
- ✅ Haptic feedback on taps
- ✅ Location access for map
- ✅ Share sheet functionality
- ✅ Push notifications (after APNs setup)

---

### **Step 9: Prepare for App Store**

#### **A. Create App Store Connect Record**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Chravel
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.chravel.app
   - **SKU**: CHRAVEL001
   - **User Access**: Full Access

#### **B. Prepare Metadata**

**App Store Description** (4000 char max):
```
Chravel is the AI-native operating system for collaborative travel, logistics, 
and event management. Plan trips with friends, family, or teams—all in one place.

FEATURES:
• Real-time trip collaboration with built-in chat
• Smart itinerary builder with conflict detection
• Shared media hub for photos and videos
• Budget tracking with automatic expense splitting
• AI concierge for recommendations and planning
• Interactive maps with custom locations
• Works offline with automatic sync

PERFECT FOR:
✈️ Group vacations with friends
🎉 Destination weddings and bachelor/ette parties
👨‍👩‍👧‍👦 Family reunions and cruises
🎵 Music festival and concert trips
⚽ Sports fan travel groups

JOIN THOUSANDS OF TRAVELERS WHO'VE ELIMINATED:
• Endless group chat confusion
• Lost itinerary updates
• Budget tracking spreadsheets
• Scattered photos across devices

Download Chravel and make your next trip seamless.
```

**Keywords** (100 char max, comma-separated):
```
travel,trip planner,group travel,itinerary,vacation,trip organizer,travel planning,group chat,budget tracker,travel app
```

**Category**: Travel

**Content Rating**: 4+ (No objectionable content)

#### **C. Take Screenshots**

Required sizes:
- **6.5" Display** (iPhone 15 Pro Max): 1290 x 2796 pixels (3 required)
- **5.5" Display** (iPhone 8 Plus): 1242 x 2208 pixels (3 required)

**Screenshot Ideas**:
1. Trip dashboard with active trips
2. Chat interface with messages
3. Calendar view with itinerary
4. Media hub with photos
5. Budget tracker with expenses

**Tool**: Use Xcode simulator → Cmd+S to save screenshot

#### **D. Privacy Policy**

**Required**: URL to privacy policy (can host on GitHub Pages)

Create `PRIVACY_POLICY.md` → Host at `https://yourcompany.com/privacy`

**Template**:
```markdown
# Chravel Privacy Policy

Last updated: [Date]

## Data Collection
- Email address (authentication)
- Trip information (itineraries, locations)
- Photos (uploaded to trips)
- Messages (trip chat)

## Data Usage
- Provide trip planning services
- Enable collaboration features
- Improve AI recommendations

## Data Storage
- All data stored in Supabase (SOC 2 compliant)
- End-to-end encryption for messages
- Photos stored in secure S3 buckets

## Third-Party Services
- Supabase (backend)
- Google Maps (location services)
- Apple Push Notification Service (notifications)

## User Rights
- Export your data
- Delete your account
- Opt-out of analytics

Contact: privacy@chravel.com
```

---

### **Step 10: Archive & Upload**

#### **A. Create Archive**

1. In Xcode, select **Any iOS Device** (not simulator)
2. Product → Archive (⌘⇧B to build first)
3. Wait for archiving (~2-5 minutes)
4. Organizer window opens with your archive

#### **B. Validate Archive**

1. Click **Validate App**
2. Select distribution method: **App Store Connect**
3. Select signing: **Automatically manage signing**
4. Click **Validate**
5. Fix any errors (common: missing icons, privacy strings)

#### **C. Upload to App Store Connect**

1. Click **Distribute App**
2. Select **App Store Connect**
3. Select **Upload**
4. Select signing: **Automatically manage signing**
5. Click **Upload**
6. Wait for processing (~5-15 minutes)

#### **D. Check Upload Status**

1. Go to App Store Connect
2. Select your app → TestFlight tab
3. Wait for "Processing" to change to "Ready to Test"

---

### **Step 11: TestFlight Beta Testing**

1. In App Store Connect → TestFlight
2. Click **Internal Testing** → **Add Internal Testers**
3. Add email addresses (up to 100 internal testers)
4. Testers receive email invitation
5. Test for 3-5 days, collect feedback
6. Fix critical bugs, upload new build if needed

---

### **Step 12: Submit for Review**

1. Go to App Store Connect → Your App → **App Store** tab
2. Click version **1.0** → **Prepare for Submission**
3. Fill in all required fields:
   - App description
   - Keywords
   - Screenshots
   - Support URL
   - Privacy policy URL
4. Select build from TestFlight
5. Click **Save** → **Submit for Review**

**Review Timeline**: 24-72 hours (usually ~2 days)

**Common Rejection Reasons**:
- Missing privacy policy
- Incomplete app metadata
- Crash on launch (test thoroughly!)
- Missing app functionality (must work without account)

---

## Configuration Files

### **capacitor.config.ts**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chravel.app',
  appName: 'chravel',
  webDir: 'dist',
  server: {
    url: 'https://20feaa04-0946-4c68-a68d-0eb88cc1b9c4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav"
    }
  },
  ios: {
    scheme: "Chravel"
  }
};

export default config;
```

**Important Fields**:
- `appId`: Must match Bundle ID in Xcode
- `appName`: Display name of app
- `webDir`: Output directory from `npm run build`
- `server.url`: For development hot-reload (remove for production)

---

### **Info.plist** (Auto-generated)

Located at: `ios/App/App/Info.plist`

**Critical Privacy Strings** (already configured):
```xml
<key>NSCameraUsageDescription</key>
<string>Chravel needs access to your camera to take photos for your trips</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Chravel needs access to your photo library to select photos for your trips</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Chravel needs your location to help plan trips and show nearby points of interest</string>
```

**⚠️ If missing, app will crash on first permission request!**

---

## Hot Reload for Development

For faster development, enable live reload:

1. Start dev server:
```bash
npm run dev
```

2. Update `capacitor.config.ts`:
```typescript
server: {
  url: 'http://localhost:5173', // Your Vite dev server
  cleartext: true
}
```

3. Sync and run:
```bash
npx cap sync ios
npx cap run ios
```

Now code changes hot-reload in iOS app!

**⚠️ Remove `server.url` before production build**

---

## Troubleshooting

### **Issue: "Command PhaseScriptExecution failed"**

**Cause**: Capacitor node modules not installed

**Fix**:
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

---

### **Issue: Black screen on launch**

**Cause**: Web assets not synced

**Fix**:
```bash
npm run build
npx cap sync ios
```

---

### **Issue: Camera/Location not working**

**Cause**: Missing Info.plist privacy strings

**Fix**: Check `ios/App/App/Info.plist` has all `NSUsageDescription` keys

---

### **Issue: Push notifications not working**

**Cause**: APNs certificate not configured

**Fix**:
1. Generate APNs key in Apple Developer Portal
2. Upload to Supabase dashboard under Project Settings → Push Notifications
3. Ensure capabilities enabled in Xcode

---

### **Issue: "Provisioning profile doesn't match"**

**Cause**: Bundle ID mismatch

**Fix**: Ensure `capacitor.config.ts` appId matches Xcode Bundle Identifier

---

### **Issue: Build fails with CocoaPods error**

**Fix**:
```bash
cd ios/App
sudo gem install cocoapods
pod repo update
pod install
cd ../..
```

---

## Updating the App

### **For Code Changes**:
```bash
npm run build
npx cap sync ios
# No need to reopen Xcode
```

### **For Plugin Changes**:
```bash
npm install @capacitor/new-plugin
npx cap sync ios
# Check Xcode for new permissions needed
```

### **For Config Changes**:
```bash
# Edit capacitor.config.ts
npx cap sync ios
# Rebuild in Xcode
```

---

## Production Checklist

Before App Store submission:

- [ ] Remove hot-reload `server.url` from `capacitor.config.ts`
- [ ] Test on real device (not simulator)
- [ ] All privacy strings present in `Info.plist`
- [ ] App icons all sizes generated (including 1024x1024)
- [ ] Splash screen looks good on all device sizes
- [ ] App Store screenshots taken (6.5" and 5.5" required)
- [ ] Privacy policy URL accessible
- [ ] Support URL working
- [ ] All native features tested (camera, location, notifications)
- [ ] No crashes on cold start
- [ ] Push notifications configured with APNs certificate
- [ ] TestFlight beta testing completed (3-5 days minimum)

---

## Maintenance

### **Monthly Updates**:
- Check for Capacitor plugin updates: `npm outdated`
- Update dependencies: `npm update`
- Sync iOS: `npx cap sync ios`
- Test on latest iOS version

### **When iOS Updates Release**:
- Update Xcode to latest version
- Test app on new iOS version
- Update deployment target if needed (in Xcode)

---

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Setup Guide](https://capacitorjs.com/docs/ios)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Chravel Supabase Dashboard](https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa)

---

## Support

For issues with:
- **Capacitor**: Check [GitHub Issues](https://github.com/ionic-team/capacitor/issues)
- **Xcode/iOS**: Apple Developer Forums
- **App Store Review**: App Store Connect → Contact Us

---

**Last Updated**: January 2025  
**Capacitor Version**: 7.4.2  
**iOS Deployment Target**: 13.0+  
**Xcode Version**: 15.0+
