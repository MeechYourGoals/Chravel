// SupabaseClient.swift
// Chravel iOS - CORRECTED Supabase Client
// Uses actual supabase-swift SDK patterns from existing codebase

import Foundation
import Supabase
import KeychainAccess

// MARK: - App Supabase Client

/// Singleton wrapper around SupabaseClient for app-wide access
final class AppSupabase {
    static let shared = AppSupabase()
    
    let client: SupabaseClient
    private let keychain = Keychain(service: "com.chravel.app")
    
    private init() {
        guard let supabaseURL = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let supabaseKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              let url = URL(string: supabaseURL) else {
            fatalError("Missing Supabase configuration in Info.plist")
        }
        
        self.client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: supabaseKey
        )
    }
    
    // MARK: - Keychain Token Management
    
    func saveAccessToken(_ token: String) {
        do {
            try keychain.set(token, key: "supabase_access_token")
        } catch {
            print("Failed to save auth token: \(error)")
        }
    }
    
    func getStoredToken() -> String? {
        return try? keychain.get("supabase_access_token")
    }
    
    func clearToken() {
        do {
            try keychain.remove("supabase_access_token")
        } catch {
            print("Failed to clear auth token: \(error)")
        }
    }
}

// MARK: - Convenience Extensions

extension AppSupabase {
    var auth: AuthClient { client.auth }
    var database: PostgrestClient { client.database }
    var storage: SupabaseStorageClient { client.storage }
    var functions: FunctionsClient { client.functions }
    var realtime: RealtimeClient { client.realtime }
}

// MARK: - Database Query Helpers

extension AppSupabase {
    /// Fetch trips for a user with proper typing
    func fetchTrips(userId: String) async throws -> [Trip] {
        let response: [Trip] = try await client.database
            .from("trips")
            .select()
            .eq("creator_id", value: userId)
            .neq("status", value: "archived")
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    /// Fetch trip by ID
    func fetchTrip(tripId: String) async throws -> Trip {
        let response: Trip = try await client.database
            .from("trips")
            .select()
            .eq("id", value: tripId)
            .single()
            .execute()
            .value
        
        return response
    }
    
    /// Fetch messages for a trip
    func fetchMessages(tripId: String, limit: Int = 100) async throws -> [ChatMessage] {
        let response: [ChatMessage] = try await client.database
            .from("messages")
            .select("*, profiles:sender_id(id, display_name, avatar_url)")
            .eq("trip_id", value: tripId)
            .order("created_at", ascending: true)
            .limit(limit)
            .execute()
            .value
        
        return response
    }
    
    /// Insert a new trip
    func createTrip(_ trip: CreateTripInput) async throws -> Trip {
        let response: Trip = try await client.database
            .from("trips")
            .insert(trip)
            .select()
            .single()
            .execute()
            .value
        
        return response
    }
    
    /// Update a trip
    func updateTrip(tripId: String, updates: TripUpdateInput) async throws -> Trip {
        let response: Trip = try await client.database
            .from("trips")
            .update(updates)
            .eq("id", value: tripId)
            .select()
            .single()
            .execute()
            .value
        
        return response
    }
    
    /// Delete (archive) a trip
    func archiveTrip(tripId: String) async throws {
        try await client.database
            .from("trips")
            .update(["status": "archived"])
            .eq("id", value: tripId)
            .execute()
    }
    
    /// Send a chat message
    func sendMessage(_ message: CreateMessageInput) async throws -> ChatMessage {
        let response: ChatMessage = try await client.database
            .from("messages")
            .insert(message)
            .select("*, profiles:sender_id(id, display_name, avatar_url)")
            .single()
            .execute()
            .value
        
        return response
    }
}

// MARK: - Edge Function Helpers

extension AppSupabase {
    /// Call an edge function with typed response
    func invoke<T: Decodable>(_ function: String, body: Encodable? = nil) async throws -> T {
        let response = try await client.functions.invoke(
            function,
            options: FunctionInvokeOptions(body: body)
        )
        
        guard let data = response.data else {
            throw SupabaseError.emptyResponse
        }
        
        return try JSONDecoder.supabase.decode(T.self, from: data)
    }
    
    /// Call an edge function without expecting a response
    func invokeVoid(_ function: String, body: Encodable? = nil) async throws {
        _ = try await client.functions.invoke(
            function,
            options: FunctionInvokeOptions(body: body)
        )
    }
}

// MARK: - Storage Helpers

extension AppSupabase {
    /// Upload an image and get public URL
    func uploadImage(data: Data, path: String) async throws -> String {
        let response = try await client.storage
            .from("media")
            .upload(
                path: path,
                file: data,
                options: FileOptions(contentType: "image/jpeg")
            )
        
        let publicURL = try client.storage
            .from("media")
            .getPublicURL(path: response.path ?? path)
        
        return publicURL.absoluteString
    }
}

// MARK: - Realtime Helpers

extension AppSupabase {
    /// Subscribe to table changes
    func subscribeToTable(
        _ table: String,
        filter: String? = nil,
        onInsert: @escaping ([String: Any]) -> Void,
        onUpdate: @escaping ([String: Any]) -> Void,
        onDelete: @escaping ([String: Any]) -> Void
    ) async -> RealtimeChannelV2 {
        let channel = client.realtime.channel(table)
        
        // Configure postgres changes listener
        let _ = channel.onPostgresChange(
            InsertAction.self,
            schema: "public",
            table: table,
            filter: filter
        ) { insert in
            onInsert(insert.record)
        }
        
        let _ = channel.onPostgresChange(
            UpdateAction.self,
            schema: "public",
            table: table,
            filter: filter
        ) { update in
            onUpdate(update.record)
        }
        
        let _ = channel.onPostgresChange(
            DeleteAction.self,
            schema: "public",
            table: table,
            filter: filter
        ) { delete in
            onDelete(delete.oldRecord)
        }
        
        await channel.subscribe()
        
        return channel
    }
}

// MARK: - Custom Errors

enum SupabaseError: LocalizedError {
    case emptyResponse
    case notAuthenticated
    case invalidData
    
    var errorDescription: String? {
        switch self {
        case .emptyResponse: return "Server returned empty response"
        case .notAuthenticated: return "User is not authenticated"
        case .invalidData: return "Invalid data format"
        }
    }
}

// MARK: - JSON Decoder

extension JSONDecoder {
    /// Decoder configured for Supabase date formats
    static let supabase: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            
            // Try ISO8601 with fractional seconds
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: dateString) {
                return date
            }
            
            // Try ISO8601 without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: dateString) {
                return date
            }
            
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(dateString)"
            )
        }
        return decoder
    }()
}

// MARK: - JSON Encoder

extension JSONEncoder {
    /// Encoder configured for Supabase
    static let supabase: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

// MARK: - Input Types for Database Operations

struct CreateTripInput: Encodable {
    let name: String
    let description: String?
    let destination: String?
    let startDate: Date?
    let endDate: Date?
    let tripType: String
    let creatorId: String
}

struct TripUpdateInput: Encodable {
    var name: String?
    var description: String?
    var destination: String?
    var startDate: Date?
    var endDate: Date?
    var coverImageUrl: String?
    var status: String?
}

struct CreateMessageInput: Encodable {
    let tripId: String
    let senderId: String
    let content: String
    let messageType: String
    var attachments: String? // JSON string
}
