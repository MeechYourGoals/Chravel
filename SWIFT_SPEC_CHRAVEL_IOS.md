=== SWIFT-SPEC START ===

# CHRAVEL iOS SWIFT SPECIFICATION
## Swift-Native Transformation for iOS Development

**Version:** 1.0  
**Platform:** iOS 17.0+  
**Swift Version:** 5.10  
**Xcode Version:** 16.0+  
**Architecture:** MVVM + SwiftUI  

---

## 1. SWIFT-NATIVE DATA MODELS

### 1.1 Core Domain Models

```swift
import Foundation
import SwiftUI

// MARK: - User Models

@Observable
final class User: Identifiable, Codable {
    var id: String
    var email: String?
    var phone: String?
    var displayName: String
    var firstName: String?
    var lastName: String?
    var avatarURL: URL?
    var bio: String?
    var isPro: Bool
    var showEmail: Bool
    var showPhone: Bool
    var proRole: ProRole?
    var organizationId: String?
    var permissions: Set<Permission>
    var notificationSettings: NotificationSettings
    
    init(
        id: String,
        email: String? = nil,
        phone: String? = nil,
        displayName: String,
        firstName: String? = nil,
        lastName: String? = nil,
        avatarURL: URL? = nil,
        bio: String? = nil,
        isPro: Bool = false,
        showEmail: Bool = false,
        showPhone: Bool = false,
        proRole: ProRole? = nil,
        organizationId: String? = nil,
        permissions: Set<Permission> = [.read],
        notificationSettings: NotificationSettings = .default
    ) {
        self.id = id
        self.email = email
        self.phone = phone
        self.displayName = displayName
        self.firstName = firstName
        self.lastName = lastName
        self.avatarURL = avatarURL
        self.bio = bio
        self.isPro = isPro
        self.showEmail = showEmail
        self.showPhone = showPhone
        self.proRole = proRole
        self.organizationId = organizationId
        self.permissions = permissions
        self.notificationSettings = notificationSettings
    }
}

enum ProRole: String, Codable, CaseIterable {
    case admin, staff, talent, player, crew, security
    case medical, producer, speakers, guests
    case coordinators, logistics, press
}

enum Permission: String, Codable {
    case read, write, admin, finance, compliance, medical
}

struct NotificationSettings: Codable, Equatable {
    var messages: Bool
    var broadcasts: Bool
    var tripUpdates: Bool
    var email: Bool
    var push: Bool
    
    static let `default` = NotificationSettings(
        messages: true,
        broadcasts: true,
        tripUpdates: true,
        email: true,
        push: false
    )
}
```

```swift
// MARK: - Trip Models

@Observable
final class Trip: Identifiable, Codable {
    var id: String
    var name: String
    var description: String?
    var startDate: Date?
    var endDate: Date?
    var destination: String?
    var coverImageURL: URL?
    var createdBy: String
    var createdAt: Date
    var updatedAt: Date
    var isArchived: Bool
    var tripType: TripType
    var basecampName: String?
    var basecampAddress: String?
    var enabledFeatures: Set<TripFeature>
    var privacyMode: PrivacyMode
    var aiAccessEnabled: Bool
    
    init(
        id: String = UUID().uuidString,
        name: String,
        description: String? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil,
        destination: String? = nil,
        coverImageURL: URL? = nil,
        createdBy: String,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        isArchived: Bool = false,
        tripType: TripType = .consumer,
        basecampName: String? = nil,
        basecampAddress: String? = nil,
        enabledFeatures: Set<TripFeature> = [],
        privacyMode: PrivacyMode = .standard,
        aiAccessEnabled: Bool = true
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.startDate = startDate
        self.endDate = endDate
        self.destination = destination
        self.coverImageURL = coverImageURL
        self.createdBy = createdBy
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.isArchived = isArchived
        self.tripType = tripType
        self.basecampName = basecampName
        self.basecampAddress = basecampAddress
        self.enabledFeatures = enabledFeatures
        self.privacyMode = privacyMode
        self.aiAccessEnabled = aiAccessEnabled
    }
}

enum TripType: String, Codable, CaseIterable {
    case consumer, pro, event
    
    var displayName: String {
        switch self {
        case .consumer: return "Personal Trip"
        case .pro: return "Pro Trip"
        case .event: return "Event"
        }
    }
}

enum TripFeature: String, Codable, CaseIterable {
    case chat, media, payments, calendar, ai
    case channels, broadcasts, roster, compliance
}

enum PrivacyMode: String, Codable {
    case standard, high
}

struct TripMember: Identifiable, Codable {
    let id: String
    let tripId: String
    let userId: String
    var role: TripMemberRole
    let joinedAt: Date
    var profile: UserProfile?
    
    enum TripMemberRole: String, Codable {
        case creator, admin, member, viewer
    }
}

struct UserProfile: Codable {
    let userId: String
    let displayName: String?
    let avatarURL: URL?
    let email: String?
}
```

```swift
// MARK: - Message Models

@Observable
final class ChatMessage: Identifiable, Codable {
    var id: String
    var tripId: String
    var senderId: String
    var content: String
    var authorName: String?
    var messageType: MessageType
    var replyToId: String?
    var threadId: String?
    var isEdited: Bool
    var editedAt: Date?
    var isDeleted: Bool
    var deletedAt: Date?
    var attachments: [MessageAttachment]
    var mediaType: MediaType?
    var mediaURL: URL?
    var linkPreview: LinkPreview?
    var privacyMode: PrivacyMode
    var createdAt: Date
    var updatedAt: Date
    
    init(
        id: String = UUID().uuidString,
        tripId: String,
        senderId: String,
        content: String,
        authorName: String? = nil,
        messageType: MessageType = .text,
        replyToId: String? = nil,
        threadId: String? = nil,
        isEdited: Bool = false,
        editedAt: Date? = nil,
        isDeleted: Bool = false,
        deletedAt: Date? = nil,
        attachments: [MessageAttachment] = [],
        mediaType: MediaType? = nil,
        mediaURL: URL? = nil,
        linkPreview: LinkPreview? = nil,
        privacyMode: PrivacyMode = .standard,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.tripId = tripId
        self.senderId = senderId
        self.content = content
        self.authorName = authorName
        self.messageType = messageType
        self.replyToId = replyToId
        self.threadId = threadId
        self.isEdited = isEdited
        self.editedAt = editedAt
        self.isDeleted = isDeleted
        self.deletedAt = deletedAt
        self.attachments = attachments
        self.mediaType = mediaType
        self.mediaURL = mediaURL
        self.linkPreview = linkPreview
        self.privacyMode = privacyMode
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

enum MessageType: String, Codable {
    case text, broadcast, payment, system
}

enum MediaType: String, Codable {
    case image, video, audio, file
}

struct MessageAttachment: Identifiable, Codable {
    let id: String
    let type: AttachmentType
    let url: URL
    var filename: String?
    var size: Int64?
    var mimeType: String?
    var thumbnail: URL?
    
    enum AttachmentType: String, Codable {
        case image, video, file, link
    }
}

struct LinkPreview: Codable {
    let url: URL
    var title: String?
    var description: String?
    var imageURL: URL?
    var domain: String?
}
```

