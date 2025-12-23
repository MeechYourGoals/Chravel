# iOS Feature Implementation Guide for Chravel

**Last Updated:** January 2025  
**Target Platform:** iOS 16+ (Swift 5.9+, SwiftUI, Xcode 15+)  
**Backend:** Supabase (PostgreSQL + Realtime + Edge Functions)

---

## Overview

This guide provides a comprehensive blueprint for building the **Chravel iOS native app** in Xcode using Swift and SwiftUI. It maps every feature from the current TypeScript/React web app to its iOS equivalent, ensuring feature parity, correct data flows, and seamless integration with the Supabase backend.

**Chravel** is the AI-native operating system for collaborative travel, logistics, and event management, targeting:
- **Consumer Group Travel** (friend trips, family reunions, bachelor/ette parties)
- **Professional/Enterprise Logistics** (sports teams, entertainment tours, corporate retreats)
- **Large-Scale Events** (conferences, festivals, graduations)

### Key Technical Stack

| Component | Web (Current) | iOS (Target) |
|-----------|---------------|--------------|
| **UI Framework** | React 18 + TypeScript | SwiftUI |
| **State Management** | Zustand (client), TanStack Query (server) | ObservableObject + @Published, async/await |
| **Routing** | React Router | NavigationStack |
| **Backend** | Supabase (PostgreSQL + Realtime + Edge Functions) | Same (via Swift SDK) |
| **Authentication** | Supabase Auth (email, Google, Apple) | Same + Keychain token storage |
| **Real-time** | Supabase Realtime WebSocket | Supabase Swift Realtime |
| **Storage** | Supabase Storage (S3-compatible) | Same (upload via URLSession) |
| **Payments** | Stripe Checkout + Customer Portal | Same (via Edge Functions) |
| **Push Notifications** | Capacitor Push Notifications | APNs + UNUserNotificationCenter |
| **Styling** | Tailwind CSS | SwiftUI Modifiers + Design Tokens |

---

## Document Structure

This guide is organized into **12 core sections** plus **2 appendices**:

### Core Features
1. **[Trip Management & Status Filtering](docs/ios/01-trip-management.md)**
   - Trip status calculation (Upcoming/In Progress/Completed)
   - View modes (My Trips, Trips Pro, Events)
   - CRUD operations (create, edit, delete/archive)
   - Cover photo updates, description editing

2. **[Collaboration & Sharing](docs/ios/02-collaboration-sharing.md)**
   - Invite link generation with expiration
   - Join trip flow via invite code
   - Share trip via iOS share sheet
   - Role-based permissions (viewer, contributor, admin)

3. **[Chat & Messaging](docs/ios/03-chat-messaging.md)**
   - Real-time message delivery (Supabase Realtime)
   - @mentions with notifications
   - Message reactions (👍❤️🎉)
   - Typing indicators, read receipts

4. **[Calendar & Itinerary](docs/ios/04-calendar-itinerary.md)**
   - Event creation with conflict detection
   - Event categories (accommodation, food, transport, activities)
   - Timezone support
   - Event reminders

5. **[Tasks & Polls](docs/ios/05-tasks-polls.md)**
   - Task creation with assignments and due dates
   - Task status tracking with optimistic locking
   - Poll creation with real-time voting
   - Prevent double voting

6. **[Media Hub & Storage Quotas](docs/ios/06-media-storage-quotas.md)**
   - Free tier: 500 MB limit
   - Plus tier: Unlimited (50 GB soft cap)
   - Photo/video uploads via iOS Camera
   - Storage quota bar with upgrade prompts

### Pro/Enterprise Features
7. **[Pro: Team, Tags, Broadcasts, Schedules](docs/ios/07-pro-team-tags-broadcasts.md)**
   - Team roster management with roles
   - Category-specific roles (Sports, Entertainment, Corporate)
   - User-provided tags (no auto-generation in MVP)
   - Broadcast messaging with priority levels
   - Game/show schedule import

8. **[Notifications](docs/ios/08-notifications.md)**
   - Push notifications (APNs)
   - Local notifications (event reminders)
   - In-app notification center
   - Notification preferences (quiet hours, per-type toggles)

9. **[Settings Suite](docs/ios/09-settings-suite.md)**
   - Consumer settings (profile, billing, wallet, notifications)
   - Enterprise settings (team management, integrations, schedules)
   - Privacy & security controls

### Infrastructure
10. **[Billing & Subscription](docs/ios/10-billing-subscription.md)**
    - Stripe integration via Edge Functions
    - Consumer Plus ($9.99/mo)
    - Organization tiers (Starter, Business, Enterprise)
    - Subscription status polling

11. **[Data Sync Architecture](docs/ios/11-data-sync-architecture.md)**
    - Supabase as single source of truth
    - Real-time subscriptions
    - Authentication & token management
    - Offline support strategy (future)

12. **[Native Stack Mapping](docs/ios/12-native-stack-mapping.md)**
    - React/TanStack Query → Combine + async/await
    - Zustand → ObservableObject
    - React Router → NavigationStack
    - Capacitor plugins → Native iOS equivalents

### Appendices
- **[Appendix A: Supabase Tables](docs/ios/appendix-supabase-tables.md)**
  - Key tables, schemas, RLS policies
- **[Appendix B: Edge Functions](docs/ios/appendix-edge-functions.md)**
  - Stripe checkout, subscription check, customer portal
  - AI concierge routing (Lovable AI Gateway)

---

## Quick Start for iOS Developers

