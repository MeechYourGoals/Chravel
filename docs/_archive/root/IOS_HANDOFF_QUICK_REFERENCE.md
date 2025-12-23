# iOS Platform Migration - Quick Reference

## ✅ What Cursor Completed (Saves ~14 hours)

1. **Native SDK Integration** - Added Supabase Swift SDK + KeychainAccess to Podfile
2. **Native View Controllers** - Created scaffolding for Auth, Payment, Biometric auth
3. **Permissions** - Added missing microphone permission to Info.plist
4. **Universal Links** - Code complete (needs Apple Developer Portal config)
5. **Push Notifications** - Code complete (needs APNs certificates)
6. **Screenshot Tooling** - Created automated script with instructions
7. **Launch Screen** - Already optimized

## ⏳ What Human Agency Must Do (~8-12 hours)

### Critical (Must Do):
1. **Apple Developer Portal** (2-3h)
   - Configure APNs certificates
   - Set up Universal Links domain verification
   - Create App Store Connect app record

2. **Screenshots** (2-3h)
   - Generate for iPhone 6.7", 5.5", iPad 12.9", 11"
   - Use script: `ios/scripts/generate-screenshots.sh`
   - Upload to App Store Connect

3. **Supabase Integration** (2-3h)
   - Run `pod install`
   - Add Supabase credentials to Info.plist
   - Test native SDK integration

### Optional:
4. **Native UI** (1-2h) - Implement UI for Auth/Payment view controllers
5. **Privacy Policy** (1-2h) - Legal content + App Store metadata
6. **TestFlight** (1-2h) - Build, upload, test

## 📁 Key Files

- **Handoff Doc:** `IOS_PLATFORM_MIGRATION_HANDOFF.md` (full details)
- **Screenshot Script:** `ios/scripts/generate-screenshots.sh`
- **New Native Code:** `ios/App/App/NativeViewControllers/`

## 🚀 Quick Start

```bash
cd ios/App
pod install
# Then open App.xcworkspace in Xcode
```

**Next:** See `IOS_PLATFORM_MIGRATION_HANDOFF.md` for complete instructions.