```swift
// MARK: - Payment Models

struct PaymentMethod: Identifiable, Codable, Hashable {
    let id: String
    var type: PaymentMethodType
    var identifier: String
    var displayName: String?
    var isPreferred: Bool
    var isVisible: Bool
    
    enum PaymentMethodType: String, Codable, CaseIterable {
        case venmo, zelle, cashapp, applepay
        case paypal, applecash, cash, other
        
        var displayName: String {
            switch self {
            case .venmo: return "Venmo"
            case .zelle: return "Zelle"
            case .cashapp: return "Cash App"
            case .applepay: return "Apple Pay"
            case .paypal: return "PayPal"
            case .applecash: return "Apple Cash"
            case .cash: return "Cash"
            case .other: return "Other"
            }
        }
        
        var icon: String {
            switch self {
            case .venmo: return "v.circle.fill"
            case .zelle: return "z.circle.fill"
            case .cashapp: return "dollarsign.circle.fill"
            case .applepay: return "apple.logo"
            case .paypal: return "p.circle.fill"
            case .applecash: return "apple.logo"
            case .cash: return "banknote.fill"
            case .other: return "creditcard.fill"
            }
        }
    }
}

@Observable
final class PaymentSplit: Identifiable, Codable {
    var id: String
    var tripId: String
    var createdBy: String
    var createdByName: String
    var amount: Decimal
    var currency: Currency
    var description: String
    var category: ExpenseCategory?
    var splitType: SplitType
    var participants: [PaymentParticipant]
    var isSettled: Bool
    var settledAt: Date?
    var receiptURL: URL?
    var timestamp: Date
    
    init(
        id: String = UUID().uuidString,
        tripId: String,
        createdBy: String,
        createdByName: String,
        amount: Decimal,
        currency: Currency = .usd,
        description: String,
        category: ExpenseCategory? = nil,
        splitType: SplitType = .equal,
        participants: [PaymentParticipant] = [],
        isSettled: Bool = false,
        settledAt: Date? = nil,
        receiptURL: URL? = nil,
        timestamp: Date = .now
    ) {
        self.id = id
        self.tripId = tripId
        self.createdBy = createdBy
        self.createdByName = createdByName
        self.amount = amount
        self.currency = currency
        self.description = description
        self.category = category
        self.splitType = splitType
        self.participants = participants
        self.isSettled = isSettled
        self.settledAt = settledAt
        self.receiptURL = receiptURL
        self.timestamp = timestamp
    }
}

enum SplitType: String, Codable {
    case equal, custom, percentage
}

enum Currency: String, Codable, CaseIterable {
    case usd = "USD"
    case eur = "EUR"
    case gbp = "GBP"
    case cad = "CAD"
    case aud = "AUD"
    
    var symbol: String {
        switch self {
        case .usd, .cad, .aud: return "$"
        case .eur: return "€"
        case .gbp: return "£"
        }
    }
}

enum ExpenseCategory: String, Codable, CaseIterable {
    case transportation, accommodation, food, activities, shopping, misc
    
    var displayName: String {
        switch self {
        case .transportation: return "Transportation"
        case .accommodation: return "Accommodation"
        case .food: return "Food & Dining"
        case .activities: return "Activities"
        case .shopping: return "Shopping"
        case .misc: return "Miscellaneous"
        }
    }
    
    var icon: String {
        switch self {
        case .transportation: return "car.fill"
        case .accommodation: return "bed.double.fill"
        case .food: return "fork.knife"
        case .activities: return "figure.hiking"
        case .shopping: return "bag.fill"
        case .misc: return "cube.box.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .transportation: return .blue
        case .accommodation: return .green
        case .food: return .orange
        case .activities: return .purple
        case .shopping: return .pink
        case .misc: return .gray
        }
    }
}

struct PaymentParticipant: Identifiable, Codable {
    let id: String
    let userId: String
    var name: String
    var avatar: URL?
    var amount: Decimal
    var isPaid: Bool
    var paidAt: Date?
    var paymentMethod: PaymentMethod?
    var confirmationStatus: ConfirmationStatus
    
    enum ConfirmationStatus: String, Codable {
        case none, pending, confirmed
    }
}

struct BalanceSummary: Codable {
    let totalOwed: Decimal
    let totalOwedToYou: Decimal
    var netBalance: Decimal { totalOwedToYou - totalOwed }
    let baseCurrency: Currency
    let balances: [PersonalBalance]
}

struct PersonalBalance: Identifiable, Codable {
    let id: String
    let userId: String
    let userName: String
    let avatar: URL?
    let amountOwed: Decimal
    let currency: Currency
    let preferredPaymentMethod: PaymentMethod?
    let unsettledPayments: [UnsettledPayment]
}

struct UnsettledPayment: Identifiable, Codable {
    let id: String
    let paymentId: String
    let amount: Decimal
    let description: String
    let date: Date
}
```

```swift
// MARK: - Task Models

@Observable
final class TripTask: Identifiable, Codable {
    var id: String
    var tripId: String
    var creatorId: String
    var title: String
    var description: String?
    var dueAt: Date?
    var isPoll: Bool
    var createdAt: Date
    var updatedAt: Date
    var taskStatuses: [TaskStatus]
    
    var isCompleted: Bool {
        guard !taskStatuses.isEmpty else { return false }
        return taskStatuses.allSatisfy { $0.completed }
    }
    
    var completedCount: Int {
        taskStatuses.filter { $0.completed }.count
    }
    
    init(
        id: String = UUID().uuidString,
        tripId: String,
        creatorId: String,
        title: String,
        description: String? = nil,
        dueAt: Date? = nil,
        isPoll: Bool = false,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        taskStatuses: [TaskStatus] = []
    ) {
        self.id = id
        self.tripId = tripId
        self.creatorId = creatorId
        self.title = title
        self.description = description
        self.dueAt = dueAt
        self.isPoll = isPoll
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.taskStatuses = taskStatuses
    }
}

struct TaskStatus: Identifiable, Codable {
    let id: String
    let taskId: String
    let userId: String
    var completed: Bool
    var completedAt: Date?
    var user: UserProfile?
}
```

```swift
// MARK: - Channel Models (Pro)

@Observable
final class TripChannel: Identifiable, Codable {
    var id: String
    var tripId: String
    var name: String
    var slug: String
    var description: String?
    var channelType: ChannelType
    var roleFilter: RoleFilter?
    var createdBy: String
    var isArchived: Bool
    var createdAt: Date
    var updatedAt: Date
    
    init(
        id: String = UUID().uuidString,
        tripId: String,
        name: String,
        slug: String,
        description: String? = nil,
        channelType: ChannelType = .custom,
        roleFilter: RoleFilter? = nil,
        createdBy: String,
        isArchived: Bool = false,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.tripId = tripId
        self.name = name
        self.slug = slug
        self.description = description
        self.channelType = channelType
        self.roleFilter = roleFilter
        self.createdBy = createdBy
        self.isArchived = isArchived
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

enum ChannelType: String, Codable {
    case role, custom
}

struct RoleFilter: Codable {
    var role: String?
    var department: String?
}

struct ChannelStats: Codable {
    let channelId: String
    let memberCount: Int
    let messageCount: Int
    let lastMessageAt: Date?
    let unreadCount: Int
}
```

