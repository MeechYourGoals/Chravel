# iOS Deployment Quickstart

**🎯 Goal:** Get ChravelApp into TestFlight in 30 minutes

**📋 Prerequisites:**
- Mac with Xcode 14+
- Apple Developer Account ($99/year)
- Node.js 18+ installed

---

## Option 1: Automated (Recommended) ⚡

```bash
# 1. Run pre-flight check
./preflight-check.sh

# 2. Deploy (builds + opens Xcode)
./deploy-ios.sh

# 3. Follow Xcode steps from TESTFLIGHT_DEPLOY.md (Part 2)
```

---

## Option 2: Manual

```bash
# Build web app
npm ci
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios
```

Then follow [TESTFLIGHT_DEPLOY.md](./TESTFLIGHT_DEPLOY.md) Part 2.

---

## Xcode Quick Steps (5 minutes)

1. **Select target:** App (Release, Any iOS Device arm64)
2. **Clean:** Product → Clean Build Folder
3. **Sign:** Signing & Capabilities → Pick team, set Bundle ID: `com.chravel.app`
4. **Version:** Bump Build number (1 → 2 → 3...)
5. **Archive:** Product → Archive
6. **Upload:** Organizer → Distribute → Upload to App Store

---

## Files You Need

| File | Purpose |
|------|---------|
| `TESTFLIGHT_DEPLOY.md` | Full step-by-step guide (from tweet) |
| `deploy-ios.sh` | Automated build script |
| `preflight-check.sh` | Validates requirements |
| `IOS_APP_STORE_GUIDE.md` | Comprehensive App Store guide |
| `CAPACITOR_NATIVE_GUIDE.md` | Native features reference |

---

## Common Issues

**❌ "No dist/ folder"**
```bash
npm run build
```

**❌ CocoaPods issues**
```bash
sudo gem install cocoapods
cd ios/App && pod install
```

**❌ Bundle ID mismatch**
- Xcode: Bundle Identifier must match App Store Connect exactly
- Check: App Store Connect → App Information → Bundle ID

**❌ Build never appears in TestFlight**
- Wait 10 minutes for processing
- Check: Bundle ID matches
- Verify: Build number was incremented

---

## Next Upload

```bash
# Make code changes
git pull
npm run build
npx cap sync ios
npx cap open ios

# In Xcode: Bump build → Archive → Upload
```

---

## Support

- **Issues?** See troubleshooting in `TESTFLIGHT_DEPLOY.md`
- **Capacitor docs:** https://capacitorjs.com/docs/ios
- **TestFlight help:** https://developer.apple.com/testflight/

**Current Status:** ✅ iOS project configured, permissions set, ready to deploy
