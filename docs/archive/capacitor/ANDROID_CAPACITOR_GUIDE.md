# Android/Capacitor Migration Guide for Chravel

**Platform:** Android via Capacitor  
**Package Name:** com.chravel.app  
**Current Status:** Not Yet Configured (0%)  
**Estimated Setup Time:** 2-3 hours

## Overview

This guide provides step-by-step instructions for adding Android support to Chravel using Capacitor. The same React/TypeScript codebase will compile to a native Android app with full device access.

## Prerequisites

### Development Environment
- **Node.js 18+** and npm
- **Java JDK 17** (Temurin recommended)
- **Android Studio** (Latest stable version)
- **Android SDK** (API Level 33+)
- **Gradle 8.0+**
- **8GB+ RAM** recommended
- **25GB+ free disk space**

### Accounts & Credentials
- **Google Play Developer Account** ($25 one-time fee)
- **Firebase Project** (for push notifications)
- **Google Cloud Console** access (for Maps API)

## Step 1: Install Android Studio

1. Download from [developer.android.com/studio](https://developer.android.com/studio)
2. During installation, ensure these are selected:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
   - Intel HAXM (for emulator acceleration)

3. After installation, open Android Studio and go to:
   - **Tools → SDK Manager**
   - Install SDK Platforms: API 33, 34
   - Install SDK Tools:
     - Android SDK Build-Tools
     - Android SDK Platform-Tools
     - Android SDK Command-line Tools
     - Android Emulator
     - Google Play Services

## Step 2: Configure Environment Variables

### macOS/Linux
Add to `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### Windows
Add to System Environment Variables:
- `ANDROID_HOME`: `C:\Users\[username]\AppData\Local\Android\Sdk`
- Add to PATH:
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\tools`
  - `%ANDROID_HOME%\tools\bin`
  - `%ANDROID_HOME%\emulator`

## Step 3: Add Android Platform to Chravel

```bash
# Navigate to project root
cd /path/to/chravel

# Add Android platform
npx cap add android

# This creates:
# - android/ directory with Android project
# - android/app/src/main/AndroidManifest.xml
# - android/app/build.gradle
```

## Step 4: Configure Android Project

### 4.1 Update `capacitor.config.ts`
```typescript
const config: CapacitorConfig = {
  appId: 'com.chravel.app',
  appName: 'Chravel',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav"
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1a1a1a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#1a1a1a",
    appendUserAgent: "ChravelMobile",
    buildOptions: {
      keystorePath: 'release-key.keystore',
      keystoreAlias: 'key-alias',
    }
  }
};
```

### 4.2 Update Android Manifest Permissions

Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<!-- Add these permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- For Android 13+ photo picker -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

### 4.3 Configure Build Settings

Edit `android/app/build.gradle`:
```gradle
android {
    namespace "com.chravel.app"
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.chravel.app"
        minSdkVersion 26
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        
        // Multidex support for large apps
        multiDexEnabled true
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'com.android.support:multidex:2.0.1'
}
```

## Step 5: Generate App Icons and Splash Screens

### App Icons
1. Create a 1024x1024 PNG icon
2. Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
3. Generate adaptive icons
4. Replace in `android/app/src/main/res/`

### Splash Screen
1. Create 2732x2732 PNG with logo centered
2. Generate densities:
   - hdpi: 480×800
   - xhdpi: 720×1280
   - xxhdpi: 960×1600
   - xxxhdpi: 1280×1920
3. Place in `android/app/src/main/res/drawable-*/`

## Step 6: Build and Sync

```bash
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# This copies:
# - Web assets to android/app/src/main/assets/public/
# - Capacitor plugins to Android dependencies
# - Updates configuration
```

## Step 7: Open in Android Studio

```bash
# Open Android project
npx cap open android

# Or manually open:
# Open android/ folder in Android Studio
```

## Step 8: Configure Firebase (Push Notifications)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project or use existing
3. Add Android app:
   - Package name: `com.chravel.app`
   - App nickname: Chravel
   - SHA-1: (get from keystore)
4. Download `google-services.json`
5. Place in `android/app/`

### Update build.gradle files:

**Project-level** `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

**App-level** `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.1.2'
}
```

## Step 9: Test on Emulator

1. In Android Studio: **Tools → AVD Manager**
2. Create Virtual Device:
   - Phone: Pixel 6
   - System Image: API 33 (Android 13)
   - RAM: 2GB+
3. Start emulator
4. Run app: Click green play button

### Test Checklist
- [ ] App launches without crashing
- [ ] Navigation works
- [ ] Chat messages send/receive
- [ ] Images load properly
- [ ] Maps display correctly
- [ ] Offline mode works

## Step 10: Test on Physical Device

1. Enable Developer Options on phone:
   - Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. Select device in Android Studio
5. Run app

### Test Native Features
- [ ] Camera photo capture
- [ ] Photo library selection
- [ ] Location services
- [ ] Haptic feedback
- [ ] Share functionality
- [ ] Push notifications

## Step 11: Create Release Build

### Generate Signing Key
```bash
keytool -genkey -v -keystore release-key.keystore -alias key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing
Create `android/keystore.properties`:
```properties
storeFile=release-key.keystore
storePassword=your-store-password
keyAlias=key-alias
keyPassword=your-key-password
```

### Build Release APK
```bash
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### Build Release Bundle (Recommended)
```bash
cd android
./gradlew bundleRelease

# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```

## Step 12: Google Play Console Setup

