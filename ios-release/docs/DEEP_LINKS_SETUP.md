# Deep Links & Universal Links Setup Guide

**App Name:** Chravel
**Bundle ID:** com.chravel.app
**Domain:** chravel.app
**Last Updated:** December 2025

---

## Overview

Chravel supports two types of deep linking:

1. **Universal Links (iOS):** `https://chravel.app/...` links that open the app directly
2. **Custom URL Scheme:** `chravel://...` links for fallback and internal navigation

Universal Links are preferred because they:
- Work seamlessly (no confirmation dialog)
- Fall back to web if app not installed
- Are more secure (you must prove domain ownership)

---

## Architecture

```
User clicks link
        │
        ▼
┌───────────────────┐
│  chravel.app URL  │
└───────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│                iOS Checks:                     │
│  1. Is app installed?                         │
│  2. Does AASA file validate domain?           │
│  3. Does app support this path?               │
└───────────────────────────────────────────────┘
        │                       │
        ▼                       ▼
   App installed           App not installed
        │                       │
        ▼                       ▼
┌───────────────┐     ┌───────────────┐
│ Open app with │     │ Open in       │
│ deep link     │     │ Safari        │
└───────────────┘     └───────────────┘
```

---

## Universal Links Setup

### Step 1: Create AASA File

Create the Apple App Site Association (AASA) file at:
`https://chravel.app/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": ["TEAM_ID.com.chravel.app"],
        "components": [
          {
            "/": "/trip/*",
            "comment": "Trip detail pages"
          },
          {
            "/": "/tour/pro/*",
            "comment": "Pro trip pages"
          },
          {
            "/": "/event/*",
            "comment": "Event pages"
          },
          {
            "/": "/join/*",
            "comment": "Trip invite links"
          },
          {
            "/": "/invite/*",
            "comment": "Organization invites"
          },
          {
            "/": "/organization/*",
            "comment": "Organization pages"
          },
          {
            "/": "/profile/*",
            "comment": "User profiles"
          },
          {
            "/": "/share/*",
            "comment": "Shared content"
          }
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAM_ID.com.chravel.app"]
  }
}
```

**Important:** Replace `TEAM_ID` with your actual Apple Team ID.

### Step 2: Host AASA File

The AASA file must be:
- Served at `/.well-known/apple-app-site-association`
- Content-Type: `application/json`
- No file extension
- HTTPS only (no redirects from HTTP)
- Accessible without authentication

**For Vercel deployment**, add to `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/.well-known/apple-app-site-association",
      "destination": "/api/aasa"
    }
  ]
}
```

Then create `api/aasa.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: ["TEAM_ID.com.chravel.app"],
          components: [
            { "/": "/trip/*" },
            { "/": "/tour/pro/*" },
            { "/": "/event/*" },
            { "/": "/join/*" },
            { "/": "/invite/*" },
            { "/": "/organization/*" },
            { "/": "/profile/*" },
            { "/": "/share/*" }
          ]
        }
      ]
    },
    webcredentials: {
      apps: ["TEAM_ID.com.chravel.app"]
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(aasa);
}
```

### Step 3: Configure Xcode

1. Open Xcode project
2. Select target → **Signing & Capabilities**
3. Click **+ Capability** → **Associated Domains**
4. Add domains:
   - `applinks:chravel.app`
   - `webcredentials:chravel.app`

This creates an entitlement in your app:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:chravel.app</string>
    <string>webcredentials:chravel.app</string>
</array>
```

---

## Custom URL Scheme Setup

### Step 1: Configure Info.plist

Add URL scheme configuration:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.chravel.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>chravel</string>
        </array>
    </dict>
</array>
```

This enables links like:
- `chravel://trip/abc123`
- `chravel://join/invite-code`

---

## Deep Link Routes

| URL Pattern | Description | Action |
|------------|-------------|--------|
| `/trip/:tripId` | Consumer trip | Open trip detail |
| `/trip/:tripId/chat` | Trip chat tab | Open chat |
| `/trip/:tripId/media` | Trip media tab | Open media |
| `/trip/:tripId/pay` | Trip payments tab | Open payments |
| `/trip/:tripId/calendar` | Trip calendar tab | Open calendar |
| `/trip/:tripId/ai` | AI concierge tab | Open AI |
| `/tour/pro/:tripId` | Pro trip | Open pro trip detail |
| `/event/:eventId` | Event | Open event detail |
| `/join/:inviteCode` | Accept invite | Show invite acceptance |
| `/invite/:token` | Org invite | Accept org invitation |
| `/organization/:orgId` | Organization | Open org dashboard |
| `/profile/:userId` | User profile | View user profile |
| `/share/:shareId` | Shared content | Open shared item |
| `/settings` | Settings | Open settings |
| `/archive` | Archive | View archived trips |

---

## iOS Implementation

### For Capacitor Apps

