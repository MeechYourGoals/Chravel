// Models.swift
// Chravel iOS - CORRECTED Data Models
// All models use Codable with snake_case mapping

import Foundation
import SwiftUI

// MARK: - Trip Model

struct Trip: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var description: String?
    var destination: String?
    var coverImageUrl: String?
    var startDate: Date?
    var endDate: Date?
    var status: TripStatus
    var tripType: TripType
    let creatorId: String
    let createdAt: Date
    var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, destination, status
        case coverImageUrl = "cover_image_url"
        case startDate = "start_date"
        case endDate = "end_date"
        case tripType = "trip_type"
        case creatorId = "creator_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    // Hashable conformance for NavigationStack
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Trip, rhs: Trip) -> Bool {
        lhs.id == rhs.id
    }
}

enum TripStatus: String, Codable {
    case draft, active, completed, archived, cancelled
}

enum TripType: String, Codable, CaseIterable {
    case consumer, pro, event
    
    var displayName: String {
        switch self {
        case .consumer: return "Trip"
        case .pro: return "Pro"
        case .event: return "Event"
        }
    }
}

// MARK: - Chat Message Model

struct ChatMessage: Identifiable, Codable {
    let id: String
    let tripId: String
    let senderId: String
    let content: String
    let messageType: MessageType
    var attachments: [MessageAttachment]?
    var isEdited: Bool
    var deletedAt: Date?
    let createdAt: Date
    
    // Nested profile from join
    var senderProfile: SenderProfile?
    
    enum CodingKeys: String, CodingKey {
        case id, content, attachments
        case tripId = "trip_id"
        case senderId = "sender_id"
        case messageType = "message_type"
        case isEdited = "is_edited"
        case deletedAt = "deleted_at"
        case createdAt = "created_at"
        case senderProfile = "profiles"
    }
}

struct SenderProfile: Codable {
    let id: String
    let displayName: String
    var avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
    }
}

enum MessageType: String, Codable {
    case text, image, file, link, poll, payment, location, system, broadcast
}

struct MessageAttachment: Identifiable, Codable {
    var id: String { url }
    let type: AttachmentType
    let url: String
    var name: String?
    var size: Int?
    var mimeType: String?
    var thumbnailUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case type, url, name, size
        case mimeType = "mime_type"
        case thumbnailUrl = "thumbnail_url"
    }
}

enum AttachmentType: String, Codable {
    case image, video, audio, document, pdf, link
}

// MARK: - Trip Member Model

struct TripMember: Identifiable, Codable {
    let id: String
    let tripId: String
    let userId: String
    var role: String?
    var profile: MemberProfile?
    let joinedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, role
        case tripId = "trip_id"
        case userId = "user_id"
        case profile = "profiles"
        case joinedAt = "joined_at"
    }
}

struct MemberProfile: Codable {
    let id: String
    let displayName: String
    var avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
    }
}

// MARK: - Payment Models

struct PaymentMessage: Identifiable, Codable {
    let id: String
    let tripId: String
    let payerId: String
    var payerName: String?
    let amount: Double
    let description: String
    var category: String?
    var splitType: String?
    var isSettled: Bool
    let createdAt: Date
    var settledAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id, amount, description, category
        case tripId = "trip_id"
        case payerId = "payer_id"
        case payerName = "payer_name"
        case splitType = "split_type"
        case isSettled = "is_settled"
        case createdAt = "created_at"
        case settledAt = "settled_at"
    }
}

struct PaymentSummary: Codable {
    var totalSpent: Double
    var yourTotal: Double
    var yourShare: Double
    var balances: [MemberBalance]
    var settlements: [SettlementSuggestion]
    
    enum CodingKeys: String, CodingKey {
        case balances, settlements
        case totalSpent = "total_spent"
        case yourTotal = "your_total"
        case yourShare = "your_share"
    }
}

struct MemberBalance: Identifiable, Codable {
    let id: String
    let userId: String
    var userName: String?
    var avatarUrl: String?
    let paid: Double
    let owes: Double
    
    var balance: Double { paid - owes }
    
    enum CodingKeys: String, CodingKey {
        case id, paid, owes
        case userId = "user_id"
        case userName = "user_name"
        case avatarUrl = "avatar_url"
    }
}

struct SettlementSuggestion: Identifiable, Codable {
    let id: String
    let fromUserId: String
    var fromUserName: String?
    let toUserId: String
    var toUserName: String?
    let amount: Double
    
    enum CodingKeys: String, CodingKey {
        case id, amount
        case fromUserId = "from_user_id"
        case fromUserName = "from_user_name"
        case toUserId = "to_user_id"
        case toUserName = "to_user_name"
    }
}

// MARK: - Place Model