```swift
// MARK: - Event Models

@Observable
final class ChravelEvent: Identifiable, Codable {
    var id: String
    var title: String
    var location: String
    var dateRange: String
    var category: String
    var description: String
    var capacity: Int
    var registrationStatus: RegistrationStatus
    var tracks: [EventTrack]
    var speakers: [Speaker]
    var sessions: [Session]
    var sponsors: [Sponsor]
    var exhibitors: [Exhibitor]
    var participants: [EventAttendee]
    var budget: EventBudget
    var chatEnabled: Bool
    var pollsEnabled: Bool
    var conciergeEnabled: Bool
    var mediaUploadEnabled: Bool
    
    enum RegistrationStatus: String, Codable {
        case open, closed, waitlist
    }
}

struct EventTrack: Identifiable, Codable {
    let id: String
    var name: String
    var color: Color
    var location: String
    
    enum CodingKeys: String, CodingKey {
        case id, name, location
        case colorHex = "color"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        location = try container.decode(String.self, forKey: .location)
        let hex = try container.decode(String.self, forKey: .colorHex)
        color = Color(hex: hex) ?? .blue
    }
}

struct Speaker: Identifiable, Codable {
    let id: String
    var name: String
    var title: String
    var company: String
    var bio: String
    var avatarURL: URL?
    var sessionIds: [String]
    var performerType: PerformerType?
    var socialLinks: SocialLinks?
    
    enum PerformerType: String, Codable {
        case speaker, comedian, musician, dj
        case host, panelist, officiant, other
    }
    
    struct SocialLinks: Codable {
        var instagram: String?
        var twitter: String?
        var website: String?
    }
}

struct Session: Identifiable, Codable {
    let id: String
    var title: String
    var description: String
    var speakerId: String
    var trackId: String
    var startTime: Date
    var endTime: Date
    var location: String
}

struct Sponsor: Identifiable, Codable {
    let id: String
    var name: String
    var tier: SponsorTier
    var logoURL: URL?
    var website: URL?
    var description: String
    var booth: String?
    
    enum SponsorTier: String, Codable, CaseIterable {
        case platinum, gold, silver, bronze
        
        var displayColor: Color {
            switch self {
            case .platinum: return Color(white: 0.9)
            case .gold: return .yellow
            case .silver: return .gray
            case .bronze: return .brown
            }
        }
    }
}

struct Exhibitor: Identifiable, Codable {
    let id: String
    var name: String
    var description: String
    var booth: String
    var logoURL: URL?
    var website: URL?
    var contacts: [Contact]
    
    struct Contact: Codable {
        let name: String
        let role: String
        let email: String
    }
}

struct EventAttendee: Identifiable, Codable {
    let id: String
    var name: String
    var email: String
    var rsvpStatus: RSVPStatus
    var rsvpedAt: Date?
    var checkedIn: Bool
    
    enum RSVPStatus: String, Codable {
        case going, maybe, notGoing, notAnswered
        
        var displayName: String {
            switch self {
            case .going: return "Going"
            case .maybe: return "Maybe"
            case .notGoing: return "Not Going"
            case .notAnswered: return "Not Answered"
            }
        }
        
        var icon: String {
            switch self {
            case .going: return "checkmark.circle.fill"
            case .maybe: return "questionmark.circle.fill"
            case .notGoing: return "xmark.circle.fill"
            case .notAnswered: return "circle"
            }
        }
    }
}

struct EventBudget: Codable {
    var total: Decimal
    var spent: Decimal
    var sponsorRevenue: Decimal?
    var categories: [BudgetCategory]
    
    struct BudgetCategory: Identifiable, Codable {
        let id = UUID()
        let name: String
        var allocated: Decimal
        var spent: Decimal
        
        var remaining: Decimal { allocated - spent }
        var percentUsed: Double {
            guard allocated > 0 else { return 0 }
            return Double(truncating: (spent / allocated) as NSDecimalNumber)
        }
    }
}
```

```swift
// MARK: - Organization Models

@Observable
final class Organization: Identifiable, Codable {
    var id: String
    var name: String
    var displayName: String
    var billingEmail: String
    var subscriptionTier: SubscriptionTier
    var subscriptionStatus: SubscriptionStatus
    var seatLimit: Int
    var seatsUsed: Int
    var stripeCustomerId: String?
    var trialEndsAt: Date?
    var subscriptionEndsAt: Date?
    var createdAt: Date
    var updatedAt: Date
    
    var seatsAvailable: Int { seatLimit - seatsUsed }
    var seatUsagePercent: Double {
        guard seatLimit > 0 else { return 0 }
        return Double(seatsUsed) / Double(seatLimit)
    }
}

enum SubscriptionTier: String, Codable, CaseIterable {
    case starter, growing, enterprise, enterprisePlus
    
    var displayName: String {
        switch self {
        case .starter: return "Starter Pro"
        case .growing: return "Growth Pro"
        case .enterprise: return "Enterprise Pro"
        case .enterprisePlus: return "Enterprise Plus"
        }
    }
    
    var price: Decimal {
        switch self {
        case .starter: return 49
        case .growing: return 199
        case .enterprise: return 499
        case .enterprisePlus: return 0 // Contact sales
        }
    }
    
    var seatLimit: Int {
        switch self {
        case .starter: return 25
        case .growing: return 100
        case .enterprise: return 500
        case .enterprisePlus: return Int.max
        }
    }
}

enum SubscriptionStatus: String, Codable {
    case active, trial, cancelled, expired
}

struct OrganizationMember: Identifiable, Codable {
    let id: String
    let organizationId: String
    let userId: String
    var role: OrgRole
    let seatId: String
    var status: MemberStatus
    let joinedAt: Date
    
    enum OrgRole: String, Codable {
        case owner, admin, member
    }
    
    enum MemberStatus: String, Codable {
        case active, pending, suspended
    }
}
```

```swift
// MARK: - Notification Models

struct NotificationPreferences: Codable {
    var pushEnabled: Bool
    var emailEnabled: Bool
    var smsEnabled: Bool
    var chatMessages: Bool
    var mentionsOnly: Bool
    var broadcasts: Bool
    var tasks: Bool
    var payments: Bool
    var calendarReminders: Bool
    var tripInvites: Bool
    var joinRequests: Bool
    var quietHoursEnabled: Bool
    var quietStart: Date
    var quietEnd: Date
    var timezone: TimeZone
    
    static let `default` = NotificationPreferences(
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        chatMessages: false,
        mentionsOnly: true,
        broadcasts: true,
        tasks: true,
        payments: true,
        calendarReminders: true,
        tripInvites: true,
        joinRequests: true,
        quietHoursEnabled: false,
        quietStart: Calendar.current.date(from: DateComponents(hour: 22))!,
        quietEnd: Calendar.current.date(from: DateComponents(hour: 8))!,
        timezone: .current
    )
}

struct AppNotification: Identifiable, Codable {
    let id: String
    let userId: String
    let tripId: String?
    let notificationType: NotificationType
    let title: String
    let body: String
    var data: [String: String]
    var isRead: Bool
    var readAt: Date?
    let createdAt: Date
    let expiresAt: Date
    
    enum NotificationType: String, Codable {
        case broadcast, mention, chat, task
        case payment, calendar, invite, joinRequest, system
    }
}
```

```swift
// MARK: - AI Models

struct AIQuery: Identifiable, Codable {
    let id: String
    let tripId: String
    let userId: String
    let query: String
    let response: String
    let sources: [AISource]
    let confidence: Double
    let timestamp: Date
    var feedback: AIFeedback?
    
    enum AIFeedback: String, Codable {
        case positive, negative
    }
}

struct AISource: Identifiable, Codable {
    let id: String
    let type: SourceType
    let title: String
    let excerpt: String
    let relevance: Double
    let url: URL?
    
    enum SourceType: String, Codable {
        case message, file, link, event, photo
    }
}

struct AISuggestion: Identifiable, Codable {
    let id: String
    let type: SuggestionType
    let title: String
    let description: String
    let confidence: Double
    let reasoning: String
    let isActionable: Bool
    let action: SuggestedAction?
    
    enum SuggestionType: String, Codable {
        case activity, restaurant, accommodation, timing, route
    }
    
    struct SuggestedAction: Codable {
        let type: ActionType
        let data: [String: String]
        
        enum ActionType: String, Codable {
            case addToItinerary, createEvent, sendMessage
        }
    }
}
```

---

## 2. VIEWMODELS

### 2.1 Authentication ViewModel