Update `AppDelegate.swift`:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {

        // Handle Universal Links
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let incomingURL = userActivity.webpageURL else {
            return false
        }

        return handleDeepLink(url: incomingURL)
    }

    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Handle custom URL scheme
        return handleDeepLink(url: url)
    }

    private func handleDeepLink(url: URL) -> Bool {
        // Parse the URL and determine the route
        let path = url.path
        let queryItems = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems

        // Extract route parameters
        var route = path
        var params: [String: String] = [:]

        queryItems?.forEach { item in
            params[item.name] = item.value
        }

        // Handle specific routes
        if path.starts(with: "/trip/") {
            let tripId = String(path.dropFirst("/trip/".count).split(separator: "/").first ?? "")
            params["tripId"] = tripId

            // Determine sub-route
            if path.contains("/chat") {
                route = "/trip/chat"
            } else if path.contains("/media") {
                route = "/trip/media"
            }
            // ... handle other sub-routes
        } else if path.starts(with: "/join/") {
            let inviteCode = String(path.dropFirst("/join/".count))
            params["inviteCode"] = inviteCode
            route = "/join"
        }

        // Post notification to navigate
        NotificationCenter.default.post(
            name: Notification.Name("DeepLink"),
            object: nil,
            userInfo: ["route": route, "params": params]
        )

        return true
    }
}
```

### For Capacitor Plugin (Web Side)

Create a listener in your React app:

```typescript
// src/hooks/useDeepLinks.ts
import { useEffect } from 'react';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleDeepLink = (event: URLOpenListenerEvent) => {
      const url = new URL(event.url);
      const path = url.pathname;

      // Handle routes
      if (path.startsWith('/trip/')) {
        navigate(path);
      } else if (path.startsWith('/join/')) {
        navigate(path);
      } else if (path.startsWith('/tour/pro/')) {
        navigate(path);
      } else if (path.startsWith('/event/')) {
        navigate(path);
      }
      // ... handle other routes
    };

    App.addListener('appUrlOpen', handleDeepLink);

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
}
```

Use in your App component:

```tsx
// src/App.tsx
import { useDeepLinks } from './hooks/useDeepLinks';

function App() {
  useDeepLinks();

  return (
    // ... your app
  );
}
```

---

## Invite Link Flow

### Creating Invite Links

```typescript
// src/services/inviteService.ts
export async function createTripInviteLink(tripId: string): Promise<string> {
  const { data, error } = await supabase
    .from('trip_invite_links')
    .insert({
      trip_id: tripId,
      created_by: userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })
    .select('invite_code')
    .single();

  if (error) throw error;

  return `https://chravel.app/join/${data.invite_code}`;
}
```

### Handling Invite Links

```typescript
// src/pages/JoinTrip.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function JoinTrip() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<TripInvite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvite() {
      const { data, error } = await supabase
        .from('trip_invite_links')
        .select('*, trips(*)')
        .eq('invite_code', inviteCode)
        .single();

      if (error || !data) {
        // Invalid or expired invite
        setInvite(null);
      } else {
        setInvite(data);
      }
      setLoading(false);
    }

    fetchInvite();
  }, [inviteCode]);

  const handleAccept = async () => {
    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?returnUrl=/join/${inviteCode}`);
      return;
    }

    // Accept the invite
    const { error } = await supabase
      .from('trip_members')
      .insert({
        trip_id: invite.trip_id,
        user_id: user.id,
        role: 'member',
      });

    if (!error) {
      navigate(`/trip/${invite.trip_id}`);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!invite) return <InvalidInvite />;

  return (
    <div>
      <h1>You're invited to {invite.trips.name}</h1>
      <p>{invite.trips.description}</p>
      <button onClick={handleAccept}>Accept Invite</button>
    </div>
  );
}
```

---

## Testing Universal Links

### Development Testing

1. **Build and run on device** (not simulator)
2. Open Safari or Notes app
3. Paste a test link: `https://chravel.app/trip/test123`
4. Tap the link - should open app

### Validation Tools

1. **Apple AASA Validator:**
   ```bash
   curl -I https://chravel.app/.well-known/apple-app-site-association
   ```

2. **SwiftUI Branch Validator:**
   ```bash
   xcrun swcutil dl -d chravel.app
   ```

3. **Apple CDN Check:**
   ```bash
   curl https://app-site-association.cdn-apple.com/a/v1/chravel.app
   ```

### Testing Checklist

- [ ] AASA file is accessible at correct URL
- [ ] AASA file has correct content-type
- [ ] App ID in AASA matches entitlement
- [ ] Associated Domains capability is enabled
- [ ] Domain matches (no www vs non-www issues)
- [ ] HTTPS certificate is valid
- [ ] No redirects in AASA path
- [ ] Link opens app from Safari
- [ ] Link opens app from Notes
- [ ] Link opens app from Messages
- [ ] Fallback to web works when app not installed

---

## Troubleshooting

### "Link opens in Safari instead of app"

1. Check AASA file is accessible
2. Verify Team ID and Bundle ID are correct
3. Delete and reinstall app (cached association)
4. Check domain in Associated Domains entitlement

### "Universal Links not working after update"

iOS caches AASA files. To force refresh:
1. Delete the app
2. Restart the device
3. Reinstall the app

### "AASA file not being fetched"

Check:
- HTTPS is working (no certificate errors)
- No authentication required
- Content-Type is application/json
- File is at `.well-known/apple-app-site-association` (no .json extension)

### "Works in development but not production"

- Verify production AASA file is deployed
- Check production domain matches entitlement
- Verify production build has correct entitlements

---

## Security Considerations

1. **Validate invite codes server-side** - never trust client input
2. **Expire invite links** - implement expiration dates
3. **Rate limit invite creation** - prevent abuse
4. **Audit invite usage** - log who accepts invites
5. **Revocable invites** - allow creators to revoke invites

---

## Monitoring

Track deep link analytics:

```typescript
// Log when deep link is opened
analytics.track('deep_link_opened', {
  path: url.pathname,
  source: 'universal_link', // or 'custom_scheme'
  trip_id: tripId,
});
```

---

## Next Steps

1. [x] Complete this setup guide
2. [ ] Create and deploy AASA file
3. [ ] Configure Associated Domains in Xcode
4. [ ] Implement deep link handling in app
5. [ ] Test on physical device
6. [ ] Set up analytics tracking
7. [ ] Document all supported routes