### Prerequisites
1. **Xcode 15+** with Swift 5.9+
2. **CocoaPods or Swift Package Manager** for dependencies
3. **Supabase Swift SDK** (https://github.com/supabase/supabase-swift)
4. **Stripe iOS SDK** (for payment UI, optional)
5. **Firebase Cloud Messaging** (for APNs token management, optional)

### Initial Setup Steps

1. **Clone Project & Install Dependencies**
   ```bash
   git clone <repo-url>
   cd chravel-ios
   # If using CocoaPods:
   pod install
   # If using SPM, add via Xcode: File > Add Packages
   ```

2. **Configure Supabase**
   ```swift
   // AppConfig.swift
   struct SupabaseConfig {
       static let url = URL(string: "https://jmjiyekmxwsxkfnqwyaa.supabase.co")!
       static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   
   let supabase = SupabaseClient(
       supabaseURL: SupabaseConfig.url,
       supabaseKey: SupabaseConfig.anonKey
   )
   ```

3. **Set Up Authentication**
   - Implement email/password + Apple Sign In + Google Sign In
   - Store JWT tokens in Keychain
   - Refresh tokens on app launch

4. **Configure Push Notifications**
   - Register for APNs in AppDelegate
   - Send device token to backend for user association
   - Handle notification payloads

5. **Map Data Models**
   - Create Swift structs for all Supabase tables (see Appendix A)
   - Use `Codable` for JSON parsing
   - Implement `Identifiable` for SwiftUI lists

---

## Development Priorities

Follow this sequence for maximum velocity:

### Phase 1: Foundation (Weeks 1-2)
- [ ] Authentication & user management
- [ ] Trip list with status filtering
- [ ] Trip detail view
- [ ] Basic navigation structure

### Phase 2: Core Collaboration (Weeks 3-4)
- [ ] Chat & messaging (Supabase Realtime)
- [ ] Calendar & events
- [ ] Invite flow
- [ ] Share sheet integration

### Phase 3: Media & Storage (Week 5)
- [ ] Media hub with uploads
- [ ] Storage quota tracking
- [ ] Camera/photo library integration

### Phase 4: Pro Features (Weeks 6-7)
- [ ] Team management
- [ ] Tasks & polls
- [ ] Broadcasts
- [ ] Game/show schedules

### Phase 5: Monetization (Week 8)
- [ ] Stripe checkout integration
- [ ] Subscription status polling
- [ ] Customer portal

### Phase 6: Notifications (Week 9)
- [ ] Push notification setup
- [ ] Local notification scheduling
- [ ] Notification preferences

### Phase 7: Settings & Polish (Week 10)
- [ ] Consumer settings suite
- [ ] Enterprise settings
- [ ] Onboarding flows
- [ ] Dark mode support

---

## Design System

The iOS app should match the web app's design language:

### Colors (HSL from `index.css`)
```swift
// Colors.swift
extension Color {
    static let primary = Color(hue: 0.5, saturation: 0.7, brightness: 0.95)
    static let secondary = Color(hue: 0.55, saturation: 0.6, brightness: 0.9)
    static let accent = Color(hue: 0.15, saturation: 0.85, brightness: 0.95)
    static let background = Color(hue: 0.0, saturation: 0.0, brightness: 0.98)
    // ... map all semantic tokens from index.css
}
```

### Typography
- **Headers**: SF Pro Display (Bold, 28-34pt)
- **Body**: SF Pro Text (Regular, 16-17pt)
- **Captions**: SF Pro Text (Regular, 12-14pt)

### Spacing
- Use 8pt grid system (8, 16, 24, 32, 40, 48)
- Match web app's padding/margin patterns

---

## Testing Strategy

### Unit Tests
- Data models (Codable conformance)
- Business logic (status calculation, quota math)
- Date/timezone handling

### Integration Tests
- Supabase queries
- Real-time subscriptions
- Edge function invocations

### UI Tests
- Critical user flows (login, create trip, send message)
- Accessibility compliance (VoiceOver)

### Manual Testing Checklist
- [ ] iPhone SE (smallest screen)
- [ ] iPhone 15 Pro (standard)
- [ ] iPhone 15 Pro Max (largest)
- [ ] iPad (landscape + portrait)
- [ ] Dark mode
- [ ] Low data mode
- [ ] Airplane mode (offline behavior)

---

## Security Considerations

1. **Never Store Secrets in Code**
   - Use Keychain for tokens
   - Use backend Edge Functions for API keys (Stripe, OpenAI)

2. **Validate All User Input**
   - Sanitize text before sending to backend
   - Prevent injection attacks

3. **Respect RLS Policies**
   - All Supabase queries automatically enforce Row-Level Security
   - Test with different user roles

4. **Secure File Uploads**
   - Validate file types and sizes
   - Use signed URLs for private files

---

## Support & Resources

- **Supabase Swift SDK**: https://github.com/supabase/supabase-swift
- **SwiftUI Docs**: https://developer.apple.com/documentation/swiftui
- **Stripe iOS SDK**: https://stripe.com/docs/mobile/ios
- **iOS Design Guidelines**: https://developer.apple.com/design/human-interface-guidelines/ios

---

## Next Steps

1. **Read [01-trip-management.md](docs/ios/01-trip-management.md)** to understand trip status logic
2. **Set up Supabase client** and test authentication
3. **Implement trip list view** with status filtering
4. **Join our Slack channel** for iOS dev questions

---

**Questions?** Contact the backend team for Supabase schema questions or Edge Function docs.