```swift
import Foundation
import SwiftUI
import AuthenticationServices
import Supabase

@Observable
@MainActor
final class AuthViewModel {
    // MARK: - Published State
    var user: User?
    var session: Session?
    var isLoading = false
    var errorMessage: String?
    var showError = false
    
    // MARK: - Private
    private let supabase: SupabaseClient
    private var authStateTask: Task<Void, Never>?
    
    // MARK: - Computed
    var isAuthenticated: Bool { user != nil }
    var currentUserId: String? { user?.id }
    
    init(supabase: SupabaseClient = SupabaseManager.shared.client) {
        self.supabase = supabase
        observeAuthState()
    }
    
    deinit {
        authStateTask?.cancel()
    }
    
    // MARK: - Auth State Observation
    private func observeAuthState() {
        authStateTask = Task {
            for await (event, session) in supabase.auth.authStateChanges {
                await handleAuthStateChange(event: event, session: session)
            }
        }
    }
    
    private func handleAuthStateChange(event: AuthChangeEvent, session: Session?) async {
        self.session = session
        
        if let session = session {
            await fetchUserProfile(userId: session.user.id)
        } else {
            self.user = nil
        }
        
        self.isLoading = false
    }
    
    // MARK: - Sign In Methods
    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let session = try await supabase.auth.signIn(
                email: email,
                password: password
            )
            self.session = session
            await fetchUserProfile(userId: session.user.id)
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    func signInWithApple(credential: ASAuthorizationAppleIDCredential) async {
        isLoading = true
        errorMessage = nil
        
        guard let identityToken = credential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8) else {
            errorMessage = "Invalid Apple credential"
            showError = true
            isLoading = false
            return
        }
        
        do {
            let session = try await supabase.auth.signInWithIdToken(
                credentials: .init(
                    provider: .apple,
                    idToken: tokenString
                )
            )
            self.session = session
            await fetchUserProfile(userId: session.user.id)
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    func signInWithGoogle() async {
        // Implementation using GoogleSignIn SDK
        isLoading = true
        // ... OAuth flow
        isLoading = false
    }
    
    // MARK: - Sign Up
    func signUp(email: String, password: String, firstName: String, lastName: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await supabase.auth.signUp(
                email: email,
                password: password,
                data: [
                    "first_name": .string(firstName),
                    "last_name": .string(lastName),
                    "full_name": .string("\(firstName) \(lastName)")
                ]
            )
            
            if response.session != nil {
                // Auto-confirmed, proceed
            } else {
                errorMessage = "Please check your email to confirm your account."
                showError = true
            }
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    // MARK: - Sign Out
    func signOut() async {
        do {
            try await supabase.auth.signOut()
            user = nil
            session = nil
        } catch {
            handleAuthError(error)
        }
    }
    
    // MARK: - Password Reset
    func resetPassword(email: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabase.auth.resetPasswordForEmail(email)
            errorMessage = "Password reset email sent. Please check your inbox."
            showError = true
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    // MARK: - Profile
    func updateProfile(_ updates: ProfileUpdate) async {
        guard let userId = currentUserId else { return }
        
        do {
            try await supabase
                .from("profiles")
                .update(updates)
                .eq("user_id", value: userId)
                .execute()
            
            // Refresh user
            await fetchUserProfile(userId: userId)
        } catch {
            handleAuthError(error)
        }
    }
    
    // MARK: - Private Helpers
    private func fetchUserProfile(userId: String) async {
        do {
            let profile: UserProfile = try await supabase
                .from("profiles")
                .select()
                .eq("user_id", value: userId)
                .single()
                .execute()
                .value
            
            self.user = User(
                id: userId,
                email: session?.user.email,
                displayName: profile.displayName ?? session?.user.email ?? "User"
            )
        } catch {
            // Create default user from session
            self.user = User(
                id: userId,
                email: session?.user.email,
                displayName: session?.user.email ?? "User"
            )
        }
    }
    
    private func handleAuthError(_ error: Error) {
        if let authError = error as? AuthError {
            switch authError {
            case .invalidCredentials:
                errorMessage = "Invalid email or password."
            case .userNotFound:
                errorMessage = "No account found with this email."
            default:
                errorMessage = authError.localizedDescription
            }
        } else {
            errorMessage = error.localizedDescription
        }
        showError = true
    }
}

struct ProfileUpdate: Encodable {
    var displayName: String?
    var firstName: String?
    var lastName: String?
    var avatarUrl: String?
    var bio: String?
    
    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
        case bio
    }
}
```

### 2.2 Trips ViewModel

```swift
import Foundation
import SwiftUI

@Observable
@MainActor
final class TripsViewModel {
    // MARK: - State
    var trips: [Trip] = []
    var proTrips: [Trip] = []
    var events: [Trip] = []
    var selectedTrip: Trip?
    var isLoading = false
    var errorMessage: String?
    
    // MARK: - Filters
    var searchQuery = ""
    var activeFilter: DateFilter = .all
    var viewMode: ViewMode = .myTrips
    
    // MARK: - Computed
    var filteredTrips: [Trip] {
        trips.filter { trip in
            matchesSearch(trip) && matchesDateFilter(trip)
        }
    }
    
    var tripStats: TripStats {
        TripStats(
            total: trips.count,
            active: trips.filter { !$0.isArchived && isUpcoming($0) }.count,
            upcoming: trips.filter { isUpcoming($0) }.count,
            past: trips.filter { isPast($0) }.count,
            archived: trips.filter { $0.isArchived }.count
        )
    }
    
    // MARK: - Private
    private let tripService: TripService
    private let authViewModel: AuthViewModel
    
    init(tripService: TripService = .shared, authViewModel: AuthViewModel) {
        self.tripService = tripService
        self.authViewModel = authViewModel
    }
    
    // MARK: - Actions
    func loadTrips() async {
        guard let userId = authViewModel.currentUserId else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let allTrips = try await tripService.getUserTrips(userId: userId)
            
            trips = allTrips.filter { $0.tripType == .consumer }
            proTrips = allTrips.filter { $0.tripType == .pro }
            events = allTrips.filter { $0.tripType == .event }
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func createTrip(_ data: CreateTripRequest) async -> Trip? {
        isLoading = true
        errorMessage = nil
        
        do {
            let trip = try await tripService.createTrip(data)
            
            switch trip.tripType {
            case .consumer:
                trips.insert(trip, at: 0)
            case .pro:
                proTrips.insert(trip, at: 0)
            case .event:
                events.insert(trip, at: 0)
            }
            
            isLoading = false
            return trip
        } catch TripError.limitReached {
            errorMessage = "You've reached your trip limit. Upgrade to create more trips."
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
        return nil
    }
    
    func archiveTrip(_ trip: Trip) async {
        do {
            try await tripService.archiveTrip(tripId: trip.id)
            trip.isArchived = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func selectTrip(_ trip: Trip) {
        selectedTrip = trip
    }
    
    // MARK: - Private Helpers
    private func matchesSearch(_ trip: Trip) -> Bool {
        guard !searchQuery.isEmpty else { return true }
        let query = searchQuery.lowercased()
        return trip.name.lowercased().contains(query) ||
               trip.destination?.lowercased().contains(query) == true ||
               trip.description?.lowercased().contains(query) == true
    }
    
    private func matchesDateFilter(_ trip: Trip) -> Bool {
        switch activeFilter {
        case .all: return true
        case .upcoming: return isUpcoming(trip)
        case .past: return isPast(trip)
        case .thisWeek: return isThisWeek(trip)
        case .thisMonth: return isThisMonth(trip)
        }
    }
    
    private func isUpcoming(_ trip: Trip) -> Bool {
        guard let startDate = trip.startDate else { return true }
        return startDate >= Date()
    }
    
    private func isPast(_ trip: Trip) -> Bool {
        guard let endDate = trip.endDate else { return false }
        return endDate < Date()
    }
    
    private func isThisWeek(_ trip: Trip) -> Bool {
        guard let startDate = trip.startDate else { return false }
        return Calendar.current.isDate(startDate, equalTo: Date(), toGranularity: .weekOfYear)
    }
    
    private func isThisMonth(_ trip: Trip) -> Bool {
        guard let startDate = trip.startDate else { return false }
        return Calendar.current.isDate(startDate, equalTo: Date(), toGranularity: .month)
    }
}

// Supporting Types
enum ViewMode: String, CaseIterable {
    case myTrips, tripsPro, events, travelRecs
    
    var displayName: String {
        switch self {
        case .myTrips: return "My Trips"
        case .tripsPro: return "Chravel Pro"
        case .events: return "Events"
        case .travelRecs: return "Travel Recs"
        }
    }
}

enum DateFilter: String, CaseIterable {
    case all, upcoming, past, thisWeek, thisMonth
    
    var displayName: String {
        switch self {
        case .all: return "All"
        case .upcoming: return "Upcoming"
        case .past: return "Past"
        case .thisWeek: return "This Week"
        case .thisMonth: return "This Month"
        }
    }
}

struct TripStats {
    let total: Int
    let active: Int
    let upcoming: Int
    let past: Int
    let archived: Int
}

struct CreateTripRequest: Encodable {
    let name: String
    var description: String?
    var destination: String?
    var startDate: Date?
    var endDate: Date?
    var tripType: TripType = .consumer
    var coverImageURL: URL?
    var enabledFeatures: [TripFeature]?
}
```

