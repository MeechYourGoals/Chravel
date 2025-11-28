// ChatViewModel.swift
// Chravel iOS - CORRECTED Chat ViewModel
// Uses actual supabase-swift SDK patterns with Realtime

import Foundation
import SwiftUI
import Supabase

// MARK: - Chat ViewModel

@Observable
@MainActor
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
    
    // Realtime
    private var realtimeChannel: RealtimeChannelV2?
    
    // Dependencies
    private let supabase = AppSupabase.shared
    
    private var currentUserId: String? {
        // Get from current session
        Task {
            return try? await supabase.auth.session.user.id.uuidString
        }
        return nil
    }
    
    // MARK: - Init
    
    init(tripId: String) {
        self.tripId = tripId
    }
    
    deinit {
        // Clean up realtime subscription
        Task { [realtimeChannel] in
            await realtimeChannel?.unsubscribe()
        }
    }
    
    // MARK: - Check if Current User
    
    func isCurrentUser(_ message: ChatMessage) -> Bool {
        guard let session = try? supabase.client.auth.currentSession else {
            return false
        }
        return message.senderId == session.user.id.uuidString
    }
    
    // MARK: - Load Messages
    
    func loadMessages() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Query messages with sender profile join
            let fetchedMessages: [ChatMessage] = try await supabase.database
                .from("messages")
                .select("*, profiles:sender_id(id, display_name, avatar_url)")
                .eq("trip_id", value: tripId)
                .is("deleted_at", value: nil) // Only non-deleted messages
                .order("created_at", ascending: true)
                .limit(100)
                .execute()
                .value
            
            messages = fetchedMessages
            
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    // MARK: - Subscribe to Realtime
    
    func subscribeToMessages() {
        Task {
            // Create channel for this trip's messages
            let channel = supabase.client.realtime.channel("messages:\(tripId)")
            
            // Listen for inserts
            let _ = channel.onPostgresChange(
                InsertAction.self,
                schema: "public",
                table: "messages",
                filter: "trip_id=eq.\(tripId)"
            ) { [weak self] insert in
                Task { @MainActor [weak self] in
                    guard let self = self else { return }
                    
                    // Decode the new message
                    if let messageData = try? JSONSerialization.data(withJSONObject: insert.record),
                       var newMessage = try? JSONDecoder.supabase.decode(ChatMessage.self, from: messageData) {
                        
                        // Avoid duplicates
                        if !self.messages.contains(where: { $0.id == newMessage.id }) {
                            self.messages.append(newMessage)
                            
                            // Haptic for messages from others
                            if !self.isCurrentUser(newMessage) {
                                await MainActor.run {
                                    let generator = UIImpactFeedbackGenerator(style: .light)
                                    generator.impactOccurred()
                                }
                            }
                        }
                    }
                }
            }
            
            // Listen for updates (edits)
            let _ = channel.onPostgresChange(
                UpdateAction.self,
                schema: "public",
                table: "messages",
                filter: "trip_id=eq.\(tripId)"
            ) { [weak self] update in
                Task { @MainActor [weak self] in
                    guard let self = self else { return }
                    
                    if let messageData = try? JSONSerialization.data(withJSONObject: update.record),
                       let updatedMessage = try? JSONDecoder.supabase.decode(ChatMessage.self, from: messageData) {
                        
                        if let index = self.messages.firstIndex(where: { $0.id == updatedMessage.id }) {
                            self.messages[index] = updatedMessage
                        }
                    }
                }
            }
            
            // Listen for deletes
            let _ = channel.onPostgresChange(
                DeleteAction.self,
                schema: "public",
                table: "messages",
                filter: "trip_id=eq.\(tripId)"
            ) { [weak self] delete in
                Task { @MainActor [weak self] in
                    guard let self = self else { return }
                    
                    if let deletedId = delete.oldRecord["id"] as? String {
                        self.messages.removeAll { $0.id == deletedId }
                    }
                }
            }
            
            // Subscribe to channel
            await channel.subscribe()
            self.realtimeChannel = channel
        }
    }
    
    // MARK: - Send Message
    
    func sendMessage() async {
        let content = draftMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }
        
        // Get current user ID
        guard let session = try? await supabase.auth.session else {
            errorMessage = "Not authenticated"
            return
        }
        let userId = session.user.id.uuidString
        
        // Clear draft immediately for responsiveness
        let messageText = draftMessage
        draftMessage = ""
        isSending = true
        
        do {
            // Insert message
            let insertData: [String: Any] = [
                "trip_id": tripId,
                "sender_id": userId,
                "content": messageText,
                "message_type": MessageType.text.rawValue,
                "is_edited": false,
                "created_at": ISO8601DateFormatter().string(from: Date())
            ]
            
            let sentMessage: ChatMessage = try await supabase.database
                .from("messages")
                .insert(insertData)
                .select("*, profiles:sender_id(id, display_name, avatar_url)")
                .single()
                .execute()
                .value
            
            // Add to local list if not already added via realtime
            if !messages.contains(where: { $0.id == sentMessage.id }) {
                messages.append(sentMessage)
            }
            
            // Success haptic
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
            
        } catch {
            // Restore draft on failure
            draftMessage = messageText
            errorMessage = error.localizedDescription
            
            // Error haptic
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)
        }
        
        isSending = false
    }
    
    // MARK: - Send Image Message
    
    func sendImageMessage(_ imageData: Data) async {
        guard let session = try? await supabase.auth.session else {
            errorMessage = "Not authenticated"
            return
        }
        let userId = session.user.id.uuidString
        
        isSending = true
        
        do {
            // 1. Upload image to storage
            let fileName = "\(UUID().uuidString).jpg"
            let path = "trips/\(tripId)/chat/\(fileName)"
            
            let uploadResponse = try await supabase.storage
                .from("media")
                .upload(
                    path: path,
                    file: imageData,
                    options: FileOptions(contentType: "image/jpeg")
                )
            
            // Get public URL
            let publicURL = try supabase.storage
                .from("media")
                .getPublicURL(path: uploadResponse.path ?? path)
            
            // 2. Create attachment JSON
            let attachment: [String: Any] = [
                "type": AttachmentType.image.rawValue,
                "url": publicURL.absoluteString
            ]
            let attachmentsJSON = try JSONSerialization.data(withJSONObject: [attachment])
            let attachmentsString = String(data: attachmentsJSON, encoding: .utf8) ?? "[]"
            
            // 3. Insert message with attachment
            let insertData: [String: Any] = [
                "trip_id": tripId,
                "sender_id": userId,
                "content": "",
                "message_type": MessageType.image.rawValue,
                "attachments": attachmentsString,
                "is_edited": false,
                "created_at": ISO8601DateFormatter().string(from: Date())
            ]
            
            let sentMessage: ChatMessage = try await supabase.database
                .from("messages")
                .insert(insertData)
                .select("*, profiles:sender_id(id, display_name, avatar_url)")
                .single()
                .execute()
                .value
            
            if !messages.contains(where: { $0.id == sentMessage.id }) {
                messages.append(sentMessage)
            }
            
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
            
        } catch {
            errorMessage = error.localizedDescription
            
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)
        }
        
        isSending = false
        showAttachmentPicker = false
    }
    
    // MARK: - Delete Message (Soft Delete)
    
    func deleteMessage(_ messageId: String) async -> Bool {
        // Optimistic removal
        guard let index = messages.firstIndex(where: { $0.id == messageId }) else {
            return false
        }
        
        let deletedMessage = messages[index]
        messages.remove(at: index)
        
        do {
            // Soft delete by setting deleted_at
            try await supabase.database
                .from("messages")
                .update(["deleted_at": ISO8601DateFormatter().string(from: Date())])
                .eq("id", value: messageId)
                .execute()
            
            return true
            
        } catch {
            // Rollback on failure
            messages.insert(deletedMessage, at: index)
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    // MARK: - Edit Message
    
    func editMessage(_ messageId: String, newContent: String) async -> Bool {
        guard let index = messages.firstIndex(where: { $0.id == messageId }) else {
            return false
        }
        
        let originalContent = messages[index].content
        
        // Optimistic update
        messages[index] = ChatMessage(
            id: messages[index].id,
            tripId: messages[index].tripId,
            senderId: messages[index].senderId,
            content: newContent,
            messageType: messages[index].messageType,
            attachments: messages[index].attachments,
            isEdited: true,
            deletedAt: messages[index].deletedAt,
            createdAt: messages[index].createdAt,
            senderProfile: messages[index].senderProfile
        )
        
        do {
            try await supabase.database
                .from("messages")
                .update([
                    "content": newContent,
                    "is_edited": true
                ])
                .eq("id", value: messageId)
                .execute()
            
            return true
            
        } catch {
            // Rollback
            messages[index] = ChatMessage(
                id: messages[index].id,
                tripId: messages[index].tripId,
                senderId: messages[index].senderId,
                content: originalContent,
                messageType: messages[index].messageType,
                attachments: messages[index].attachments,
                isEdited: messages[index].isEdited,
                deletedAt: messages[index].deletedAt,
                createdAt: messages[index].createdAt,
                senderProfile: messages[index].senderProfile
            )
            errorMessage = error.localizedDescription
            return false
        }
    }
}
