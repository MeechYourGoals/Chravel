// TripDetailViewModel.swift
// Chravel iOS - Trip Detail ViewModel

import Foundation
import SwiftUI

// MARK: - Trip Detail ViewModel

@Observable
final class TripDetailViewModel {
    // MARK: - Properties
    let tripId: String
    
    var trip: Trip?
    var members: [TripMember] = []
    var places: [PlaceData] = []
    
    var isLoading: Bool = false
    var errorMessage: String?
    
    // Child ViewModels
    let chatViewModel: ChatViewModel
    
    // MARK: - Init
    
    init(tripId: String) {
        self.tripId = tripId
        self.chatViewModel = ChatViewModel(tripId: tripId)
    }
    
    // MARK: - API Methods
    
    @MainActor
    func loadTrip() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Load trip details, members, and places in parallel
            async let tripResult = TripDetailService.shared.getTrip(tripId: tripId)
            async let membersResult = TripDetailService.shared.getTripMembers(tripId: tripId)
            async let placesResult = TripDetailService.shared.getTripPlaces(tripId: tripId)
            
            let (tripData, membersData, placesData) = try await (tripResult, membersResult, placesResult)
            
            self.trip = tripData
            self.members = membersData
            self.places = placesData
            
            // Also pass trip context to chat
            chatViewModel.tripName = tripData.name
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    @MainActor
    func updateTrip(_ updates: TripUpdate) async -> Bool {
        guard var currentTrip = trip else { return false }
        
        do {
            let updatedTrip = try await TripDetailService.shared.updateTrip(
                tripId: tripId,
                updates: updates
            )
            
            self.trip = updatedTrip
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    @MainActor
    func addPlace(_ place: PlaceData) {
        places.append(place)
        
        Task {
            do {
                try await TripDetailService.shared.addPlace(tripId: tripId, place: place)
            } catch {
                // Rollback on error
                places.removeAll { $0.id == place.id }
                errorMessage = error.localizedDescription
            }
        }
    }
    
    @MainActor
    func removePlace(_ placeId: String) async -> Bool {
        guard let index = places.firstIndex(where: { $0.id == placeId }) else {
            return false
        }
        
        let removedPlace = places[index]
        places.remove(at: index)
        
        do {
            try await TripDetailService.shared.removePlace(tripId: tripId, placeId: placeId)
            return true
        } catch {
            // Rollback on error
            places.insert(removedPlace, at: index)
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    @MainActor
    func inviteMember(email: String) async -> Bool {
        do {
            try await TripDetailService.shared.inviteMember(tripId: tripId, email: email)
            // Reload members to get updated list
            members = try await TripDetailService.shared.getTripMembers(tripId: tripId)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    @MainActor
    func removeMember(_ memberId: String) async -> Bool {
        guard let index = members.firstIndex(where: { $0.id == memberId }) else {
            return false
        }
        
        let removedMember = members[index]
        members.remove(at: index)
        
        do {
            try await TripDetailService.shared.removeMember(tripId: tripId, memberId: memberId)
            return true
        } catch {
            // Rollback on error
            members.insert(removedMember, at: index)
            errorMessage = error.localizedDescription
            return false
        }
    }
}

// MARK: - Trip Update Model

struct TripUpdate: Codable {
    var name: String?
    var description: String?
    var destination: String?
    var startDate: Date?
    var endDate: Date?
    var coverImageUrl: String?
    var status: TripStatus?
}

// MARK: - Trip Detail Service

final class TripDetailService {
    static let shared = TripDetailService()
    
    private init() {}
    
    func getTrip(tripId: String) async throws -> Trip {
        let response = try await SupabaseClient.shared.database
            .from("trips")
            .select("*")
            .eq("id", value: tripId)
            .single()
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode(Trip.self, from: response.data)
    }
    
    func getTripMembers(tripId: String) async throws -> [TripMember] {
        let response = try await SupabaseClient.shared.database
            .from("trip_members")
            .select("""
                *,
                profiles(id, display_name, avatar_url)
            """)
            .eq("trip_id", value: tripId)
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode([TripMember].self, from: response.data)
    }
    
    func getTripPlaces(tripId: String) async throws -> [PlaceData] {
        let response = try await SupabaseClient.shared.database
            .from("trip_places")
            .select("*")
            .eq("trip_id", value: tripId)
            .order("created_at", ascending: true)
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode([PlaceData].self, from: response.data)
    }
    
    func updateTrip(tripId: String, updates: TripUpdate) async throws -> Trip {
        var updateDict: [String: Any] = [:]
        
        if let name = updates.name { updateDict["name"] = name }
        if let description = updates.description { updateDict["description"] = description }
        if let destination = updates.destination { updateDict["destination"] = destination }
        if let startDate = updates.startDate { updateDict["start_date"] = startDate.iso8601String }
        if let endDate = updates.endDate { updateDict["end_date"] = endDate.iso8601String }
        if let coverImageUrl = updates.coverImageUrl { updateDict["cover_image_url"] = coverImageUrl }
        if let status = updates.status { updateDict["status"] = status.rawValue }
        
        updateDict["updated_at"] = Date().iso8601String
        
        let response = try await SupabaseClient.shared.database
            .from("trips")
            .update(updateDict)
            .eq("id", value: tripId)
            .select()
            .single()
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode(Trip.self, from: response.data)
    }
    
    func addPlace(tripId: String, place: PlaceData) async throws {
        let insertData: [String: Any] = [
            "trip_id": tripId,
            "place_id": place.googlePlaceId ?? place.id,
            "name": place.name,
            "address": place.address ?? "",
            "latitude": place.latitude ?? 0,
            "longitude": place.longitude ?? 0,
            "place_types": place.types ?? [],
            "metadata": place.metadata ?? [:]
        ]
        
        try await SupabaseClient.shared.database
            .from("trip_places")
            .insert(insertData)
            .execute()
    }
    
    func removePlace(tripId: String, placeId: String) async throws {
        try await SupabaseClient.shared.database
            .from("trip_places")
            .delete()
            .eq("trip_id", value: tripId)
            .eq("id", value: placeId)
            .execute()
    }
    
    func inviteMember(tripId: String, email: String) async throws {
        // Call edge function to handle invite with notification
        let payload: [String: Any] = [
            "trip_id": tripId,
            "email": email
        ]
        
        _ = try await SupabaseClient.shared.functions
            .invoke("invite-trip-member", options: .init(body: payload))
    }
    
    func removeMember(tripId: String, memberId: String) async throws {
        try await SupabaseClient.shared.database
            .from("trip_members")
            .delete()
            .eq("trip_id", value: tripId)
            .eq("user_id", value: memberId)
            .execute()
    }
}

// MARK: - Chat ViewModel

@Observable
final class ChatViewModel {
    // MARK: - Properties
    let tripId: String
    var tripName: String = ""
    
    var messages: [ChatMessage] = []
    var draftMessage: String = ""
    var showAttachmentPicker: Bool = false
    
    var isLoading: Bool = false
    var isSending: Bool = false
    var errorMessage: String?
    
    private var currentUserId: String?
    private var realtimeChannel: Any? // Supabase RealtimeChannel
    
    // MARK: - Init
    
    init(tripId: String) {
        self.tripId = tripId
        self.currentUserId = SupabaseClient.shared.auth.currentUser?.id.uuidString
    }
    
    // MARK: - Methods
    
    func isCurrentUser(_ message: ChatMessage) -> Bool {
        message.senderId == currentUserId
    }
    
    @MainActor
    func loadMessages() async {
        isLoading = true
        errorMessage = nil
        
        do {
            messages = try await ChatService.shared.getMessages(tripId: tripId)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func subscribeToMessages() {
        // Subscribe to realtime message updates
        Task {
            for await message in ChatService.shared.messageStream(tripId: tripId) {
                await MainActor.run {
                    // Avoid duplicates
                    if !messages.contains(where: { $0.id == message.id }) {
                        messages.append(message)
                        
                        // Haptic for incoming messages from others
                        if !isCurrentUser(message) {
                            ChravelHaptics.light()
                        }
                    }
                }
            }
        }
    }
    
    @MainActor
    func sendMessage() async {
        guard !draftMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }
        
        let messageText = draftMessage
        draftMessage = "" // Clear immediately for responsiveness
        isSending = true
        
        do {
            let sentMessage = try await ChatService.shared.sendMessage(
                tripId: tripId,
                content: messageText,
                type: .text
            )
            
            // Add to local state if not already added via subscription
            if !messages.contains(where: { $0.id == sentMessage.id }) {
                messages.append(sentMessage)
            }
            
            ChravelHaptics.success()
        } catch {
            // Restore draft on failure
            draftMessage = messageText
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
        
        isSending = false
    }
    
    @MainActor
    func sendImageMessage(_ image: UIImage) async {
        isSending = true
        
        do {
            // 1. Upload image
            let imageUrl = try await MediaService.shared.uploadImage(
                image: image,
                path: "trips/\(tripId)/chat"
            )
            
            // 2. Send message with image attachment
            let sentMessage = try await ChatService.shared.sendMessage(
                tripId: tripId,
                content: "",
                type: .image,
                attachments: [MessageAttachment(type: .image, url: imageUrl)]
            )
            
            if !messages.contains(where: { $0.id == sentMessage.id }) {
                messages.append(sentMessage)
            }
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
        
        isSending = false
        showAttachmentPicker = false
    }
    
    @MainActor
    func deleteMessage(_ messageId: String) async -> Bool {
        guard let index = messages.firstIndex(where: { $0.id == messageId }) else {
            return false
        }
        
        let deletedMessage = messages[index]
        messages.remove(at: index)
        
        do {
            try await ChatService.shared.deleteMessage(messageId: messageId)
            return true
        } catch {
            // Rollback
            messages.insert(deletedMessage, at: index)
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    deinit {
        // Cleanup subscription
        // realtimeChannel?.unsubscribe()
    }
}

// MARK: - Chat Service

final class ChatService {
    static let shared = ChatService()
    
    private init() {}
    
    func getMessages(tripId: String, limit: Int = 100) async throws -> [ChatMessage] {
        let response = try await SupabaseClient.shared.database
            .from("messages")
            .select("""
                *,
                profiles:sender_id(id, display_name, avatar_url)
            """)
            .eq("trip_id", value: tripId)
            .order("created_at", ascending: true)
            .limit(limit)
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode([ChatMessage].self, from: response.data)
    }
    
    func sendMessage(
        tripId: String,
        content: String,
        type: MessageType,
        attachments: [MessageAttachment]? = nil
    ) async throws -> ChatMessage {
        guard let userId = SupabaseClient.shared.auth.currentUser?.id.uuidString else {
            throw ChatError.notAuthenticated
        }
        
        var insertData: [String: Any] = [
            "trip_id": tripId,
            "sender_id": userId,
            "content": content,
            "message_type": type.rawValue,
            "created_at": Date().iso8601String
        ]
        
        if let attachments = attachments {
            let encoder = JSONEncoder()
            let attachmentsData = try encoder.encode(attachments)
            insertData["attachments"] = String(data: attachmentsData, encoding: .utf8)
        }
        
        let response = try await SupabaseClient.shared.database
            .from("messages")
            .insert(insertData)
            .select("""
                *,
                profiles:sender_id(id, display_name, avatar_url)
            """)
            .single()
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode(ChatMessage.self, from: response.data)
    }
    
    func deleteMessage(messageId: String) async throws {
        // Soft delete
        try await SupabaseClient.shared.database
            .from("messages")
            .update(["deleted_at": Date().iso8601String])
            .eq("id", value: messageId)
            .execute()
    }
    
    func messageStream(tripId: String) -> AsyncStream<ChatMessage> {
        AsyncStream { continuation in
            Task {
                let channel = SupabaseClient.shared.realtime.channel("messages:\(tripId)")
                
                let subscription = channel.on(
                    "postgres_changes",
                    filter: .init(
                        event: .insert,
                        schema: "public",
                        table: "messages",
                        filter: "trip_id=eq.\(tripId)"
                    )
                ) { message in
                    if let data = try? JSONSerialization.data(withJSONObject: message.payload["record"] ?? [:]),
                       let chatMessage = try? JSONDecoder.supabaseDecoder.decode(ChatMessage.self, from: data) {
                        continuation.yield(chatMessage)
                    }
                }
                
                await channel.subscribe()
                
                continuation.onTermination = { _ in
                    Task {
                        await channel.unsubscribe()
                    }
                }
            }
        }
    }
}

// MARK: - Chat Error

enum ChatError: LocalizedError {
    case notAuthenticated
    case sendFailed
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be logged in to send messages."
        case .sendFailed:
            return "Failed to send message. Please try again."
        }
    }
}

// MARK: - Media Service (Stub)

final class MediaService {
    static let shared = MediaService()
    
    private init() {}
    
    func uploadImage(image: UIImage, path: String) async throws -> String {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw MediaError.compressionFailed
        }
        
        let fileName = "\(UUID().uuidString).jpg"
        let fullPath = "\(path)/\(fileName)"
        
        _ = try await SupabaseClient.shared.storage
            .from("media")
            .upload(path: fullPath, data: imageData, options: .init(contentType: "image/jpeg"))
        
        let publicUrl = SupabaseClient.shared.storage
            .from("media")
            .getPublicURL(path: fullPath)
        
        return publicUrl.absoluteString
    }
}

enum MediaError: LocalizedError {
    case compressionFailed
    case uploadFailed
    
    var errorDescription: String? {
        switch self {
        case .compressionFailed:
            return "Failed to compress image."
        case .uploadFailed:
            return "Failed to upload media."
        }
    }
}