### 2.3 Chat ViewModel

```swift
import Foundation
import SwiftUI
import Combine

@Observable
@MainActor
final class ChatViewModel {
    // MARK: - State
    var messages: [ChatMessage] = []
    var draftMessage = ""
    var replyingTo: ChatMessage?
    var editingMessage: ChatMessage?
    var isLoading = false
    var isSending = false
    var errorMessage: String?
    var typingUsers: [String] = []
    
    // MARK: - Attachments
    var pendingAttachments: [PendingAttachment] = []
    
    // MARK: - Private
    private let tripId: String
    private let chatService: ChatService
    private let authViewModel: AuthViewModel
    private var realtimeChannel: RealtimeChannelProtocol?
    private var cancellables = Set<AnyCancellable>()
    
    init(tripId: String, chatService: ChatService = .shared, authViewModel: AuthViewModel) {
        self.tripId = tripId
        self.chatService = chatService
        self.authViewModel = authViewModel
    }
    
    // MARK: - Lifecycle
    func onAppear() async {
        await loadMessages()
        subscribeToRealtime()
    }
    
    func onDisappear() {
        unsubscribeFromRealtime()
    }
    
    // MARK: - Load Messages
    func loadMessages() async {
        isLoading = true
        errorMessage = nil
        
        do {
            messages = try await chatService.getMessages(tripId: tripId)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    // MARK: - Send Message
    func sendMessage() async {
        guard !draftMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
              !pendingAttachments.isEmpty else { return }
        
        guard let userId = authViewModel.currentUserId,
              let userName = authViewModel.user?.displayName else { return }
        
        isSending = true
        
        let content = draftMessage
        let attachments = pendingAttachments
        let replyTo = replyingTo?.id
        
        // Clear draft immediately for responsiveness
        draftMessage = ""
        pendingAttachments = []
        replyingTo = nil
        
        // Optimistic update
        let tempId = UUID().uuidString
        let tempMessage = ChatMessage(
            id: tempId,
            tripId: tripId,
            senderId: userId,
            content: content,
            authorName: userName,
            replyToId: replyTo
        )
        messages.append(tempMessage)
        
        do {
            // Upload attachments if any
            var uploadedAttachments: [MessageAttachment] = []
            for attachment in attachments {
                if let uploaded = try await chatService.uploadAttachment(attachment) {
                    uploadedAttachments.append(uploaded)
                }
            }
            
            // Send message
            let sentMessage = try await chatService.sendMessage(
                tripId: tripId,
                content: content,
                attachments: uploadedAttachments,
                replyToId: replyTo
            )
            
            // Replace temp message
            if let index = messages.firstIndex(where: { $0.id == tempId }) {
                messages[index] = sentMessage
            }
        } catch {
            // Rollback optimistic update
            messages.removeAll { $0.id == tempId }
            errorMessage = error.localizedDescription
        }
        
        isSending = false
    }
    
    // MARK: - Edit Message
    func startEditing(_ message: ChatMessage) {
        guard message.senderId == authViewModel.currentUserId else { return }
        editingMessage = message
        draftMessage = message.content
    }
    
    func saveEdit() async {
        guard let message = editingMessage else { return }
        
        let newContent = draftMessage
        editingMessage = nil
        draftMessage = ""
        
        do {
            try await chatService.editMessage(messageId: message.id, content: newContent)
            
            if let index = messages.firstIndex(where: { $0.id == message.id }) {
                messages[index].content = newContent
                messages[index].isEdited = true
                messages[index].editedAt = Date()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func cancelEdit() {
        editingMessage = nil
        draftMessage = ""
    }
    
    // MARK: - Delete Message
    func deleteMessage(_ message: ChatMessage) async {
        guard message.senderId == authViewModel.currentUserId else { return }
        
        do {
            try await chatService.deleteMessage(messageId: message.id)
            
            if let index = messages.firstIndex(where: { $0.id == message.id }) {
                messages[index].isDeleted = true
                messages[index].content = "[Message deleted]"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Reply
    func startReply(to message: ChatMessage) {
        replyingTo = message
    }
    
    func cancelReply() {
        replyingTo = nil
    }
    
    // MARK: - Attachments
    func addAttachment(_ attachment: PendingAttachment) {
        pendingAttachments.append(attachment)
    }
    
    func removeAttachment(_ attachment: PendingAttachment) {
        pendingAttachments.removeAll { $0.id == attachment.id }
    }
    
    // MARK: - Realtime
    private func subscribeToRealtime() {
        realtimeChannel = chatService.subscribeToMessages(tripId: tripId) { [weak self] message in
            Task { @MainActor in
                guard let self = self else { return }
                // Don't duplicate messages we just sent
                if !self.messages.contains(where: { $0.id == message.id }) {
                    self.messages.append(message)
                }
            }
        }
    }
    
    private func unsubscribeFromRealtime() {
        realtimeChannel?.unsubscribe()
        realtimeChannel = nil
    }
}

struct PendingAttachment: Identifiable {
    let id = UUID()
    let type: MessageAttachment.AttachmentType
    let data: Data
    let filename: String
    var thumbnail: UIImage?
}
```

### 2.4 Payments ViewModel

```swift
import Foundation
import SwiftUI

@Observable
@MainActor
final class PaymentsViewModel {
    // MARK: - State
    var payments: [PaymentSplit] = []
    var balanceSummary: BalanceSummary?
    var userPaymentMethods: [PaymentMethod] = []
    var isLoading = false
    var errorMessage: String?
    
    // MARK: - Create Payment State
    var showCreatePayment = false
    var newPaymentAmount: Decimal = 0
    var newPaymentDescription = ""
    var newPaymentCategory: ExpenseCategory?
    var newPaymentSplitType: SplitType = .equal
    var selectedParticipants: Set<String> = []
    var customAmounts: [String: Decimal] = [:]
    
    // MARK: - Private
    private let tripId: String
    private let paymentService: PaymentService
    private let authViewModel: AuthViewModel
    
    init(tripId: String, paymentService: PaymentService = .shared, authViewModel: AuthViewModel) {
        self.tripId = tripId
        self.paymentService = paymentService
        self.authViewModel = authViewModel
    }
    
    // MARK: - Load Data
    func loadPayments() async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let paymentsTask = paymentService.getTripPayments(tripId: tripId)
            async let summaryTask = paymentService.getBalanceSummary(tripId: tripId)
            async let methodsTask = paymentService.getUserPaymentMethods(
                userId: authViewModel.currentUserId ?? ""
            )
            
            let (payments, summary, methods) = try await (paymentsTask, summaryTask, methodsTask)
            
            self.payments = payments
            self.balanceSummary = summary
            self.userPaymentMethods = methods
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    // MARK: - Create Payment
    func createPayment() async -> Bool {
        guard let userId = authViewModel.currentUserId,
              let userName = authViewModel.user?.displayName else { return false }
        
        guard newPaymentAmount > 0 else {
            errorMessage = "Amount must be greater than zero"
            return false
        }
        
        guard !selectedParticipants.isEmpty else {
            errorMessage = "Select at least one participant"
            return false
        }
        
        isLoading = true
        
        do {
            let payment = try await paymentService.createPayment(
                tripId: tripId,
                createdBy: userId,
                createdByName: userName,
                amount: newPaymentAmount,
                description: newPaymentDescription,
                category: newPaymentCategory,
                splitType: newPaymentSplitType,
                participants: Array(selectedParticipants),
                customAmounts: newPaymentSplitType == .custom ? customAmounts : nil
            )
            
            payments.insert(payment, at: 0)
            resetCreatePaymentForm()
            
            // Reload balance summary
            await loadBalanceSummary()
            
            isLoading = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }
    
    // MARK: - Settle Payment
    func settlePayment(_ payment: PaymentSplit, method: PaymentMethod?) async {
        do {
            try await paymentService.settlePayment(
                paymentId: payment.id,
                settlementMethod: method?.type.rawValue
            )
            
            if let index = payments.firstIndex(where: { $0.id == payment.id }) {
                payments[index].isSettled = true
                payments[index].settledAt = Date()
            }
            
            await loadBalanceSummary()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Payment Methods
    func addPaymentMethod(_ method: PaymentMethod) async {
        guard let userId = authViewModel.currentUserId else { return }
        
        do {
            let savedMethod = try await paymentService.savePaymentMethod(userId: userId, method: method)
            userPaymentMethods.append(savedMethod)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func removePaymentMethod(_ method: PaymentMethod) async {
        do {
            try await paymentService.deletePaymentMethod(methodId: method.id)
            userPaymentMethods.removeAll { $0.id == method.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func setPreferredMethod(_ method: PaymentMethod) async {
        do {
            try await paymentService.setPreferredMethod(methodId: method.id)
            
            for index in userPaymentMethods.indices {
                userPaymentMethods[index].isPreferred = (userPaymentMethods[index].id == method.id)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Helpers
    private func loadBalanceSummary() async {
        do {
            balanceSummary = try await paymentService.getBalanceSummary(tripId: tripId)
        } catch {
            // Non-critical, don't show error
        }
    }
    
    private func resetCreatePaymentForm() {
        newPaymentAmount = 0
        newPaymentDescription = ""
        newPaymentCategory = nil
        newPaymentSplitType = .equal
        selectedParticipants = []
        customAmounts = [:]
        showCreatePayment = false
    }
    
    // MARK: - Computed
    func splitAmountForParticipant(_ participantId: String) -> Decimal {
        switch newPaymentSplitType {
        case .equal:
            guard !selectedParticipants.isEmpty else { return 0 }
            return newPaymentAmount / Decimal(selectedParticipants.count)
        case .custom:
            return customAmounts[participantId] ?? 0
        case .percentage:
            let percentage = customAmounts[participantId] ?? 0
            return newPaymentAmount * (percentage / 100)
        }
    }
}
```

