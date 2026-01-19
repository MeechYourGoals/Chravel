# iOS App Store Release - Manual Configuration Steps

This document outlines the manual steps required to complete Sprint 1 (Build & Signing) that require access to external dashboards and credentials.

## Status

- ✅ **Completed**: APNs environment updated to production
- ✅ **Completed**: Bundle ID and app name verified (com.chravel.app / Chravel)
- ✅ **Completed**: Marketing version and build number confirmed (1.0 / 1)
- ⚠️ **Requires Manual Setup**: RevenueCat production API key
- ⚠️ **Requires Manual Setup**: Apple code signing certificates
- ⚠️ **Requires Manual Setup**: GitHub Secrets configuration

---

## 1. RevenueCat Production API Key Setup

### Prerequisites
- RevenueCat account with Chravel iOS app configured
- Access to RevenueCat dashboard

### Steps

1. **Get Production API Key from RevenueCat Dashboard**
   - Log in to https://app.revenuecat.com
   - Navigate to: Project Settings → API Keys
   - Copy the **iOS Production API Key** (should start with `appl_`)
   - ⚠️ Do NOT use the test key (starts with `test_`)

2. **Update AppDelegate.swift**
   - File: `/ios/App/App/AppDelegate.swift`
   - Line 13: Replace the hardcoded test key

   ```swift
   // BEFORE:
   private let revenueCatAPIKey = "test_QqVXiOnWgmxTHaMKTUiCrOpYMDm"

   // AFTER:
   private let revenueCatAPIKey = "appl_YOUR_PRODUCTION_KEY_HERE"
   ```

3. **Update Environment Variables**
   - Add to `.env.production`:

   ```bash
   VITE_REVENUECAT_IOS_API_KEY=appl_YOUR_PRODUCTION_KEY_HERE
   ```

4. **Update GitHub Secrets** (for CI/CD)
   - Navigate to: GitHub Repository → Settings → Secrets and variables → Actions
   - Add new secret:
     - Name: `REVENUECAT_API_KEY_IOS`
     - Value: `appl_YOUR_PRODUCTION_KEY_HERE`

5. **Also Update Log Level for Production**
   - File: `/ios/App/App/AppDelegate.swift`
   - Line 31: Change log level to `.warn` or `.error`

   ```swift
   // BEFORE:
   Purchases.logLevel = .debug

   // AFTER:
   Purchases.logLevel = .warn
   ```

### Verification
- Build the app in Xcode (Release configuration)
- Check console logs for "RevenueCat SDK configured successfully"
- Verify no errors about invalid API key
- Test subscription flow in sandbox environment

---

## 2. Apple Code Signing Configuration

### Prerequisites
- Apple Developer account with Admin access
- Team ID from Apple Developer Portal
- Fastlane Match configured (or manual certificate management)

### Option A: Using Fastlane Match (Recommended)

1. **Create Private Git Repository for Certificates**
   - Create a new private repository (e.g., `chravel-ios-certificates`)
   - Do NOT make this public - contains sensitive certificates

2. **Initialize Match**
   ```bash
   cd ios-release/fastlane
   fastlane match init
   ```
   - Choose `git` as storage mode
   - Enter repository URL: `git@github.com:YourOrg/chravel-ios-certificates.git`

3. **Generate Certificates**
   ```bash
   fastlane match appstore
   ```
   - Enter Apple ID when prompted
   - Enter encryption password (save this securely!)
   - Match will generate:
     - Distribution certificate
     - App Store provisioning profile

4. **Add to GitHub Secrets**
   - `MATCH_GIT_URL`: Your certificates repository URL
   - `MATCH_PASSWORD`: Encryption password from step 3

### Option B: Manual Certificate Management

1. **Create Distribution Certificate**
   - Go to: https://developer.apple.com/account/resources/certificates
   - Click "+" → iOS Distribution (App Store)
   - Generate CSR on your Mac:
     ```bash
     openssl req -nodes -newkey rsa:2048 -keyout ios_distribution.key -out CertificateSigningRequest.certSigningRequest
     ```
   - Upload CSR
   - Download certificate as `ios_distribution.cer`
   - Export as `.p12`:
     ```bash
     # Import to Keychain, then export as .p12 with password
     security import ios_distribution.cer -k ~/Library/Keychains/login.keychain
     ```

