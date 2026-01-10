# App Tracking Transparency (ATT) Analysis

**Document Created:** January 2026
**Conclusion:** ATT is **NOT required** for Chravel

---

## Executive Summary

After a comprehensive audit of the iOS project, dependencies, and tracking implementations, **Chravel does NOT require an App Tracking Transparency (ATT) prompt**. The app does not "track" users as defined by Apple's guidelines.

---

## What is ATT?

App Tracking Transparency (ATT) is an iOS 14.5+ framework that requires apps to request user permission before:
- Accessing the device's advertising identifier (IDFA)
- Tracking users across apps and websites owned by other companies
- Sharing user data with data brokers

**Key Apple Definition of "Tracking":**
> "Tracking" refers to linking user or device data collected from your app with user or device data collected from other companies' apps, websites, or offline properties for targeted advertising or advertising measurement purposes.

---

## Files Scanned

| File/Location | Finding |
|---------------|---------|
| `ios/App/CapApp-SPM/Package.swift` | Only Capacitor dependencies, no ad SDKs |
| `package.json` | No ad SDK packages (Facebook, AppsFlyer, Adjust, Branch, Google Ads) |
| `ios/App/App/AppDelegate.swift` | RevenueCat with AdServices attribution only |
| `ios/App/App/Info.plist` | No `NSUserTrackingUsageDescription` key present |
| `ios/App/App.xcodeproj/project.pbxproj` | No linked ad frameworks (AdSupport, iAd) |
| `src/telemetry/providers/posthog.ts` | Standard analytics, no IDFA access |
| `src/telemetry/providers/sentry.ts` | Standard crash reporting, no IDFA access |
| `appstore/legal/PRIVACY_MAPPING.md` | Explicitly states "IDFA: Not Collected" |

### Code Search Results

| Search Pattern | Result |
|----------------|--------|
| `ASIdentifierManager\|IDFA\|advertisingIdentifier\|AdSupport` | Found in docs only, not in code |
| `Facebook\|AppsFlyer\|Adjust\|Branch\|GoogleAds\|AdMob` | Found in docs only, not in code |
| `ATTracking\|AppTrackingTransparency\|requestTrackingAuthorization` | No files found |

---

## Analysis of Tracking-Related Code

### RevenueCat Attribution

**Location:** `ios/App/App/AppDelegate.swift:37`

```swift
Purchases.shared.attribution.enableAdServicesAttributionTokenCollection()
```

**This does NOT require ATT because:**
- AdServices (`AAAttributionToken`) is Apple's privacy-preserving attribution framework
- Introduced in iOS 14.3 as a replacement for IDFA-based attribution
- Apple explicitly exempts AdServices from ATT requirements
- The token is cryptographically signed by Apple and doesn't identify users across apps

**Reference:** [Apple AdServices Documentation](https://developer.apple.com/documentation/adservices)

### PostHog Analytics

**Location:** `src/telemetry/providers/posthog.ts`

PostHog is used for first-party product analytics:
- Tracks user behavior within Chravel only
- Uses Supabase UUID as user identifier (not IDFA)
- Does not share data with ad networks
- Does not enable cross-app tracking

**ATT Requirement:** No

### Sentry Crash Reporting

**Location:** `src/telemetry/providers/sentry.ts`

Sentry is used for error tracking:
- Captures crash reports and performance data
- Links errors to user sessions for debugging
- Does not access IDFA
- Does not share data for advertising purposes

**ATT Requirement:** No

---

## Why ATT is NOT Required

Chravel meets Apple's exemption criteria because:

1. **No IDFA Access**
   - No `ASIdentifierManager` usage in code
   - No `AdSupport` framework linked
   - Privacy label declares "IDFA: Not Collected"

2. **No Third-Party Ad SDKs**
   - No Facebook SDK / Meta Business SDK
   - No AppsFlyer, Adjust, Branch, or Kochava
   - No Google Ads / AdMob
   - No ad network integrations

3. **First-Party Analytics Only**
   - PostHog and Sentry collect data for Chravel's own use
   - No data shared with third parties for advertising
   - User identifiers are internal Supabase UUIDs

4. **Privacy-Preserving Attribution**
   - RevenueCat uses AdServices, not IDFA
   - AdServices is Apple's recommended alternative
   - Explicitly designed to NOT require ATT

5. **No Cross-App Tracking**
   - No data linking with other companies' apps/websites
   - No advertising measurement across properties
   - No data broker relationships

---

## What Would Trigger Needing ATT

ATT would be required if any of the following were added:

| Trigger | Example | Impact |
|---------|---------|--------|
| **Ad SDK Integration** | Facebook Ads SDK, Google Ads SDK | IDFA used for ad attribution |
| **Advertising Partner SDK** | AppsFlyer, Adjust, Branch | Cross-app tracking for attribution |
| **Direct IDFA Access** | `ASIdentifierManager.shared().advertisingIdentifier` | Explicit IDFA read |
| **Data Broker Integration** | LiveRamp, Experian | User data shared for targeting |
| **Cross-Site Tracking** | Third-party analytics with user graph | Links users across properties |

### If ATT Becomes Required

1. **Add Info.plist key:**
   ```xml
   <key>NSUserTrackingUsageDescription</key>
   <string>Chravel uses this identifier to measure the effectiveness of our advertising and improve your experience.</string>
   ```

2. **Request permission (iOS 14+):**
   ```swift
   import AppTrackingTransparency

   if #available(iOS 14, *) {
       ATTrackingManager.requestTrackingAuthorization { status in
           // Handle status: authorized, denied, notDetermined, restricted
       }
   }
   ```

3. **Best practices:**
   - Request after user sees value (post-onboarding)
   - Not immediately on cold start
   - Respect user choice (don't re-prompt)
   - Log status for analytics (non-identifying)

---

## Current Privacy Label Accuracy

The existing App Store privacy label in `appstore/legal/PRIVACY_MAPPING.md` is accurate:

| Category | Declaration | Verified |
|----------|-------------|----------|
| Data Used to Track You | None | Correct |
| IDFA Collection | Not Collected | Correct |
| Cross-App Tracking | None | Correct |

---

## Recommendations

1. **Do NOT add ATT prompt** - It would create unnecessary friction
2. **Do NOT add `NSUserTrackingUsageDescription`** - Not required
3. **Keep RevenueCat AdServices attribution** - Privacy-preserving, no ATT needed
4. **Monitor SDK changes** - If adding ad SDKs, re-evaluate
5. **Maintain privacy documentation** - Update if data practices change

---

## References

- [Apple ATT Documentation](https://developer.apple.com/documentation/apptrackingtransparency)
- [Apple User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- [AdServices Framework](https://developer.apple.com/documentation/adservices)
- [RevenueCat Attribution](https://www.revenuecat.com/docs/attribution)
- [PostHog Privacy](https://posthog.com/docs/privacy)
- [Sentry Privacy](https://docs.sentry.io/product/sentry-basics/user-privacy/)

---

## Document Maintenance

**Review Triggers:**
- Adding any advertising or attribution SDK
- Changing data sharing practices with third parties
- App Store review feedback about tracking
- iOS privacy policy updates from Apple

**Owner:** Engineering Team
**Last Updated:** January 2026