### 2.5 AI Concierge ViewModel

```swift
import Foundation
import SwiftUI

@Observable
@MainActor
final class AIConciergeViewModel {
    // MARK: - State
    var messages: [AIMessage] = []
    var inputText = ""
    var isLoading = false
    var errorMessage: String?
    var queryCount = 0
    var queryLimit: Int = 5  // Free tier default
    var isRateLimited: Bool { queryCount >= queryLimit }
    
    // MARK: - Suggestions
    var suggestions: [AISuggestion] = []
    var showSuggestions = true
    
    // MARK: - Private
    private let tripId: String
    private let aiService: AIService
    private let tripContext: TripContext
    
    init(tripId: String, tripContext: TripContext, aiService: AIService = .shared) {
        self.tripId = tripId
        self.tripContext = tripContext
        self.aiService = aiService
    }
    
    // MARK: - Load Initial State
    func loadInitialState() async {
        await loadQueryCount()
        await loadSuggestions()
    }
    
    // MARK: - Send Query
    func sendQuery() async {
        let query = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return }
        
        if isRateLimited {
            errorMessage = "You've reached your AI query limit. Upgrade for more queries."
            return
        }
        
        // Add user message
        let userMessage = AIMessage(role: .user, content: query)
        messages.append(userMessage)
        inputText = ""
        
        isLoading = true
        showSuggestions = false
        
        do {
            let response = try await aiService.query(
                tripId: tripId,
                query: query,
                context: tripContext
            )
            
            let assistantMessage = AIMessage(
                role: .assistant,
                content: response.response,
                sources: response.sources,
                confidence: response.confidence
            )
            messages.append(assistantMessage)
            
            queryCount += 1
        } catch AIError.rateLimited {
            errorMessage = "You've reached your AI query limit."
        } catch {
            errorMessage = error.localizedDescription
            // Remove user message on error
            messages.removeLast()
        }
        
        isLoading = false
    }
    
    // MARK: - Suggestions
    func selectSuggestion(_ suggestion: AISuggestion) async {
        inputText = suggestionToQuery(suggestion)
        await sendQuery()
    }
    
    // MARK: - Feedback
    func submitFeedback(for message: AIMessage, feedback: AIQuery.AIFeedback) async {
        guard let queryId = message.queryId else { return }
        
        do {
            try await aiService.submitFeedback(queryId: queryId, feedback: feedback)
            
            if let index = messages.firstIndex(where: { $0.id == message.id }) {
                messages[index].feedback = feedback
            }
        } catch {
            // Silent failure for feedback
        }
    }
    
    // MARK: - Clear
    func clearConversation() {
        messages = []
        showSuggestions = true
    }
    
    // MARK: - Private
    private func loadQueryCount() async {
        do {
            let usage = try await aiService.getQueryUsage(tripId: tripId)
            queryCount = usage.count
            queryLimit = usage.limit
        } catch {
            // Use defaults on error
        }
    }
    
    private func loadSuggestions() async {
        do {
            suggestions = try await aiService.getSuggestions(
                tripId: tripId,
                context: tripContext
            )
        } catch {
            // Silent failure for suggestions
        }
    }
    
    private func suggestionToQuery(_ suggestion: AISuggestion) -> String {
        switch suggestion.type {
        case .activity:
            return "What activities do you recommend?"
        case .restaurant:
            return "Where should we eat?"
        case .accommodation:
            return "What hotels are nearby?"
        case .timing:
            return "What's the best time to go?"
        case .route:
            return "What's the best route?"
        }
    }
}

struct AIMessage: Identifiable {
    let id = UUID()
    let role: Role
    var content: String
    var sources: [AISource]?
    var confidence: Double?
    var feedback: AIQuery.AIFeedback?
    var queryId: String?
    let timestamp = Date()
    
    enum Role {
        case user, assistant, system
    }
}

struct TripContext: Codable {
    let tripId: String
    let title: String
    let location: String
    let dateRange: String
    let participants: [String]
    let recentMessages: [String]
    let itineraryItems: [String]
    let savedPlaces: [String]
}
```

---

## 3. NAVIGATION STRUCTURE

### 3.1 Root Navigation

```swift
import SwiftUI

@main
struct ChravelApp: App {
    @State private var authViewModel = AuthViewModel()
    @State private var navigationCoordinator = NavigationCoordinator()
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authViewModel)
                .environment(navigationCoordinator)
        }
    }
}

struct RootView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    
    var body: some View {
        Group {
            if authViewModel.isLoading {
                SplashView()
            } else if authViewModel.isAuthenticated {
                MainTabView()
            } else {
                AuthenticatedFlow()
            }
        }
        .animation(.easeInOut, value: authViewModel.isAuthenticated)
    }
}

@Observable
final class NavigationCoordinator {
    var homeNavPath = NavigationPath()
    var tripDetailNavPath = NavigationPath()
    var selectedTab: Tab = .home
    
    // Deep link handling
    func handleDeepLink(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let host = components.host else { return }
        
        switch host {
        case "trip":
            if let tripId = components.path.split(separator: "/").first {
                navigateToTrip(String(tripId))
            }
        case "event":
            if let eventId = components.path.split(separator: "/").first {
                navigateToEvent(String(eventId))
            }
        case "join":
            if let inviteCode = components.path.split(separator: "/").first {
                navigateToJoinTrip(String(inviteCode))
            }
        default:
            break
        }
    }
    
    func navigateToTrip(_ tripId: String) {
        selectedTab = .home
        homeNavPath.append(TripDestination.detail(tripId))
    }
    
    func navigateToEvent(_ eventId: String) {
        selectedTab = .home
        homeNavPath.append(TripDestination.event(eventId))
    }
    
    func navigateToJoinTrip(_ inviteCode: String) {
        homeNavPath.append(TripDestination.join(inviteCode))
    }
    
    func navigateToSettings() {
        selectedTab = .settings
    }
}

enum Tab: String, CaseIterable {
    case home, profile, settings
    
    var title: String {
        switch self {
        case .home: return "Trips"
        case .profile: return "Profile"
        case .settings: return "Settings"
        }
    }
    
    var icon: String {
        switch self {
        case .home: return "airplane"
        case .profile: return "person.circle"
        case .settings: return "gearshape"
        }
    }
}

enum TripDestination: Hashable {
    case detail(String)
    case proDetail(String)
    case event(String)
    case join(String)
}
```

