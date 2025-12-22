# Production Build Checklist for iOS App Store

## Pre-Build Configuration ✅

### 1. Backend Services Verification
- [ ] All Supabase Edge Functions deployed and tested
  - [ ] `create-checkout` - Stripe payment initialization
  - [ ] `check-subscription` - Subscription status verification
  - [ ] `customer-portal` - Stripe billing management
  - [ ] `send-organization-invite` - Email invitation system

- [ ] Supabase Secrets configured
  - [ ] `STRIPE_SECRET_KEY` (use test key for testing, live key for production)
  - [ ] `RESEND_API_KEY` (email service)
  - [ ] `APP_URL` (production domain: https://chravel.app)

- [ ] Database tables exist with RLS enabled
  - [ ] `loyalty_airlines`, `loyalty_hotels`, `loyalty_rentals`
  - [ ] `game_schedules`, `show_schedules`
  - [ ] `saved_recommendations`, `trip_links`
  - [ ] `trips` table has `is_archived` column

### 2. Capacitor Configuration
- [ ] **CRITICAL:** Remove hot-reload server from `capacitor.config.ts`
  ```typescript
  // Comment out or delete:
  // server: {
  //   url: 'https://20feaa04-0946-4c68-a68d-0eb88cc1b9c4.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  ```

- [ ] Verify `appId`: `com.chravel.app`
- [ ] Verify `appName`: `chravel`
- [ ] Verify `webDir`: `dist`

### 3. Build Production Assets
```bash
# Build static web assets
npm run build

# Verify dist folder exists and contains:
# - index.html
# - assets/ folder
# - No references to lovableproject.com
```

### 4. Sync to iOS
```bash
# Sync web assets to iOS project
npx cap sync ios

# Verify sync completed successfully
# Check for any errors in terminal output
```

---

## Xcode Configuration ✅

### 5. Open in Xcode
```bash
npx cap open ios
```

### 6. General Settings
Navigate to: **TARGETS → App → General**

- [ ] **Display Name:** `Chravel`
- [ ] **Bundle Identifier:** `com.chravel.app`
- [ ] **Version:** `1.0.0` (increment for updates)
- [ ] **Build:** `1` (increment for each upload)
- [ ] **Minimum Deployment:** iOS 13.0 or higher

### 7. Signing & Capabilities
Navigate to: **TARGETS → App → Signing & Capabilities**

- [ ] **Automatically manage signing** enabled for both Debug and Release
- [ ] **Team:** Your Apple Developer account selected
- [ ] **Provisioning Profile:** Automatically generated (no errors)

### 8. Required Capabilities
Click **"+ Capability"** and add:

- [ ] **Push Notifications**
- [ ] **Background Modes**
  - [x] Remote notifications
  - [x] Background fetch
- [ ] **Associated Domains**
  - [ ] Domain added: `applinks:chravel.app`
- [ ] **App Groups** (optional)
  - [ ] Added: `group.com.chravel.app`

### 9. App Icons
Navigate to: **Assets.xcassets → AppIcon**

- [ ] 1024x1024 App Store icon added (REQUIRED)
- [ ] All other icon sizes filled
- [ ] No missing icon warnings

---

## Testing Before Archive ✅

### 10. Test on Simulator
- [ ] Run on iPhone 15 Pro Max simulator
- [ ] App launches without errors
- [ ] No blank white screen
- [ ] Navigate through all major features
- [ ] Check Console for errors (View → Debug Area → Show Debug Area)

### 11. Test on Real Device (Recommended)
- [ ] Connect iPhone via cable
- [ ] Select device in Xcode
- [ ] Run app (Cmd + R)
- [ ] Trust developer certificate on device (Settings → General → VPN & Device Management)
- [ ] Test all features:
  - [ ] Login/signup
  - [ ] Create trip
  - [ ] Chat functionality
  - [ ] Camera/photo upload
  - [ ] Location services
  - [ ] Push notifications (if configured)
  - [ ] Payment flow (Stripe checkout)
  - [ ] Organization invites

### 12. Offline Functionality Test
- [ ] Enable Airplane Mode
- [ ] App still launches
- [ ] Cached data visible
- [ ] Graceful error messages for network features

---

## App Store Connect Setup ✅

### 13. Create App Store Listing
Go to: https://appstoreconnect.apple.com/

- [ ] App created with Bundle ID: `com.chravel.app`
- [ ] Version 1.0 created
- [ ] App Information filled:
  - [ ] Name: `Chravel`
  - [ ] Subtitle: `Plan Trips. Coordinate Teams.`
  - [ ] Primary Category: Travel
  - [ ] Secondary Category: Social Networking (optional)

### 14. App Description
- [ ] Full description pasted (see IOS_APP_STORE_GUIDE.md for complete text)
- [ ] Keywords: `travel planner,group trips,itinerary,tour manager,sports team,expense split,travel chat,event plan`
- [ ] Support URL: `https://chravel.com/support`
- [ ] Marketing URL: `https://chravel.com`

### 15. Screenshots
- [ ] 3-10 screenshots for each device size:
  - [ ] 6.7" iPhone (1290 x 2796)
  - [ ] 6.5" iPhone (1284 x 2778)
  - [ ] 5.5" iPhone (1242 x 2208)
- [ ] Screenshots show all major features (see APP_STORE_SCREENSHOTS.md)

### 16. App Privacy
- [ ] Privacy policy completed
- [ ] Data collection types declared:
  - [ ] Location data (for maps)
  - [ ] Photos (for media uploads)
  - [ ] Name/Email (for accounts)
  - [ ] Payment info (for subscriptions)

### 17. Demo Account
- [ ] Test account created: `demo@chravel.com`
- [ ] Password: `DemoTrip2025!`
- [ ] Account has sample data:
  - [ ] 3 active trips
  - [ ] Chat messages
  - [ ] Expenses
  - [ ] Travel Wallet entries
  - [ ] Saved recommendations
- [ ] Credentials provided in "App Review Information"

---

## Build and Upload ✅

### 18. Archive in Xcode
- [ ] Select **"Any iOS Device (arm64)"** from device dropdown (NOT simulator)
- [ ] Menu: **Product → Archive**
- [ ] Wait for archive to complete (5-15 minutes)
- [ ] No build errors

### 19. Distribute to App Store
When Organizer window opens:
- [ ] Select archive
- [ ] Click **"Distribute App"**
- [ ] Choose **"App Store Connect"** → Next
- [ ] Choose **"Upload"** → Next
- [ ] Select **"Automatically manage signing"** → Next
- [ ] Review summary → **Upload**
- [ ] Wait for upload (5-30 minutes)

### 20. Wait for Processing
- [ ] Go to App Store Connect → Activity tab
- [ ] Build shows "Processing"
- [ ] Receive email: "Your app is ready to submit" (15-60 minutes)

---

## Final Submission ✅

### 21. Add Build to Version
- [ ] App Store Connect → Your app → Version 1.0
- [ ] Scroll to **"Build"** section
- [ ] Click **"+ Add Build"**
- [ ] Select uploaded build
- [ ] Click **"Done"**

### 22. Export Compliance
- [ ] Answer: "Is your app designed to use cryptography?" → **Yes**
- [ ] Answer: "Does your app qualify for any exemptions?" → **Yes**
- [ ] Select: "Your app uses... encryption for authentication only"
- [ ] Save

### 23. Final Review
- [ ] All sections show green checkmarks
- [ ] No warnings or errors
- [ ] Screenshots look correct
- [ ] Description is complete
- [ ] Demo account credentials provided

### 24. Submit for Review
- [ ] Click **"Submit for Review"** (blue button)
- [ ] Answer any additional questions
- [ ] Click **"Submit"**

🎉 **Congratulations! Your app is submitted!**

---

## Post-Submission ✅

### 25. Monitor Review Status
- [ ] Check email for status updates
- [ ] Respond promptly to any messages from App Review
- [ ] Typical review time: 1-7 days

### 26. If Approved
- [ ] App appears in App Store
- [ ] Share App Store link
- [ ] Monitor reviews and ratings
- [ ] Track analytics in App Store Connect

### 27. If Rejected
- [ ] Read rejection reason carefully
- [ ] Fix issues
- [ ] Respond in Resolution Center
- [ ] Resubmit (increment build number)

---

## Production Launch (After Approval) ✅

### 28. Backend Configuration
- [ ] Switch Stripe from test mode to live mode
- [ ] Update `STRIPE_SECRET_KEY` with live key
- [ ] Verify all edge functions work in production
- [ ] Test Resend emails with real addresses
- [ ] Enable Supabase production database backups

### 29. Monitoring Setup
- [ ] Enable App Store Connect crash analytics
- [ ] Set up uptime monitoring for edge functions
- [ ] Monitor Stripe webhook deliveries
- [ ] Track subscription conversion rates
- [ ] Set up error alerting (Sentry, LogRocket, etc.)

### 30. Marketing Preparation
- [ ] Support email configured: support@chravel.com
- [ ] Privacy policy published: https://chravel.app/privacy
- [ ] Terms of service published: https://chravel.app/terms
- [ ] Help documentation created
- [ ] Social media announcements prepared

---

## Troubleshooting Common Issues 🔧

### "App shows blank white screen on device"
**Solution:** 
- Verify you removed `server` block from `capacitor.config.ts`
- Run `npm run build` and `npx cap sync ios` again
- Check Xcode Console for errors

### "Signing failed with provisioning profile error"
**Solution:**
- Xcode → Settings → Accounts → Download Manual Profiles
- Verify Apple Developer enrollment is active
- Try unchecking/rechecking "Automatically manage signing"

### "Build rejected: Missing demo account"
**Solution:**
- Create demo account with sample data
- Provide credentials in "App Review Information"
- Test demo account works before resubmitting

### "Stripe checkout not working"
**Solution:**
- Verify `STRIPE_SECRET_KEY` is set in Supabase
- Test `create-checkout` edge function directly
- Check Stripe Dashboard for errors
- Ensure using correct API version

### "Organization invites not sending"
**Solution:**
- Verify `RESEND_API_KEY` is set
- Verify `APP_URL` is set to production domain
- Test `send-organization-invite` edge function
- Check Resend dashboard for delivery logs

---

## Quick Reference Commands

```bash
# Build production assets
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Run on device/emulator
npx cap run ios

# Clean build (if issues)
cd ios/App
xcodebuild clean
cd ../..
npx cap sync ios
```

---

**Estimated Total Time:** 3-5 hours (first submission)  
**Estimated Time for Updates:** 1-2 hours (subsequent submissions)  

**Last Updated:** 2025-01-XX  
**Version:** 1.0
