# Android Deployment Quickstart

**🎯 Goal:** Get ChravelApp into Google Play Store in 2-3 hours

**📋 Prerequisites:**
- Android Studio (latest stable)
- Java JDK 17+
- Google Play Developer Account ($25 one-time)
- Node.js 18+ installed

---

## Option 1: Automated (Recommended) ⚡

```bash
# 1. Run pre-flight check
./preflight-check-android.sh

# 2. Deploy (builds + opens Android Studio)
./deploy-android.sh

# 3. Follow Play Store steps from this guide (Part 2)
```

---

## Option 2: Manual

### Step 1: Environment Setup

**Install Android Studio:**
1. Download from [developer.android.com/studio](https://developer.android.com/studio)
2. During installation, ensure:
   - Android SDK
   - Android SDK Platform (API 33+)
   - Android Virtual Device (AVD)
   - Intel HAXM (for emulator)

**Configure Environment Variables:**

**macOS/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Windows:**
- System Environment Variables:
  - `ANDROID_HOME`: `C:\Users\[username]\AppData\Local\Android\Sdk`
  - Add to PATH: `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\tools`

**Verify:**
```bash
adb version  # Should show Android Debug Bridge version
```

---

### Step 2: Add Android Platform

```bash
# Navigate to project root
cd /workspace

# Add Android platform
npx cap add android

# This creates:
# - android/ directory with Android project
# - android/app/src/main/AndroidManifest.xml
# - android/app/build.gradle
```

---

### Step 3: Configure Android Project

**Update `capacitor.config.ts`** (already configured):
```typescript
android: {
  allowMixedContent: true,
  backgroundColor: "#1a1a1a",
  appendUserAgent: "ChravelMobile",
}
```

**Update Android Manifest Permissions:**

Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest>
  <!-- Required permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.VIBRATE" />
  
  <!-- Android 13+ photo picker -->
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
  <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
  
  <application>
    <!-- ... -->
  </application>
</manifest>
```

**Configure Build Settings:**

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

---

### Step 4: Generate App Icons & Splash Screens

**App Icons:**
1. Create 1024x1024 PNG icon
2. Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
3. Generate adaptive icons
4. Replace in `android/app/src/main/res/`

**Splash Screen:**
1. Create 2732x2732 PNG with logo centered
2. Generate densities:
   - `hdpi`: 480×800
   - `xhdpi`: 720×1280
   - `xxhdpi`: 960×1600
   - `xxxhdpi`: 1280×1920
3. Place in `android/app/src/main/res/drawable-*/`

---

### Step 5: Build and Sync

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

---

### Step 6: Open in Android Studio

```bash
# Open Android project
npx cap open android

# Or manually:
# Open android/ folder in Android Studio
```

---

### Step 7: Configure Firebase (Push Notifications)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project or use existing
3. Add Android app:
   - Package name: `com.chravel.app`
   - App nickname: Chravel
   - SHA-1: (get from keystore - see Step 9)
4. Download `google-services.json`
5. Place in `android/app/`

**Update build.gradle files:**

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

---

### Step 8: Test on Emulator

1. In Android Studio: **Tools → AVD Manager**
2. Create Virtual Device:
   - Phone: Pixel 6
   - System Image: API 33 (Android 13)
   - RAM: 2GB+
3. Start emulator
4. Run app: Click green play button

**Test Checklist:**
- [ ] App launches without crashing
- [ ] Navigation works
- [ ] Chat messages send/receive
- [ ] Images load properly
- [ ] Maps display correctly
- [ ] Offline mode works

---

### Step 9: Create Release Build

**Generate Signing Key:**
```bash
keytool -genkey -v -keystore release-key.keystore -alias key-alias -keyalg RSA -keysize 2048 -validity 10000

# Save passwords securely!
# You'll need:
# - Store password
# - Key password
# - SHA-1 fingerprint (for Firebase)
```

**Get SHA-1 for Firebase:**
```bash
keytool -list -v -keystore release-key.keystore -alias key-alias
# Copy SHA-1 fingerprint to Firebase console
```

**Configure Signing:**

Create `android/keystore.properties`:
```properties
storeFile=release-key.keystore
storePassword=your-store-password
keyAlias=key-alias
keyPassword=your-key-password
```

**Update `android/app/build.gradle`:**
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

**Build Release Bundle (Recommended for Play Store):**
```bash
cd android
./gradlew bundleRelease

# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```

**Build Release APK (For direct install):**
```bash
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

---

### Step 10: Google Play Console Setup

1. Go to [Play Console](https://play.google.com/console)
2. Create new app:
   - App name: Chravel
   - Default language: English (US)
   - App type: App
   - Category: Travel & Local
   - Free/Paid: Free

3. **Complete store listing:**
   - Short description (80 chars): "AI-powered group travel planner with chat, budgets, and collaborative itineraries"
   - Full description: See `ANDROID_CAPACITOR_GUIDE.md` for full text
   - Screenshots: 9 phone screenshots (16:9 ratio)
   - Feature graphic: 1024×500
   - Icon: 512×512

4. **Content rating:**
   - Complete questionnaire
   - Expected: Everyone

5. **App content:**
   - Privacy policy URL
   - Ads: No
   - Target audience: 13+

6. **Upload AAB:**
   - Go to Production → Create new release
   - Upload `app-release.aab`
   - Release notes: "Initial release"
   - Save → Review → Start rollout

---

## Android Studio Quick Steps (5 minutes)

1. **Select target:** App (Release, Any Android Device)
2. **Clean:** Build → Clean Project
3. **Sign:** Build → Generate Signed Bundle/APK → Android App Bundle
4. **Version:** Update `versionCode` and `versionName` in `build.gradle`
5. **Build:** Build → Build Bundle(s) / APK(s) → Build Bundle(s)
6. **Upload:** Upload AAB to Play Console

---

## Files You Need

| File | Purpose |
|------|---------|
| `ANDROID_CAPACITOR_GUIDE.md` | Comprehensive Android guide |
| `deploy-android.sh` | Automated build script (to be created) |
| `preflight-check-android.sh` | Validates requirements (to be created) |
| `release-key.keystore` | Signing certificate (keep secure!) |
| `google-services.json` | Firebase config |

---

## Common Issues

**❌ "SDK Location Not Found"**
```bash
# Create local.properties in android/
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

**❌ "Build Tools Version Not Found"**
- Open SDK Manager in Android Studio
- Install requested version

**❌ "Unable to Find Valid Certification Path"**
```bash
cd android
./gradlew wrapper --gradle-version=8.0
```

**❌ App Crashes on Launch**
1. Check logcat for errors: `adb logcat`
2. Ensure all permissions in manifest
3. Verify `google-services.json` is present
4. Check ProGuard rules aren't stripping required classes

**❌ "Package name mismatch"**
- Ensure `applicationId` in `build.gradle` matches Play Console exactly

---

## Next Upload

```bash
# Make code changes
git pull
npm run build
npx cap sync android
npx cap open android

# In Android Studio:
# 1. Bump versionCode in build.gradle
# 2. Build → Build Bundle(s)
# 3. Upload new AAB to Play Console
```

---

## Timeline

1. **Environment Setup:** 1-2 hours
2. **Android Platform Addition:** 30 minutes
3. **Configuration & Icons:** 1-2 hours
4. **Testing:** 2-3 hours
5. **Play Store Setup:** 2-3 hours
6. **Review Time:** 2-3 hours (much faster than iOS)
7. **Total:** 1-2 days to Play Store

---

## Support

- **Issues?** See troubleshooting in `ANDROID_CAPACITOR_GUIDE.md`
- **Capacitor docs:** https://capacitorjs.com/docs/android
- **Play Console help:** https://support.google.com/googleplay/android-developer

**Current Status:** ⚠️ Android platform not yet added (run `npx cap add android` first)