### 3.2 Main Tab View

```swift
struct MainTabView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    
    var body: some View {
        @Bindable var coordinator = coordinator
        
        TabView(selection: $coordinator.selectedTab) {
            HomeNavigationStack()
                .tabItem {
                    Label(Tab.home.title, systemImage: Tab.home.icon)
                }
                .tag(Tab.home)
            
            ProfileNavigationStack()
                .tabItem {
                    Label(Tab.profile.title, systemImage: Tab.profile.icon)
                }
                .tag(Tab.profile)
            
            SettingsNavigationStack()
                .tabItem {
                    Label(Tab.settings.title, systemImage: Tab.settings.icon)
                }
                .tag(Tab.settings)
        }
        .tint(.orange)
    }
}

struct HomeNavigationStack: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var tripsViewModel: TripsViewModel?
    
    var body: some View {
        @Bindable var coordinator = coordinator
        
        NavigationStack(path: $coordinator.homeNavPath) {
            HomeView()
                .navigationDestination(for: TripDestination.self) { destination in
                    switch destination {
                    case .detail(let tripId):
                        TripDetailView(tripId: tripId)
                    case .proDetail(let tripId):
                        ProTripDetailView(tripId: tripId)
                    case .event(let eventId):
                        EventDetailView(eventId: eventId)
                    case .join(let inviteCode):
                        JoinTripView(inviteCode: inviteCode)
                    }
                }
        }
        .onAppear {
            if tripsViewModel == nil {
                tripsViewModel = TripsViewModel(authViewModel: authViewModel)
            }
        }
        .environment(tripsViewModel)
    }
}
```

### 3.3 Trip Detail Navigation

```swift
struct TripDetailView: View {
    let tripId: String
    
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var selectedTab: TripTab = .chat
    @State private var showTripInfo = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Tab Content
            TabView(selection: $selectedTab) {
                TripChatView(tripId: tripId)
                    .tag(TripTab.chat)
                
                TripMediaView(tripId: tripId)
                    .tag(TripTab.media)
                
                TripPaymentsView(tripId: tripId)
                    .tag(TripTab.pay)
                
                TripCalendarView(tripId: tripId)
                    .tag(TripTab.calendar)
                
                TripAIConciergeView(tripId: tripId)
                    .tag(TripTab.ai)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            
            // Custom Tab Bar
            TripTabBar(selectedTab: $selectedTab)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                TripHeaderView(tripId: tripId)
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showTripInfo = true
                } label: {
                    Image(systemName: "info.circle")
                }
            }
        }
        .sheet(isPresented: $showTripInfo) {
            TripInfoSheet(tripId: tripId)
        }
    }
}

enum TripTab: String, CaseIterable {
    case chat, media, pay, calendar, ai
    
    var title: String {
        switch self {
        case .chat: return "Chat"
        case .media: return "Media"
        case .pay: return "Pay"
        case .calendar: return "Calendar"
        case .ai: return "AI"
        }
    }
    
    var icon: String {
        switch self {
        case .chat: return "bubble.left.and.bubble.right"
        case .media: return "photo.stack"
        case .pay: return "dollarsign.circle"
        case .calendar: return "calendar"
        case .ai: return "sparkles"
        }
    }
}
```

---

## 4. SwiftUI SCREEN BLUEPRINTS

### 4.1 Home Screen

```swift
struct HomeView: View {
    @Environment(TripsViewModel.self) private var viewModel
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(NavigationCoordinator.self) private var coordinator
    
    @State private var showCreateTrip = false
    @State private var showSearch = false
    
    var body: some View {
        @Bindable var viewModel = viewModel
        
        ZStack {
            // Background
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // View Mode Selector
                ViewModeSelector(selectedMode: $viewModel.viewMode)
                    .padding(.horizontal)
                    .padding(.top, 8)
                
                // Stats Overview (collapsed on scroll)
                if !viewModel.searchQuery.isEmpty || viewModel.activeFilter != .all {
                    SearchIndicator(
                        query: viewModel.searchQuery,
                        filter: viewModel.activeFilter,
                        resultCount: viewModel.filteredTrips.count,
                        onClear: { viewModel.searchQuery = ""; viewModel.activeFilter = .all }
                    )
                    .padding(.horizontal)
                } else {
                    TripStatsBar(stats: viewModel.tripStats)
                        .padding(.horizontal)
                }
                
                // Trip Grid
                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 16),
                        GridItem(.flexible(), spacing: 16)
                    ], spacing: 16) {
                        ForEach(currentTrips) { trip in
                            TripCard(trip: trip)
                                .onTapGesture {
                                    navigateToTrip(trip)
                                }
                        }
                    }
                    .padding()
                }
                .refreshable {
                    await viewModel.loadTrips()
                }
            }
            
            // FAB
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    CreateTripFAB {
                        showCreateTrip = true
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Chravel")
        .searchable(text: $viewModel.searchQuery, isPresented: $showSearch)
        .sheet(isPresented: $showCreateTrip) {
            CreateTripSheet()
        }
        .task {
            await viewModel.loadTrips()
        }
    }
    
    private var currentTrips: [Trip] {
        switch viewModel.viewMode {
        case .myTrips: return viewModel.filteredTrips
        case .tripsPro: return viewModel.proTrips
        case .events: return viewModel.events.map { $0 } // Convert if needed
        case .travelRecs: return []
        }
    }
    
    private func navigateToTrip(_ trip: Trip) {
        switch trip.tripType {
        case .consumer:
            coordinator.homeNavPath.append(TripDestination.detail(trip.id))
        case .pro:
            coordinator.homeNavPath.append(TripDestination.proDetail(trip.id))
        case .event:
            coordinator.homeNavPath.append(TripDestination.event(trip.id))
        }
    }
}
```

### 4.2 Trip Chat Screen

```swift
struct TripChatView: View {
    let tripId: String
    
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var viewModel: ChatViewModel?
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        Group {
            if let viewModel = viewModel {
                ChatContentView(viewModel: viewModel, isInputFocused: _isInputFocused)
            } else {
                ProgressView()
            }
        }
        .onAppear {
            if viewModel == nil {
                viewModel = ChatViewModel(tripId: tripId, authViewModel: authViewModel)
            }
        }
        .task {
            await viewModel?.onAppear()
        }
        .onDisappear {
            viewModel?.onDisappear()
        }
    }
}

struct ChatContentView: View {
    @Bindable var viewModel: ChatViewModel
    @FocusState var isInputFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Messages List
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(
                                message: message,
                                isOwnMessage: message.senderId == viewModel.authViewModel.currentUserId,
                                onReply: { viewModel.startReply(to: message) },
                                onEdit: { viewModel.startEditing(message) },
                                onDelete: { Task { await viewModel.deleteMessage(message) } }
                            )
                            .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    if let lastId = viewModel.messages.last?.id {
                        withAnimation {
                            proxy.scrollTo(lastId, anchor: .bottom)
                        }
                    }
                }
            }
            
            // Reply Preview
            if let replyingTo = viewModel.replyingTo {
                ReplyPreview(message: replyingTo) {
                    viewModel.cancelReply()
                }
            }
            
            // Attachments Preview
            if !viewModel.pendingAttachments.isEmpty {
                AttachmentsPreview(
                    attachments: viewModel.pendingAttachments,
                    onRemove: { viewModel.removeAttachment($0) }
                )
            }
            
            // Input Bar
            MessageInputBar(
                text: $viewModel.draftMessage,
                isEditing: viewModel.editingMessage != nil,
                isSending: viewModel.isSending,
                onSend: { Task { await viewModel.sendMessage() } },
                onAttachment: { /* Show attachment picker */ },
                onCancelEdit: { viewModel.cancelEdit() }
            )
            .focused($isInputFocused)
        }
    }
}
```