1. Go to [Play Console](https://play.google.com/console)
2. Create new app:
   - App name: Chravel
   - Default language: English (US)
   - App type: App
   - Category: Travel & Local
   - Free/Paid: Free

3. Complete store listing:
   - Description (same as iOS)
   - Screenshots (phone & tablet)
   - Feature graphic: 1024×500
   - Icon: 512×512

4. Content rating:
   - Complete questionnaire
   - Expected: Everyone

5. App content:
   - Privacy policy URL
   - Ads: No
   - Target audience: 13+

## Play Store Listing Content

### Short Description (80 chars)
```
AI-powered group travel planner with chat, budgets, and collaborative itineraries
```

### Full Description (4000 chars)
```
Chravel is the ultimate collaborative travel planning platform that brings your group trips to life. Whether you're organizing a family vacation, coordinating a destination wedding, or managing a sports team tour, Chravel keeps everyone connected and organized.

🚀 KEY FEATURES

✈️ Smart Trip Planning
• AI-powered itinerary suggestions
• Drag-and-drop schedule builder
• Automatic conflict detection
• Weather-aware recommendations

💬 Built-in Group Chat
• Real-time messaging for your trip
• Share photos, links, and documents
• @mentions and reactions
• Automatic translation for international groups

💰 Budget Tracking Made Easy
• Split expenses automatically
• Scan receipts with your camera
• Track who owes what
• Support for multiple currencies

📸 Shared Media Hub
• Everyone's photos in one place
• Auto-organized by date and location
• Download all memories with one tap
• Create beautiful trip albums

🗺️ Interactive Maps
• See all your places on one map
• Get directions between stops
• Find things to do nearby
• Works offline for international travel

🤖 AI Travel Concierge
• Get instant recommendations
• Find restaurants, activities, and more
• Solve travel problems on the go
• Available 24/7 in your pocket

📱 WORKS EVERYWHERE
• Full offline support - no internet needed
• Syncs across all your devices
• Native Android app experience
• Desktop version available too

👥 PERFECT FOR
• Friend group vacations
• Bachelor/bachelorette parties
• Family reunions
• Music festival crews
• Sports team travel
• Corporate retreats
• Destination weddings
• Adventure groups

💎 PREMIUM FEATURES
Upgrade to Chravel Plus or Pro for:
• Unlimited trip participants
• Priority AI concierge
• Advanced budget reports
• Custom trip branding
• Team management tools
• Professional logistics features

🔒 PRIVACY FIRST
• Your data is always private
• End-to-end encryption available
• No ads or data selling
• GDPR compliant

Join thousands of groups who've ditched the chaos of planning in scattered apps. Download Chravel and make your next trip unforgettable!

Questions? Visit chravel.app/help or email support@chravel.app
```

### Screenshots Required

#### Phone (9 screenshots, 16:9 ratio)
1. Trip dashboard
2. Group chat in action
3. Interactive itinerary
4. Budget tracker
5. Shared photo gallery
6. AI recommendations
7. Map view
8. Task management
9. Travel wallet

#### Tablet (Optional but recommended)
Same screenshots in tablet format

## Android-Specific Features

### Material Design 3
The app automatically adapts to Android's Material You theming:
- Dynamic color extraction
- System-wide theming
- Proper elevation shadows
- Native transitions

### Android-Specific Optimizations
```typescript
// In your code, detect Android:
import { Capacitor } from '@capacitor/core';

if (Capacitor.getPlatform() === 'android') {
  // Android-specific code
  // e.g., different navigation patterns
}
```

### Permissions Handling
```typescript
// Request permissions at runtime for Android 6+
import { Camera } from '@capacitor/camera';

const checkPermissions = async () => {
  const permissions = await Camera.checkPermissions();
  if (permissions.camera !== 'granted') {
    const requested = await Camera.requestPermissions();
    // Handle permission result
  }
};
```

## Troubleshooting

### "SDK Location Not Found"
```bash
# Create local.properties in android/
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### "Build Tools Version Not Found"
Open SDK Manager and install the requested version

### "Unable to Find Valid Certification Path"
```bash
# Update CA certificates
cd android
./gradlew wrapper --gradle-version=8.0
```

### App Crashes on Launch
1. Check logcat for errors
2. Ensure all permissions in manifest
3. Verify google-services.json is present
4. Check ProGuard rules aren't stripping required classes

## Performance Optimization

### Reduce APK Size
1. Enable ProGuard/R8
2. Use App Bundles (.aab) instead of APK
3. Optimize images with WebP
4. Remove unused resources

### Improve Startup Time
1. Lazy load heavy components
2. Optimize splash screen duration
3. Defer non-critical initialization

## Maintenance

### Regular Updates
- Update Capacitor plugins monthly
- Keep Android Studio updated
- Monitor Play Console for crashes
- Respond to user reviews

### Version Management
```gradle
// In app/build.gradle
versionCode 2  // Increment for each release
versionName "1.0.1"  // User-visible version
```

## Cost Breakdown

**One-Time Costs:**
- Google Play Developer: $25
- (Optional) Play Console Advanced: $25/month

**Ongoing Costs:**
- Same as iOS (API services)
- No additional Android-specific costs

## Timeline

1. **Environment Setup:** 1-2 hours
2. **Android Platform Addition:** 30 minutes
3. **Configuration & Icons:** 1-2 hours
4. **Testing:** 2-3 hours
5. **Play Store Setup:** 2-3 hours
6. **Review Time:** 2-3 hours (much faster than iOS)
7. **Total:** 1-2 days to Play Store

## Next Steps

1. ✅ Install Android Studio
2. ✅ Add Android platform to project
3. ✅ Configure and test on emulator
4. ✅ Create signing certificate
5. ✅ Build release bundle
6. ✅ Submit to Play Store

With these steps completed, Chravel will be ready for the Google Play Store!