2. **Create App Store Provisioning Profile**
   - Go to: https://developer.apple.com/account/resources/profiles
   - Click "+" → App Store
   - Select App ID: `com.chravel.app`
   - Select the distribution certificate from step 1
   - Download profile as `Chravel_App_Store.mobileprovision`

3. **Convert to Base64 for GitHub Secrets**
   ```bash
   # Certificate
   base64 -i ios_distribution.p12 -o certificate.txt

   # Provisioning Profile
   base64 -i Chravel_App_Store.mobileprovision -o profile.txt
   ```

4. **Add to GitHub Secrets**
   - `APPLE_CERTIFICATE_BASE64`: Content of `certificate.txt`
   - `APPLE_CERTIFICATE_PASSWORD`: Password used when exporting .p12
   - `PROVISIONING_PROFILE_BASE64`: Content of `profile.txt`

### Required GitHub Secrets Summary

Add all of these to: GitHub Repository → Settings → Secrets and variables → Actions

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `APPLE_TEAM_ID` | 10-character Team ID | https://developer.apple.com/account → Membership |
| `ITC_TEAM_ID` | App Store Connect Team ID | https://appstoreconnect.apple.com → Users and Access |
| `APPLE_ID` | Apple ID email | Your Apple Developer account email |
| `APPLE_CERTIFICATE_BASE64` | Base64 encoded .p12 certificate | See Option B, Step 3 |
| `APPLE_CERTIFICATE_PASSWORD` | Password for .p12 file | Password set during export |
| `PROVISIONING_PROFILE_BASE64` | Base64 encoded provisioning profile | See Option B, Step 3 |
| `KEYCHAIN_PASSWORD` | CI keychain password | Any secure password (e.g., generate random) |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect API Key ID | Create at https://appstoreconnect.apple.com/access/api |
| `APP_STORE_CONNECT_API_ISSUER_ID` | API Issuer ID | From App Store Connect API page |
| `APP_STORE_CONNECT_API_KEY` | API Key content (.p8 file) | Download from App Store Connect, copy content |

### Optional GitHub Secrets (for enhanced features)

| Secret Name | Description | Required? |
|-------------|-------------|-----------|
| `SENTRY_AUTH_TOKEN` | Sentry crash reporting | Optional |
| `SENTRY_ORG` | Sentry organization slug | Optional |
| `SENTRY_PROJECT` | Sentry project name | Optional |
| `SLACK_URL` | Slack webhook for build notifications | Optional |
| `CODECOV_TOKEN` | Code coverage reporting | Optional |

---

## 3. APNs Configuration

### Prerequisites
- Apple Developer account
- App Store Connect access

### Steps

1. **Create APNs Authentication Key**
   - Go to: https://developer.apple.com/account/resources/authkeys
   - Click "+" → Apple Push Notifications service (APNs)
   - Download the `.p8` file (SAVE THIS - can only download once)
   - Note the Key ID (10 characters)

2. **Extract Private Key from .p8 File**
   ```bash
   cat AuthKey_XXXXXXXXXX.p8
   ```
   - Copy the entire content including headers

3. **Add to Supabase Edge Function Secrets**
   - Go to: Supabase Dashboard → Edge Functions → Manage Secrets
   - Add the following secrets:
     - `APNS_KEY_ID`: 10-character Key ID from step 1
     - `APNS_TEAM_ID`: Your Apple Team ID (from Developer Portal)
     - `APNS_PRIVATE_KEY`: Content of .p8 file from step 2
     - `APNS_BUNDLE_ID`: `com.chravel.app`
     - `APNS_ENVIRONMENT`: `production`

4. **Verify Configuration**
   - The entitlements file has already been updated to production
   - File: `/ios/App/App/App.entitlements` line 11
   - Should show: `<string>production</string>`

### Testing Push Notifications

1. Build app with production APNs configuration
2. Install on device
3. Grant notification permissions
4. Send test notification via Supabase function:
   ```bash
   curl -X POST 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/send-push' \
     -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "YOUR_TEST_USER_ID",
       "title": "Test Notification",
       "body": "Testing production APNs",
       "data": {"type": "test"}
     }'
   ```
