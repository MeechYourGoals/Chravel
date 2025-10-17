# ChravelApp iOS Deployment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    🎯 START HERE                            │
│                                                             │
│  You're on Mac → Open Terminal → Navigate to Chravel repo  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Pull Changes                                       │
│  ─────────────────────                                      │
│  $ git pull origin main                                     │
│                                                             │
│  📥 Downloads: TESTFLIGHT_DEPLOY.md, deploy-ios.sh,        │
│                preflight-check.sh, etc.                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Validate (Optional but Recommended)                │
│  ───────────────────────────────────────                    │
│  $ ./preflight-check.sh                                     │
│                                                             │
│  ✅ Checks: macOS, Xcode, Node, Capacitor, permissions     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Automated Build & Sync                             │
│  ──────────────────────────────                             │
│  $ ./deploy-ios.sh                                          │
│                                                             │
│  🔄 Runs:                                                   │
│     1. npm ci (install dependencies)                        │
│     2. npm run build (build web app)                        │
│     3. npx cap sync ios (sync to iOS project)               │
│     4. npx cap open ios (opens Xcode)                       │
│                                                             │
│  ⏱️  Takes: ~5 minutes                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  🖥️  XCODE OPENS AUTOMATICALLY                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Xcode Configuration (5 minutes)                    │
│  ────────────────────────────────────                       │
│                                                             │
│  A. Select Target                                           │
│     Top bar: [App ▼] [Release] [Any iOS Device (arm64)]    │
│                                                             │
│  B. Clean Build Folder                                      │
│     Menu: Product → Clean Build Folder                      │
│                                                             │
│  C. Signing & Capabilities                                  │
│     Left sidebar: App (blue icon) → Signing tab             │
│     - Team: [Your Apple Developer Team]                     │
│     - Bundle ID: com.chravel.app                            │
│     - Provisioning: Automatic ✅                            │
│                                                             │
│  D. Bump Build Number                                       │
│     General tab:                                            │
│     - Version: 1.0.0 (keep same)                            │
│     - Build: 1 → 2 → 3 (increment each upload)              │
│                                                             │
│  E. Archive                                                 │
│     Menu: Product → Archive                                 │
│     ⏱️  Wait: 2-5 minutes (watch progress bar)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  🗄️  ORGANIZER WINDOW OPENS                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Upload to TestFlight (10 minutes)                  │
│  ──────────────────────────────────────                     │
│                                                             │
│  A. In Organizer                                            │
│     - Select latest archive (top of list)                   │
│     - Click: "Distribute App" (blue button)                 │
│                                                             │
│  B. Distribution Method                                     │
│     - Select: "App Store Connect" → Next                    │
│     - Select: "Upload" → Next                               │
│                                                             │
│  C. Signing                                                 │
│     - ✅ Automatically manage signing → Next                │
│                                                             │
│  D. Review & Upload                                         │
│     - Review summary → Click "Upload"                       │
│     - ⏱️  Wait: 1-5 minutes (upload progress bar)           │
│     - ✅ "Upload Successful" message                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: App Store Connect (10 minutes)                     │
│  ───────────────────────────────────                        │
│                                                             │
│  A. Go to appstoreconnect.apple.com                         │
│                                                             │
│  B. First Time Only: Create App                             │
│     My Apps → + → New App                                   │
│     - Platform: iOS                                         │
│     - Name: Chravel                                         │
│     - Bundle ID: com.chravel.app (MUST MATCH XCODE)         │
│     - SKU: chravel-ios-001                                  │
│                                                             │
│  C. Wait for Build Processing                               │
│     TestFlight tab → iOS Builds                             │
│     Status: Processing... (5-10 min)                        │
│                                                             │
│  D. Export Compliance                                       │
│     Click yellow warning → Answer questions:                │
│     - Uses encryption? No (unless custom crypto)            │
│     - If HTTPS: Select ECCN 5D002 exemption                 │
│                                                             │
│  E. Add Testers                                             │
│     Internal Testing → + → Add emails                       │
│     Testers get email with TestFlight link                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  🎉 SUCCESS! App in TestFlight                              │
│                                                             │
│  Testers can now:                                           │
│  1. Install TestFlight app from App Store                   │
│  2. Tap invitation link in email                            │
│  3. Install & test Chravel                                  │
└─────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 TIMELINE BREAKDOWN:

   Terminal Commands (Steps 1-3):     5 minutes
   Xcode Configuration (Step 4):      5 minutes  
   Upload to TestFlight (Step 5):    10 minutes
   App Store Connect (Step 6):       10 minutes
   ───────────────────────────────────────────
   Total Time:                       ~30 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 SUBSEQUENT BUILDS (After First Upload):

   Make code changes → Commit → Push
                      │
                      ▼
   $ git pull origin main
   $ npm run build
   $ npx cap sync ios
   $ npx cap open ios
                      │
                      ▼
   Xcode: Bump Build # → Archive → Upload
                      │
                      ▼
   App Store Connect: Wait for processing → Add to TestFlight
                      │
                      ▼
   ✅ New build available (15-30 min total)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐛 COMMON ISSUES & FIXES:

   ❌ "No dist/ folder"
      → Run: npm run build

   ❌ "Bundle ID already exists"
      → Change to unique ID in Xcode & App Store Connect

   ❌ "No provisioning profile"
      → Xcode → Preferences → Accounts → Download Profiles
      → Clean build folder, try again

   ❌ "Build never appears in TestFlight"
      → Check Bundle ID matches EXACTLY
      → Wait 10 minutes for processing

   ❌ "CocoaPods issues"
      → Run: sudo gem install cocoapods
      → Run: cd ios/App && pod install

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 REFERENCE DOCS (By Use Case):

   🚀 Quick start:        IOS_DEPLOY_QUICKSTART.md
   📖 Step-by-step:       TESTFLIGHT_DEPLOY.md
   🔍 Pre-flight check:   preflight-check.sh
   ⚙️  Automation:         deploy-ios.sh
   📊 Full context:       DEPLOYMENT_SUMMARY.md
   🏪 App Store release:  IOS_APP_STORE_GUIDE.md
   📱 Native features:    CAPACITOR_NATIVE_GUIDE.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 PRO TIPS:

   1. Keep TESTFLIGHT_DEPLOY.md open during first deploy
   2. Increment Build # for each upload (Version stays same)
   3. TestFlight supports 100 internal testers (free)
   4. Can iterate rapidly (new build every 30 min)
   5. Archive = build for App Store, NOT run on simulator

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
