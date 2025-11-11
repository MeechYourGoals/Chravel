//
//  ChatMessageService.swift
//  Chat message service for iOS native chat
//

import Foundation
import Supabase

class ChatMessageService {
    private let tripId: String
    private var realtimeChannel: RealtimeChannel?
    
    init(tripId: String) {
        self.tripId = tripId
    }
    
    func fetchMessages(completion: @escaping (Result<[ChatMessage], Error>) -> Void) {
        // TODO: Implement Supabase client initialization
        // This would use the Supabase Swift client to fetch messages
        // For now, return empty array as placeholder
        
        // Example implementation:
        /*
        supabase
            .from("trip_chat_messages")
            .select()
            .eq("trip_id", value: tripId)
            .order("created_at", ascending: false)
            .limit(50)
            .execute { result in
                switch result {
                case .success(let response):
                    let messages = try? JSONDecoder().decode([ChatMessage].self, from: response.data)
                    completion(.success(messages ?? []))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        */
        
        completion(.success([]))
    }
    
    func sendMessage(message: ChatMessage, completion: @escaping (Result<ChatMessage, Error>) -> Void) {
        // TODO: Implement message sending via Supabase
        completion(.success(message))
    }
    
    func sendVoiceMessage(audioURL: URL, sender: ChatSender, completion: @escaping (Result<ChatMessage, Error>) -> Void) {
        // TODO: Upload audio file to Supabase Storage, then create message
        let message = ChatMessage(
            messageId: UUID().uuidString,
            sender: sender,
            sentDate: Date(),
            kind: .audio(audioURL),
            content: "Voice message",
            mediaURL: audioURL.absoluteString
        )
        completion(.success(message))
    }
    
    func sendImage(image: UIImage, sender: ChatSender, completion: @escaping (Result<ChatMessage, Error>) -> Void) {
        // TODO: Upload image to Supabase Storage, then create message
        let message = ChatMessage(
            messageId: UUID().uuidString,
            sender: sender,
            sentDate: Date(),
            kind: .photo(MediaItem(image: image)),
            content: "Image",
            mediaURL: nil
        )
        completion(.success(message))
    }
    
    func sendVideo(videoURL: URL, sender: ChatSender, completion: @escaping (Result<ChatMessage, Error>) -> Void) {
        // TODO: Upload video to Supabase Storage, then create message
        let message = ChatMessage(
            messageId: UUID().uuidString,
            sender: sender,
            sentDate: Date(),
            kind: .video(MediaItem(url: videoURL)),
            content: "Video",
            mediaURL: videoURL.absoluteString
        )
        completion(.success(message))
    }
    
    func subscribeToNewMessages(handler: @escaping (ChatMessage) -> Void) {
        // TODO: Set up Supabase realtime subscription
        // realtimeChannel = supabase.channel("chat:\(tripId)")
        //     .on("postgres_changes", filter: "trip_id=eq.\(tripId)") { payload in
        //         // Parse and handle new message
        //     }
        //     .subscribe()
    }
    
    func cleanup() {
        // TODO: Unsubscribe from realtime channel
        // realtimeChannel?.unsubscribe()
    }
}

// Helper struct for MediaItem
struct MediaItem: MediaItemProtocol {
    var url: URL?
    var image: UIImage?
    var placeholderImage: UIImage
    var size: CGSize
    
    init(image: UIImage) {
        self.image = image
        self.placeholderImage = image
        self.size = image.size
        self.url = nil
    }
    
    init(url: URL) {
        self.url = url
        self.placeholderImage = UIImage()
        self.size = CGSize(width: 200, height: 200)
        self.image = nil
    }
}
