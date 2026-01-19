# Sprint 2: Privacy & Compliance - Manual Configuration Steps

## Status

✅ **Automated Tasks Completed**:
- Privacy permission descriptions verified in Info.plist (camera, photo library, location)
- Privacy manifest created (PrivacyInfo.xcprivacy)
- Privacy URLs configured in Deliverfile
- Associated Domains entitlement verified
- AASA file created for Universal Links
- App Store review notes prepared

⚠️ **Manual Configuration Required**:
- Replace TEAM_ID placeholder in AASA file
- Complete App Store Connect privacy questionnaire
- Verify privacy policy content at https://chravel.app/privacy
- Add privacy manifest to Xcode project
- Set up demo account with sample data
- Test Universal Links end-to-end

---

## 1. Update AASA File with Apple Team ID

### File Location
`/public/.well-known/apple-app-site-association`

### Required Action
Replace the `TEAM_ID` placeholder with your actual Apple Developer Team ID.

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": [
          "ABC1234567.com.chravel.app"  // Replace ABC1234567 with your Team ID
        ],
        // ... rest of configuration
      }
    ]
  },
  "webcredentials": {
    "apps": [
      "ABC1234567.com.chravel.app"  // Replace ABC1234567 with your Team ID
    ]
  }
}
```

### How to Find Your Team ID
1. Go to https://developer.apple.com/account
2. Click on "Membership" in the sidebar
3. Your Team ID is displayed (10 alphanumeric characters)
4. Example format: `ABC1234567`

### Verification
After updating:
1. Deploy the change to Vercel
2. Visit: `https://chravel.app/.well-known/apple-app-site-association`
3. Verify the response shows your Team ID
4. Use Apple's AASA Validator: https://search.developer.apple.com/appsearch-validation-tool/

---

## 2. Add Privacy Manifest to Xcode Project

### File Created
`/ios/App/App/PrivacyInfo.xcprivacy`

### Required Action
Add this file to your Xcode project:

1. **Open Xcode**
   - Navigate to `/ios/App/App.xcworkspace`
   - Open the project in Xcode

2. **Add PrivacyInfo.xcprivacy to Project**
   - Right-click on the `App` folder in Project Navigator
   - Select "Add Files to 'App'..."
   - Navigate to `/ios/App/App/PrivacyInfo.xcprivacy`
   - Ensure these options are selected:
     - ✅ Copy items if needed
     - ✅ Create groups
     - ✅ Add to targets: App
   - Click "Add"

3. **Verify File is Included**
   - Select the `App` target in Xcode
   - Go to "Build Phases" tab
   - Expand "Copy Bundle Resources"
   - Verify `PrivacyInfo.xcprivacy` is listed
   - If not, click "+" and add it

4. **Build and Verify**
   - Build the app (Cmd+B)
   - Archive for distribution
   - Check that the privacy manifest is included in the IPA

### What This File Does
- Declares all data collection types and purposes
- Lists Required Reason APIs used by the app
- Required by Apple for App Store submission (as of May 2024)
- Displays in App Store privacy "nutrition labels"

---

## 3. Complete App Store Connect Privacy Questionnaire

### Prerequisites
- Access to App Store Connect
- Understanding of all data collected by Chravel

### Steps

1. **Navigate to App Privacy Settings**
   - Log in to https://appstoreconnect.apple.com
   - Select your app (Chravel)
   - Go to "App Privacy" in the sidebar

2. **Answer Data Collection Questions**

   Based on the privacy manifest, answer the following:

   **Contact Info - Collected**
   - ✅ Email Address
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality, Product Personalization
   - ✅ Name
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality
   - ✅ Phone Number
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality

   **Location - Collected**
   - ✅ Precise Location
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality

   **Photos and Videos - Collected**
   - ✅ Photos or Videos
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality

   **User Content - Collected**
   - ✅ Other User Content (chat messages, trip data)
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality

   **Identifiers - Collected**
   - ✅ User ID
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality

   **Usage Data - Collected**
   - ✅ Product Interaction
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: Analytics, Product Personalization

   **Diagnostics - Collected**
   - ✅ Crash Data
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality
   - ✅ Performance Data
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality

   **Financial Info - Collected**
   - ✅ Purchase History
     - Linked to user: Yes
     - Used for tracking: No
     - Purposes: App Functionality

3. **Data Not Collected**
   - ❌ Health & Fitness
   - ❌ Contacts
   - ❌ Browsing History
   - ❌ Search History
   - ❌ Sensitive Info

4. **Tracking Question**
   - Does this app use data for tracking purposes?
   - **Answer: No**
   - Chravel does not track users across apps/websites owned by other companies

5. **Third-Party Data Question**
   - Does this app collect data from third parties?
   - **Answer: No**
   - All data is provided directly by users

6. **Save and Publish**
   - Review all answers
   - Click "Publish" to make privacy info public
   - Privacy labels will appear on App Store listing

