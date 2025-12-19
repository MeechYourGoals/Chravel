# 🚀 ChravelApp → TestFlight Deployment Guide

**Based on [@dave_watches workflow](https://x.com/dave_watches/status/1979173997620461896)**

This is the **fastest path** from code to TestFlight. Total time: ~30 minutes.

---

## Prerequisites ✅

**Before you start:**
- [ ] Mac with Xcode installed (14.0+)
- [ ] Apple Developer Account ($99/year) - [Enroll here](https://developer.apple.com/programs/)
- [ ] Node.js 18+ and npm installed
- [ ] Git repo access (you have this ✅)

---

## Part 1: Terminal Commands (Project Root)

Run these commands from your project directory:

### Step 1: Get the Code
```bash
# If you haven't cloned yet:
git clone https://github.com/MeechYourGoals/Chravel.git && cd Chravel

# If already cloned:
cd Chravel
git checkout main && git pull origin main
```

### Step 2: Install Dependencies & Build Web App
```bash
# Install dependencies
npm ci                 # or `npm install`

# Build the production web app
npm run build
```

**Verify build:** You should see `✓ built in X seconds` and a `dist/` folder created.

### Step 3: Sync Capacitor + Open Xcode
```bash
# Sync Capacitor (copies built web app to iOS project)
npx cap sync ios

# Open Xcode project
npx cap open ios
```

**This will launch Xcode automatically.** ⚡

---

## Part 2: Xcode (Organizer Upload to TestFlight)

### Step 1: Select Target (Scheme Settings)
1. At the top of Xcode, click the **target dropdown** (next to play button)
2. Select **"App"** as your target
3. Set scheme to **"Release"**
4. Select **"Any iOS Device (arm64)"** as the destination

![Select Target](https://i.imgur.com/example.png)

---

### Step 2: Product → Clean Build Folder
1. In Xcode menu bar: **Product → Clean Build Folder**
2. Wait for "Clean Finished" message

---

### Step 3: Signing & Capabilities

1. In left sidebar, click **"App"** (blue icon at top)
2. Select **"App"** target (under TARGETS)
3. Click **"Signing & Capabilities"** tab

**Configure the following:**

| Setting | Value |
|---------|-------|
| **Team** | Select your Apple Developer Team |
| **Bundle Identifier** | `com.chravel.app` (must be unique) |
| **Provisioning Profile** | Automatic (Xcode will create it) |

✅ **Must match App Store Connect Bundle ID exactly**

**If you see errors:**
- "Failed to register bundle identifier" → Bundle ID already taken, change it
- "No profiles for..." → Wait 30 seconds, Xcode is generating it

---

### Step 4: Bump Version/Build Number

**TestFlight requires a new build number for each upload.**

1. Still in **"Signing & Capabilities"**, scroll to **"General"** tab
2. Find **Version** and **Build** fields:
   - **Version**: `1.0.0` (semantic version - only change for major releases)
   - **Build**: `1` → Change to `2`, `3`, `4`, etc. (increment for each upload)

**Example progression:**
- First upload: Version `1.0.0`, Build `1`
- Second upload: Version `1.0.0`, Build `2`
- Major update: Version `1.1.0`, Build `1`

---

### Step 5: Product → Archive

1. In menu bar: **Product → Archive**
2. Wait 2-5 minutes for build (watch progress bar in top center)
3. When finished, **Organizer window** will open automatically

---

### Step 6: Organizer → Distribute App → Upload

1. In **Organizer** window, select your archive (most recent at top)
2. Click **"Distribute App"** button (blue, on right side)
3. Select **"App Store Connect"** → **Next**
4. Select **"Upload"** → **Next**
5. **Signing options:**
   - ✅ **Automatically manage signing** (recommended)
   - Click **Next**
6. Review summary → Click **"Upload"**
7. Wait for upload (1-5 minutes depending on connection)

✅ **Success message:** "Upload Successful"

---

## Part 3: App Store Connect (TestFlight)

### Step 1: Create App in App Store Connect (First Time Only)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Chravel
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: `com.chravel.app` (MUST match Xcode)
   - **SKU**: `chravel-ios-001` (any unique ID)
   - **User Access**: Full Access

**CRITICAL:** Bundle ID in App Store Connect MUST match Xcode exactly.

---

### Step 2: Wait for Build Processing

1. Go to **TestFlight** tab in App Store Connect
2. Your build will appear under **"iOS Builds"** in ~5-10 minutes
3. Status will show:
   - ⏳ **Processing** (5-10 min)
   - ⚠️ **Missing Compliance** (you'll fix this next)
   - ✅ **Ready to Test** (after compliance)

---

### Step 3: Export Compliance

When build shows **"Missing Compliance"**:

1. Click the **yellow warning icon**
2. Answer export compliance questions:
   - **Does your app use encryption?** → **No** (unless you added custom crypto)
   - If you use HTTPS (which you do), select:
     - ✅ "Qualifies for exemption under ECCN 5D002"

3. Click **"Start Internal Testing"**

---

### Step 4: Add Testers

1. Still in TestFlight tab, click **"Internal Testing"**
2. Click **"+"** to add testers
3. Add yourself + team members via email
4. Testers will receive email with TestFlight link

**Testers install:**
1. Download **TestFlight app** from App Store
2. Tap link in email
3. Install Chravel

---

## Common Gotchas (from the tweet) 🐛

### CocoaPods Issues
```bash
# If you see "Unable to find a specification for..."
sudo gem install cocoapods
cd ios && pod install
```

### Capacitor Sync Issues
```bash
# Run copy command explicitly
npx cap sync ios
# Or if that fails:
npx cap copy ios
```

### Permissions Missing
Check `ios/App/App/Info.plist` includes:

```xml
<key>NSCameraUsageDescription</key>
<string>Chravel needs camera access to capture trip photos</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Chravel needs photo library access to select trip photos</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Chravel needs your location to show nearby destinations</string>
```

**These are already configured in your project. ✅**

### Bundle ID Mismatch
**Symptom:** Upload succeeds but build never appears in App Store Connect

**Fix:** 
1. In App Store Connect, check the Bundle ID under **App Information**
2. In Xcode, verify **Bundle Identifier** matches exactly (case-sensitive)
3. Re-archive and upload

---

## Quick Reference: Full Command Sequence

```bash
# Terminal (from project root)
git pull origin main
npm ci
npm run build
npx cap sync ios
npx cap open ios

# Xcode opens automatically ⚡
# Then follow Part 2 steps in Xcode GUI
```

---

## Next Build (Iteration)

**For subsequent uploads:**

```bash
# 1. Make code changes, then:
git pull origin main
npm run build
npx cap sync ios

# 2. Open Xcode:
npx cap open ios

# 3. In Xcode:
#    - Bump Build number (keep Version same)
#    - Product → Archive
#    - Distribute → Upload
```

---

## Troubleshooting

### "No such file or directory: dist/"
**Fix:** Run `npm run build` first to generate the dist folder.

### "Provisioning profile doesn't match"
**Fix:** 
1. Xcode → Preferences → Accounts → Download Manual Profiles
2. Clean build folder (Product → Clean)
3. Try again

### "Build is invalid" after upload
**Check:**
- [ ] Build number was incremented
- [ ] Bundle ID matches App Store Connect
- [ ] All required icons present (App Icon in Assets.xcassets)

### "Missing Info.plist key"
**Fix:** Check ios/App/App/Info.plist has all permission keys (see "Permissions Missing" section above)

---

## Resources

- **Full iOS App Store Guide:** See `IOS_APP_STORE_GUIDE.md` in this repo
- **Capacitor Native Guide:** See `CAPACITOR_NATIVE_GUIDE.md` for native features
- **App Store Connect:** https://appstoreconnect.apple.com
- **TestFlight Documentation:** https://developer.apple.com/testflight/

---

**🎉 Congrats!** Your app is now in TestFlight. Share the link with your team and start testing!

**Questions?** Check the comprehensive guides in this repo or hit up the Capacitor docs: https://capacitorjs.com/docs/ios
