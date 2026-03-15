import Foundation

// MARK: - App Group Constants

enum ChravelAppGroup {
    static let identifier = "group.com.chravel.app"

    static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier)
    }

    static var pendingSharesURL: URL? {
        containerURL?.appendingPathComponent("pending_shares", isDirectory: true)
    }
}

// MARK: - Share Destination

enum ShareDestination: String, Codable, CaseIterable, Identifiable {
    case exploreLinks = "explore_links"
    case chat = "chat"
    case tasks = "tasks"
    case calendar = "calendar"
    case concierge = "concierge"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .exploreLinks: return "Explore Links"
        case .chat: return "Chat"
        case .tasks: return "Tasks"
        case .calendar: return "Calendar"
        case .concierge: return "Concierge"
        }
    }

    var iconName: String {
        switch self {
        case .exploreLinks: return "link"
        case .chat: return "bubble.left.and.bubble.right"
        case .tasks: return "checklist"
        case .calendar: return "calendar"
        case .concierge: return "sparkles"
        }
    }
}

// MARK: - Content Type

enum SharedContentType: String, Codable {
    case url
    case plainText = "plain_text"
    case richText = "rich_text"
    case image
    case pdf
    case file
    case multiple
}

// MARK: - Routing Confidence

enum RoutingConfidence: String, Codable, Comparable {
    case high
    case medium
    case low

    private var sortOrder: Int {
        switch self {
        case .high: return 2
        case .medium: return 1
        case .low: return 0
        }
    }

    static func < (lhs: RoutingConfidence, rhs: RoutingConfidence) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }
}

// MARK: - Ingestion Status

enum IngestionStatus: String, Codable {
    case pending
    case queued
    case uploading
    case processing
    case completed
    case failed
}

// MARK: - Shared Content Attachment

struct SharedContentAttachment: Codable, Identifiable {
    let id: String
    let contentType: SharedContentType
    let fileName: String?
    let mimeType: String?
    let fileSize: Int64?
    /// Relative path within App Group container (for files saved locally)
    var localRelativePath: String?
    /// Base64 data for small payloads (< 256KB)
    var inlineData: String?
    /// Preview thumbnail as base64 (< 64KB JPEG)
    var thumbnailData: String?

    init(
        id: String = UUID().uuidString,
        contentType: SharedContentType,
        fileName: String? = nil,
        mimeType: String? = nil,
        fileSize: Int64? = nil,
        localRelativePath: String? = nil,
        inlineData: String? = nil,
        thumbnailData: String? = nil
    ) {
        self.id = id
        self.contentType = contentType
        self.fileName = fileName
        self.mimeType = mimeType
        self.fileSize = fileSize
        self.localRelativePath = localRelativePath
        self.inlineData = inlineData
        self.thumbnailData = thumbnailData
    }
}

// MARK: - Share Routing Decision

struct ShareRoutingDecision: Codable {
    let suggestedDestination: ShareDestination
    let confidence: RoutingConfidence
    let reason: String
    let alternativeDestinations: [ShareDestination]
}

// MARK: - Shared Inbound Item

struct SharedInboundItem: Codable, Identifiable {
    let id: String
    let createdAt: Date
    var sourceAppIdentifier: String?
    var contentType: SharedContentType
    var normalizedURL: String?
    var normalizedText: String?
    var previewTitle: String?
    var previewSubtitle: String?
    var attachments: [SharedContentAttachment]
    var selectedTripId: String?
    var selectedDestination: ShareDestination?
    var routingDecision: ShareRoutingDecision?
    var userNote: String?
    var ingestionStatus: IngestionStatus
    var dedupeFingerprint: String?
    var errorMessage: String?

    init(
        id: String = UUID().uuidString,
        sourceAppIdentifier: String? = nil,
        contentType: SharedContentType = .plainText,
        normalizedURL: String? = nil,
        normalizedText: String? = nil,
        previewTitle: String? = nil,
        previewSubtitle: String? = nil,
        attachments: [SharedContentAttachment] = [],
        selectedTripId: String? = nil,
        selectedDestination: ShareDestination? = nil,
        routingDecision: ShareRoutingDecision? = nil,
        userNote: String? = nil,
        dedupeFingerprint: String? = nil
    ) {
        self.id = id
        self.createdAt = Date()
        self.sourceAppIdentifier = sourceAppIdentifier
        self.contentType = contentType
        self.normalizedURL = normalizedURL
        self.normalizedText = normalizedText
        self.previewTitle = previewTitle
        self.previewSubtitle = previewSubtitle
        self.attachments = attachments
        self.selectedTripId = selectedTripId
        self.selectedDestination = selectedDestination
        self.routingDecision = routingDecision
        self.userNote = userNote
        self.ingestionStatus = .pending
        self.dedupeFingerprint = dedupeFingerprint
    }
}