---

## 4. Verify Privacy Policy Content

### Current URL
`https://chravel.app/privacy`

### Required Verification
Ensure the privacy policy covers:

**Required Sections:**
- [ ] What data is collected (see privacy manifest for full list)
- [ ] Why data is collected (match purposes in manifest)
- [ ] How data is used (app functionality, personalization, analytics)
- [ ] How data is stored (Supabase, encryption at rest)
- [ ] How data is shared (third-party services: Google Maps, RevenueCat, Stripe)
- [ ] User rights (access, deletion, export via GDPR tools)
- [ ] Data retention policies
- [ ] Contact information for privacy questions

**iOS-Specific Additions:**
- [ ] Camera usage (taking photos/videos for trips)
- [ ] Photo library access (uploading existing photos)
- [ ] Location services (optional trip coordination)
- [ ] Push notifications (trip updates, messages)
- [ ] In-app purchases (subscription management)

**Third-Party SDKs to Mention:**
- [ ] Google Maps Platform (location services, places search)
- [ ] RevenueCat (subscription management)
- [ ] Stripe (payment processing)
- [ ] Supabase (database and authentication)
- [ ] Sentry (optional - error tracking)

**Compliance Requirements:**
- [ ] GDPR compliance (for EU users)
- [ ] CCPA compliance (for California users)
- [ ] Children's privacy (state if app is not for under 13)
- [ ] Data deletion process explained

### How to Update
1. Update the privacy policy page at https://chravel.app/privacy
2. Add "Last Updated" date at the top
3. Deploy changes to Vercel
4. Verify the URL is accessible from iOS Safari
5. Test on mobile device for readability

---

## 5. Set Up Demo Account with Sample Data

### Current Demo Credentials
**Location**: `/ios-release/fastlane/Deliverfile` (lines 80-81)
- **Email**: `demo@chravel.app`
- **Password**: `DemoTrip2025!`

### Required Setup

1. **Create Demo User in Supabase**
   ```sql
   -- Run in Supabase SQL Editor
   -- This assumes you have a signup flow, or manually create:

   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
   VALUES (
     'demo@chravel.app',
     crypt('DemoTrip2025!', gen_salt('bf')),
     now(),
     '{"display_name": "Demo User", "onboarding_completed": true}'::jsonb
   );

   -- Create profile
   INSERT INTO profiles (user_id, display_name, email, avatar_url)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'demo@chravel.app'),
     'Demo User',
     'demo@chravel.app',
     'https://ui-avatars.com/api/?name=Demo+User&background=6366f1&color=fff'
   );
   ```

2. **Create Sample Trips**

   The demo account should have access to:

   **Trip 1: "Bali Destination Wedding"**
   - Trip type: Event
   - Status: Active (in progress)
   - Members: 8-10 people
   - Features to showcase:
     - Active group chat with 20+ messages
     - Expense splits (3-5 expenses totaling $500+)
     - Shared photo album (10+ photos)
     - Calendar events (rehearsal dinner, ceremony, reception)
     - Accommodation details
     - Location pins for venue

   **Trip 2: "Tokyo Adventure 2025"**
   - Trip type: Consumer
   - Status: Upcoming (planned)
   - Members: 4-6 people
   - Features to showcase:
     - Trip itinerary with daily plans
     - AI concierge suggestions
     - Task list (visa, flights, packing)
     - Places saved (restaurants, attractions)
     - Budget tracker

   **Trip 3: "Weekend Camping"**
   - Trip type: Consumer
   - Status: Completed (past)
   - Members: 4 people
   - Features to showcase:
     - Completed tasks
     - Settled expenses
     - Photo memories
     - Trip recap

3. **Populate Sample Data**

   Use the Supabase `seed-demo-data` edge function:
   ```bash
   curl -X POST 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/seed-demo-data' \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "USER_ID_OF_demo@chravel.app",
       "trips": ["bali-wedding", "tokyo-adventure", "weekend-camping"]
     }'
   ```

4. **Verify Demo Account**
   - Log in with demo credentials on web
   - Verify all 3 trips are visible
   - Test key features:
     - Send chat message
     - View media gallery
     - Check calendar events
     - Review expense splits
     - Use AI concierge (create new trip)
   - Ensure no sensitive data is visible
   - Test on iOS device before submission

### Demo Account Best Practices
- Use realistic but fictional data (no real personal info)
- Keep data evergreen (avoid time-sensitive references)
- Ensure account has no admin/special privileges
- Test account access monthly to prevent expiry
- Document any special features to highlight in review notes

---

## 6. Test Universal Links End-to-End

### Prerequisites
- AASA file deployed with correct Team ID
- App installed on test device (TestFlight or development)
- Device running iOS 14 or later

### Test Scenarios

#### Test 1: Trip Invite Link
1. Send yourself an invite link via email or Messages:
   ```
   https://chravel.app/join/ABC123
   ```