---

## 5. BACKEND SPECIFICATION (Supabase)

### 5.1 Supabase Manager

```swift
import Foundation
import Supabase

final class SupabaseManager {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    private init() {
        guard let url = URL(string: Configuration.supabaseURL),
              !Configuration.supabaseAnonKey.isEmpty else {
            fatalError("Invalid Supabase configuration")
        }
        
        client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: Configuration.supabaseAnonKey,
            options: .init(
                auth: .init(
                    storage: KeychainStorage(),
                    flowType: .pkce
                ),
                global: .init(
                    logger: SupabaseLogger()
                )
            )
        )
    }
}

enum Configuration {
    static let supabaseURL = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? ""
    static let supabaseAnonKey = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String ?? ""
    static let googleMapsAPIKey = Bundle.main.infoDictionary?["GOOGLE_MAPS_API_KEY"] as? String ?? ""
}
```

### 5.2 Service Layer

```swift
// TripService.swift
actor TripService {
    static let shared = TripService()
    
    private let supabase = SupabaseManager.shared.client
    
    func getUserTrips(userId: String) async throws -> [Trip] {
        let response: [TripDTO] = try await supabase
            .from("trips")
            .select()
            .eq("created_by", value: userId)
            .eq("is_archived", value: false)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response.map { $0.toTrip() }
    }
    
    func createTrip(_ request: CreateTripRequest) async throws -> Trip {
        // Call edge function for validation
        let response: CreateTripResponse = try await supabase.functions
            .invoke(
                "create-trip",
                options: .init(body: request)
            )
        
        guard response.success, let trip = response.trip else {
            throw TripError.creationFailed(response.error ?? "Unknown error")
        }
        
        return trip
    }
    
    func archiveTrip(tripId: String) async throws {
        try await supabase
            .from("trips")
            .update(["is_archived": true])
            .eq("id", value: tripId)
            .execute()
    }
}

// ChatService.swift
actor ChatService {
    static let shared = ChatService()
    
    private let supabase = SupabaseManager.shared.client
    
    func getMessages(tripId: String) async throws -> [ChatMessage] {
        let response: [ChatMessageDTO] = try await supabase
            .from("trip_chat_messages")
            .select()
            .eq("trip_id", value: tripId)
            .order("created_at", ascending: true)
            .execute()
            .value
        
        return response.map { $0.toChatMessage() }
    }
    
    func sendMessage(
        tripId: String,
        content: String,
        attachments: [MessageAttachment],
        replyToId: String?
    ) async throws -> ChatMessage {
        let insert = ChatMessageInsert(
            tripId: tripId,
            senderId: try await getCurrentUserId(),
            content: content,
            attachments: attachments,
            replyToId: replyToId
        )
        
        let response: ChatMessageDTO = try await supabase
            .from("trip_chat_messages")
            .insert(insert)
            .select()
            .single()
            .execute()
            .value
        
        return response.toChatMessage()
    }
    
    func subscribeToMessages(
        tripId: String,
        onMessage: @escaping (ChatMessage) -> Void
    ) -> RealtimeChannelProtocol {
        let channel = supabase.channel("chat:\(tripId)")
        
        channel.onPostgresChange(
            InsertAction.self,
            schema: "public",
            table: "trip_chat_messages",
            filter: "trip_id=eq.\(tripId)"
        ) { insert in
            if let message = try? insert.record.decode(ChatMessageDTO.self) {
                onMessage(message.toChatMessage())
            }
        }
        
        Task {
            await channel.subscribe()
        }
        
        return channel
    }
    
    func editMessage(messageId: String, content: String) async throws {
        try await supabase
            .from("trip_chat_messages")
            .update([
                "content": content,
                "is_edited": true,
                "edited_at": ISO8601DateFormatter().string(from: Date())
            ])
            .eq("id", value: messageId)
            .execute()
    }
    
    func deleteMessage(messageId: String) async throws {
        try await supabase
            .from("trip_chat_messages")
            .update([
                "is_deleted": true,
                "deleted_at": ISO8601DateFormatter().string(from: Date()),
                "content": "[Message deleted]"
            ])
            .eq("id", value: messageId)
            .execute()
    }
    
    private func getCurrentUserId() async throws -> String {
        guard let user = try await supabase.auth.session?.user else {
            throw AuthError.notAuthenticated
        }
        return user.id.uuidString
    }
}
```

---

## 6. API REDESIGN (Native Supabase)

### 6.1 DTO Mappings

```swift
// DTOs for Supabase responses
struct TripDTO: Codable {
    let id: String
    let name: String
    let description: String?
    let start_date: String?
    let end_date: String?
    let destination: String?
    let cover_image_url: String?
    let created_by: String
    let created_at: String
    let updated_at: String
    let is_archived: Bool
    let trip_type: String
    let basecamp_name: String?
    let basecamp_address: String?
    let enabled_features: [String]?
    let privacy_mode: String?
    let ai_access_enabled: Bool?
    
    func toTrip() -> Trip {
        Trip(
            id: id,
            name: name,
            description: description,
            startDate: start_date.flatMap { ISO8601DateFormatter().date(from: $0) },
            endDate: end_date.flatMap { ISO8601DateFormatter().date(from: $0) },
            destination: destination,
            coverImageURL: cover_image_url.flatMap { URL(string: $0) },
            createdBy: created_by,
            createdAt: ISO8601DateFormatter().date(from: created_at) ?? Date(),
            updatedAt: ISO8601DateFormatter().date(from: updated_at) ?? Date(),
            isArchived: is_archived,
            tripType: TripType(rawValue: trip_type) ?? .consumer,
            basecampName: basecamp_name,
            basecampAddress: basecamp_address,
            enabledFeatures: Set((enabled_features ?? []).compactMap { TripFeature(rawValue: $0) }),
            privacyMode: PrivacyMode(rawValue: privacy_mode ?? "standard") ?? .standard,
            aiAccessEnabled: ai_access_enabled ?? true
        )
    }
}

struct ChatMessageDTO: Codable {
    let id: String
    let trip_id: String
    let sender_id: String
    let content: String
    let author_name: String?
    let message_type: String?
    let reply_to_id: String?
    let thread_id: String?
    let is_edited: Bool?
    let edited_at: String?
    let is_deleted: Bool?
    let deleted_at: String?
    let attachments: [AttachmentDTO]?
    let media_type: String?
    let media_url: String?
    let privacy_mode: String?
    let created_at: String
    let updated_at: String?
    
    func toChatMessage() -> ChatMessage {
        ChatMessage(
            id: id,
            tripId: trip_id,
            senderId: sender_id,
            content: content,
            authorName: author_name,
            messageType: MessageType(rawValue: message_type ?? "text") ?? .text,
            replyToId: reply_to_id,
            threadId: thread_id,
            isEdited: is_edited ?? false,
            editedAt: edited_at.flatMap { ISO8601DateFormatter().date(from: $0) },
            isDeleted: is_deleted ?? false,
            deletedAt: deleted_at.flatMap { ISO8601DateFormatter().date(from: $0) },
            attachments: (attachments ?? []).map { $0.toAttachment() },
            mediaType: media_type.flatMap { MediaType(rawValue: $0) },
            mediaURL: media_url.flatMap { URL(string: $0) },
            privacyMode: PrivacyMode(rawValue: privacy_mode ?? "standard") ?? .standard,
            createdAt: ISO8601DateFormatter().date(from: created_at) ?? Date(),
            updatedAt: ISO8601DateFormatter().date(from: updated_at ?? created_at) ?? Date()
        )
    }
}

struct AttachmentDTO: Codable {
    let type: String
    let url: String
    let name: String?
    let size: Int64?
    
    func toAttachment() -> MessageAttachment {
        MessageAttachment(
            id: UUID().uuidString,
            type: MessageAttachment.AttachmentType(rawValue: type) ?? .file,
            url: URL(string: url)!,
            filename: name,
            size: size
        )
    }
}
```

---

=== SWIFT-SPEC END ===