5. Verify notification appears on device

---

## 4. Validate GitHub Actions Pipeline

### Prerequisites
- All GitHub Secrets configured (see section 2)
- Push access to repository

### Steps

1. **Test Build Pipeline**
   ```bash
   # Push a tag to trigger release workflow
   git tag -a v1.0.0-beta.1 -m "Test build"
   git push origin v1.0.0-beta.1
   ```

2. **Monitor Workflow**
   - Go to: GitHub Repository → Actions
   - Watch the `ios-release` workflow run
   - Verify all steps complete successfully:
     - ✅ Checkout code
     - ✅ Setup Xcode 15.4
     - ✅ Install dependencies (Node, Ruby, Fastlane)
     - ✅ Setup keychain
     - ✅ Install certificates
     - ✅ Build iOS app
     - ✅ Upload IPA artifact

3. **Download and Verify IPA**
   - Click on workflow run → Artifacts
   - Download `ios-app` artifact
   - Unzip and verify IPA file is present
   - Check file size (should be under 50MB)

4. **Test TestFlight Upload** (if secrets configured)
   - The workflow should automatically upload to TestFlight
   - Check App Store Connect → TestFlight
   - Verify build appears (processing may take 10-15 minutes)

### Troubleshooting Common Issues

**Build fails with "Code signing error"**
- Verify `APPLE_CERTIFICATE_BASE64` is correctly encoded
- Check certificate password is correct
- Ensure provisioning profile matches bundle ID

**"No provisioning profile found"**
- Verify `PROVISIONING_PROFILE_BASE64` is set
- Check bundle ID in profile matches `com.chravel.app`
- Ensure profile is App Store type (not Development/Ad Hoc)

**"Invalid API key" error**
- Verify all three App Store Connect API secrets are set:
  - `APP_STORE_CONNECT_API_KEY_ID`
  - `APP_STORE_CONNECT_API_ISSUER_ID`
  - `APP_STORE_CONNECT_API_KEY`

**Fastlane Match fails**
- Verify `MATCH_GIT_URL` points to accessible repository
- Check `MATCH_PASSWORD` is correct
- Ensure GitHub deploy key has access to certificates repository

---

## 5. Final Verification Checklist

Before proceeding to Sprint 2 (Privacy & Compliance), verify:

- [ ] RevenueCat production API key configured and tested
- [ ] AppDelegate.swift log level set to `.warn` or `.error`
- [ ] Distribution certificate and provisioning profile created
- [ ] All required GitHub Secrets added (minimum 11 secrets)
- [ ] GitHub Actions workflow runs successfully
- [ ] IPA artifact generated and downloadable
- [ ] TestFlight upload successful (build appears in App Store Connect)
- [ ] APNs production environment configured
- [ ] APNs secrets added to Supabase Edge Functions
- [ ] Test push notification delivered successfully
- [ ] Bundle ID verified as `com.chravel.app` everywhere
- [ ] App name verified as `Chravel` everywhere
- [ ] Marketing version set to `1.0`
- [ ] Build number set to `1`

---

## Next Steps

Once all items in the checklist are complete, proceed to:

**Sprint 2: Privacy & Compliance** (see docs/APP_STORE_PLAN.md)
- Privacy manifest creation
- App Store privacy questionnaire
- Privacy policy review
- Permission descriptions audit
- Universal Links testing
- Demo account preparation

---

## Support Resources

- **Apple Developer Portal**: https://developer.apple.com/account
- **App Store Connect**: https://appstoreconnect.apple.com
- **RevenueCat Dashboard**: https://app.revenuecat.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Fastlane Documentation**: https://docs.fastlane.tools
- **GitHub Actions Logs**: Repository → Actions tab

## Questions or Issues?

If you encounter issues not covered in this guide:
1. Check GitHub Actions workflow logs for detailed error messages
2. Review Fastlane logs in the workflow artifacts
3. Consult the iOS release checklist: `/ios-release/docs/RELEASE_CHECKLIST.md`
4. Check Apple Developer Forums for code signing issues
