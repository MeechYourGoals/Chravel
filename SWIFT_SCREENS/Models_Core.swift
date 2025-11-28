=== MODELS: Core START ===

// Models_Core.swift
// Chravel iOS - Core Data Models

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
    
    // Computed properties from joins
    var memberCount: Int?
    var messageCount: Int?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case destination
        case coverImageUrl = "cover_image_url"
        case startDate = "start_date"
        case endDate = "end_date"
        case status
        case tripType = "trip_type"
        case creatorId = "creator_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case memberCount = "member_count"
        case messageCount = "message_count"
    }
    
    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Trip, rhs: Trip) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Trip Status

enum TripStatus: String, Codable {
    case draft
    case active
    case completed
    case archived
    case cancelled
}

// MARK: - Chat Message Model

struct ChatMessage: Identifiable, Codable {
    let id: String
    let tripId: String
    let senderId: String
    var senderProfile: MessageSenderProfile?
    let content: String
    let messageType: MessageType
    var attachments: [MessageAttachment]?
    var reactions: [MessageReaction]?
    var mentions: [MessageMention]?
    var replyToId: String?
    var isEdited: Bool
    var deletedAt: Date?
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case senderId = "sender_id"
        case senderProfile = "profiles"
        case content
        case messageType = "message_type"
        case attachments
        case reactions
        case mentions
        case replyToId = "reply_to_id"
        case isEdited = "is_edited"
        case deletedAt = "deleted_at"
        case createdAt = "created_at"
    }
}

struct MessageSenderProfile: Codable {
    let id: String
    let displayName: String
    var avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
    }
}

// MARK: - Message Type

enum MessageType: String, Codable {
    case text
    case image
    case file
    case link
    case poll
    case payment
    case location
    case system
    case broadcast
}

// MARK: - Message Attachment

struct MessageAttachment: Identifiable, Codable {
    var id: String { url }
    let type: AttachmentType
    let url: String
    var name: String?
    var size: Int?
    var mimeType: String?
    var thumbnailUrl: String?
    var metadata: [String: String]?
    
    enum CodingKeys: String, CodingKey {
        case type
        case url
        case name
        case size
        case mimeType = "mime_type"
        case thumbnailUrl = "thumbnail_url"
        case metadata
    }
}

enum AttachmentType: String, Codable {
    case image
    case video
    case audio
    case document
    case pdf
    case link
}

// MARK: - Message Reaction

struct MessageReaction: Identifiable, Codable {
    var id: String { "\(userId)-\(emoji)" }
    let userId: String
    let emoji: String
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case emoji
        case createdAt = "created_at"
    }
}

// MARK: - Message Mention

struct MessageMention: Identifiable, Codable {
    var id: String { "\(userId)-\(String(startIndex))" }
    let userId: String
    let startIndex: Int
    let endIndex: Int
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case startIndex = "start_index"
        case endIndex = "end_index"
    }
}

// MARK: - Itinerary Item

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
    var attachments: [MessageAttachment]?
    var createdBy: String
    let createdAt: Date
    var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case title
        case description
        case location
        case placeId = "place_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case allDay = "all_day"
        case category
        case confirmationNumber = "confirmation_number"
        case notes
        case attachments
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum ItineraryCategory: String, Codable, CaseIterable {
    case flight
    case hotel
    case transport
    case activity
    case restaurant
    case meeting
    case other
    
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
    var createdBy: String
    let createdAt: Date
    var completedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case title
        case description
        case status
        case assigneeId = "assignee_id"
        case assignee
        case dueDate = "due_date"
        case priority
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
    case low
    case medium
    case high
    
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
        case id
        case tripId = "trip_id"
        case messageId = "message_id"
        case question
        case options
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
    
    var votePercentage: Double {
        guard let voters, !voters.isEmpty else { return 0 }
        return Double(voters.count) // This should be calculated relative to total votes
    }
}

// MARK: - Media Item

struct MediaItem: Identifiable, Codable {
    let id: String
    let tripId: String
    var uploaderId: String
    var uploaderProfile: MemberProfile?
    let url: String
    var thumbnailUrl: String?
    let mediaType: MediaType
    var caption: String?
    var location: MediaLocation?
    var takenAt: Date?
    var tags: [String]?
    let uploadedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case uploaderId = "uploader_id"
        case uploaderProfile = "uploader_profile"
        case url
        case thumbnailUrl = "thumbnail_url"
        case mediaType = "media_type"
        case caption
        case location
        case takenAt = "taken_at"
        case tags
        case uploadedAt = "uploaded_at"
    }
}

enum MediaType: String, Codable {
    case photo
    case video
    case document
}

struct MediaLocation: Codable {
    let latitude: Double
    let longitude: Double
    var name: String?
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
        case id
        case userId = "user_id"
        case tripId = "trip_id"
        case type
        case title
        case body
        case data
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

// MARK: - Broadcast Model (Pro Feature)

struct Broadcast: Identifiable, Codable {
    let id: String
    let tripId: String
    var organizationId: String?
    let senderId: String
    var senderProfile: MemberProfile?
    let title: String
    let content: String
    var priority: BroadcastPriority
    var targetRoles: [String]?
    var scheduledFor: Date?
    var sentAt: Date?
    var reactions: [BroadcastReaction]?
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case organizationId = "organization_id"
        case senderId = "sender_id"
        case senderProfile = "sender_profile"
        case title
        case content
        case priority
        case targetRoles = "target_roles"
        case scheduledFor = "scheduled_for"
        case sentAt = "sent_at"
        case reactions
        case createdAt = "created_at"
    }
}

enum BroadcastPriority: String, Codable {
    case low
    case normal
    case high
    case urgent
    
    var color: Color {
        switch self {
        case .low: return .gray
        case .normal: return .blue
        case .high: return .orange
        case .urgent: return .red
        }
    }
}

struct BroadcastReaction: Identifiable, Codable {
    var id: String { "\(userId)-\(reaction)" }
    let userId: String
    let reaction: String // "ack", "like", "question"
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case reaction
        case createdAt = "created_at"
    }
}

=== MODELS: Core END ===