struct PlaceData: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    var googlePlaceId: String?
    var address: String?
    var latitude: Double?
    var longitude: Double?
    var types: [String]?
    var rating: Double?
    var userRatingsTotal: Int?
    var priceLevel: Int?
    var photoUrl: String?
    var phoneNumber: String?
    var websiteUrl: String?
    var openingHours: [String]?
    
    enum CodingKeys: String, CodingKey {
        case id, name, address, latitude, longitude, types, rating
        case googlePlaceId = "google_place_id"
        case userRatingsTotal = "user_ratings_total"
        case priceLevel = "price_level"
        case photoUrl = "photo_url"
        case phoneNumber = "phone_number"
        case websiteUrl = "website_url"
        case openingHours = "opening_hours"
    }
}

// MARK: - Task Model

struct TripTask: Identifiable, Codable {
    let id: String
    let tripId: String
    var title: String
    var description: String?
    var status: TaskStatus
    var assigneeId: String?
    var assignee: MemberProfile?
    var dueDate: Date?
    var priority: TaskPriority
    let createdBy: String
    let createdAt: Date
    var completedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description, status, assignee, priority
        case tripId = "trip_id"
        case assigneeId = "assignee_id"
        case dueDate = "due_date"
        case createdBy = "created_by"
        case createdAt = "created_at"
        case completedAt = "completed_at"
    }
}

enum TaskStatus: String, Codable {
    case pending
    case inProgress = "in_progress"
    case completed
    case cancelled
}

enum TaskPriority: String, Codable, CaseIterable {
    case low, medium, high
    
    var color: Color {
        switch self {
        case .low: return .gray
        case .medium: return .orange
        case .high: return .red
        }
    }
}

// MARK: - Poll Model

struct Poll: Identifiable, Codable {
    let id: String
    let tripId: String
    let messageId: String?
    var question: String
    var options: [PollOption]
    var isMultipleChoice: Bool
    var expiresAt: Date?
    var isClosed: Bool
    let createdBy: String
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, question, options
        case tripId = "trip_id"
        case messageId = "message_id"
        case isMultipleChoice = "is_multiple_choice"
        case expiresAt = "expires_at"
        case isClosed = "is_closed"
        case createdBy = "created_by"
        case createdAt = "created_at"
    }
}

struct PollOption: Identifiable, Codable {
    let id: String
    var text: String
    var votes: Int
    var voters: [String]?
}

// MARK: - Media Item Model

struct MediaItem: Identifiable, Codable {
    let id: String
    let tripId: String
    var uploaderId: String
    var uploaderProfile: MemberProfile?
    let url: String
    var thumbnailUrl: String?
    let mediaType: MediaType
    var caption: String?
    var takenAt: Date?
    var tags: [String]?
    let uploadedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, url, caption, tags
        case tripId = "trip_id"
        case uploaderId = "uploader_id"
        case uploaderProfile = "uploader_profile"
        case thumbnailUrl = "thumbnail_url"
        case mediaType = "media_type"
        case takenAt = "taken_at"
        case uploadedAt = "uploaded_at"
    }
}

enum MediaType: String, Codable {
    case photo, video, document
}

// MARK: - Itinerary Item Model

struct ItineraryItem: Identifiable, Codable {
    let id: String
    let tripId: String
    var title: String
    var description: String?
    var location: String?
    var placeId: String?
    var startTime: Date
    var endTime: Date?
    var allDay: Bool
    var category: ItineraryCategory?
    var confirmationNumber: String?
    var notes: String?
    let createdBy: String
    let createdAt: Date
    var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, title, description, location, notes, category
        case tripId = "trip_id"
        case placeId = "place_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case allDay = "all_day"
        case confirmationNumber = "confirmation_number"
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum ItineraryCategory: String, Codable, CaseIterable {
    case flight, hotel, transport, activity, restaurant, meeting, other
    
    var icon: String {
        switch self {
        case .flight: return "airplane"
        case .hotel: return "bed.double"
        case .transport: return "car"
        case .activity: return "star"
        case .restaurant: return "fork.knife"
        case .meeting: return "person.2"
        case .other: return "calendar"
        }
    }
    
    var color: Color {
        switch self {
        case .flight: return .blue
        case .hotel: return .purple
        case .transport: return .green
        case .activity: return .orange
        case .restaurant: return .red
        case .meeting: return .cyan
        case .other: return .gray
        }
    }
}

// MARK: - Notification Model

struct AppNotification: Identifiable, Codable {
    let id: String
    let userId: String
    var tripId: String?
    let type: NotificationType
    let title: String
    let body: String
    var data: [String: String]?
    var isRead: Bool
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, type, title, body, data
        case userId = "user_id"
        case tripId = "trip_id"
        case isRead = "is_read"
        case createdAt = "created_at"
    }
}

enum NotificationType: String, Codable {
    case chatMessage = "chat_message"
    case mention
    case taskAssigned = "task_assigned"
    case paymentRequest = "payment_request"
    case tripInvite = "trip_invite"
    case itineraryUpdate = "itinerary_update"
    case pollCreated = "poll_created"
    case reminder
    case broadcast
    case system
}