2. Tap the link in Safari
3. **Expected**: App should open automatically (not browser)
4. **Expected**: User should see invite preview
5. **Expected**: After accepting, user joins trip

#### Test 2: Direct Trip Link
1. Open this URL in Safari:
   ```
   https://chravel.app/trip/TRIP_ID
   ```
2. **Expected**: App opens to trip detail page
3. **Expected**: Trip data loads correctly

#### Test 3: OAuth Callback
1. Log out of the app
2. Tap "Sign in with Apple"
3. Complete authentication on Apple's page
4. **Expected**: Redirect to `https://chravel.app/auth`
5. **Expected**: App opens and user is logged in

#### Test 4: Settings Deep Link
1. Open this URL:
   ```
   https://chravel.app/settings/profile
   ```
2. **Expected**: App opens to profile settings

### Troubleshooting

**App doesn't open (goes to browser instead):**
- Verify AASA file at `https://chravel.app/.well-known/apple-app-site-association`
- Check Team ID is correct (not placeholder)
- Ensure `Content-Type: application/json` header is set
- Try deleting and reinstalling the app
- Wait 10-15 minutes for iOS to cache AASA file

**Links work on simulator but not device:**
- Ensure provisioning profile includes Associated Domains entitlement
- Check device is on iOS 14+ (Universal Links requirement)
- Verify bundle ID matches exactly

**Links stopped working after update:**
- iOS caches AASA files; wait or restart device
- Check for typos in appIDs array in AASA
- Ensure HTTPS is used (not HTTP)

### Validation Tools
- Apple's AASA Validator: https://search.developer.apple.com/appsearch-validation-tool/
- Branch.io AASA Validator: https://branch.io/resources/aasa-validator/
- Command line check:
  ```bash
  curl -v https://chravel.app/.well-known/apple-app-site-association
  ```

---

## 7. Final Pre-Submission Checklist

Before proceeding to Sprint 3, verify:

- [ ] AASA file has correct Team ID (not placeholder)
- [ ] AASA file deployed and accessible at https://chravel.app/.well-known/apple-app-site-association
- [ ] AASA file serves with `Content-Type: application/json` header
- [ ] Privacy manifest added to Xcode project and included in build
- [ ] App Store Connect privacy questionnaire completed and published
- [ ] Privacy policy at https://chravel.app/privacy reviewed and current
- [ ] Privacy policy covers all iOS-specific data collection
- [ ] Support URL https://chravel.app/support is live and functional
- [ ] Demo account created with credentials: `demo@chravel.app` / `DemoTrip2025!`
- [ ] Demo account has 3 sample trips with realistic data
- [ ] Demo account tested on iOS device (all features work)
- [ ] Universal Links tested end-to-end (5+ scenarios)
- [ ] Permission descriptions tested (camera, photo library, location)
- [ ] Sign in with Apple tested successfully
- [ ] No test data or placeholders visible in demo account

---

## 8. Known Manual Configurations Not Yet Automated

The following configurations require manual setup in external dashboards:

### App Store Connect
- [ ] Age rating selection (likely 4+, confirm with content)
- [ ] App category: Travel (primary), Productivity (secondary)
- [ ] Keywords optimization (100 character limit)
- [ ] Promotional text (170 character limit)
- [ ] App preview video upload (optional but recommended)
- [ ] Screenshot uploads (3 device sizes: 6.7", 6.5", 5.5")
- [ ] App Store icon upload (1024x1024 PNG)

### Apple Developer Portal
- [ ] APNs auth key creation (.p8 file)
- [ ] Distribution certificate generation
- [ ] Provisioning profile creation
- [ ] Team ID confirmation

### Supabase Dashboard
- [ ] APNs secrets configuration for production
- [ ] Demo data seeding edge function invocation
- [ ] RLS policy review for demo account access

### External Services
- [ ] Privacy policy deployment to https://chravel.app/privacy
- [ ] Support page deployment to https://chravel.app/support
- [ ] RevenueCat product configuration (covered in Sprint 3)

---

## Next Steps

Once all manual configurations are complete:
1. Test the app end-to-end on a physical device
2. Verify all privacy settings display correctly in App Store Connect
3. Proceed to **Sprint 3: Monetization (RevenueCat / IAP)**

---

## Support Resources

- **Apple Privacy Manifest Guide**: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
- **Universal Links Guide**: https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- **App Store Privacy Guidelines**: https://developer.apple.com/app-store/app-privacy-details/
- **GDPR Compliance**: https://gdpr.eu/
- **CCPA Compliance**: https://oag.ca.gov/privacy/ccpa

## Questions or Issues?

If you encounter issues:
1. Check Apple Developer Forums for similar issues
2. Review App Store Connect rejection reasons (if applicable)
3. Test privacy settings in TestFlight before full submission
4. Consult docs/APP_STORE_PLAN.md for full context
