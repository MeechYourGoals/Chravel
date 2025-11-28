// SupabaseClient.swift
// Chravel iOS - Supabase Client Singleton

import Foundation
import Supabase

// MARK: - Supabase Client

final class SupabaseClient {
    // MARK: - Singleton
    static let shared = SupabaseClient()
    
    // MARK: - Properties
    let client: Supabase.SupabaseClient
    
    // MARK: - Convenience Accessors
    var auth: AuthClient { client.auth }
    var database: PostgrestClient { client.database }
    var storage: SupabaseStorageClient { client.storage }
    var functions: FunctionsClient { client.functions }
    var realtime: RealtimeClient { client.realtime }
    
    // MARK: - Init
    private init() {
        guard let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let supabaseKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              let url = URL(string: supabaseUrl) else {
            fatalError("Missing Supabase configuration in Info.plist")
        }
        
        client = Supabase.SupabaseClient(
            supabaseURL: url,
            supabaseKey: supabaseKey,
            options: SupabaseClientOptions(
                auth: AuthClientOptions(
                    storage: KeychainStorage(),
                    flowType: .pkce
                ),
                global: GlobalOptions(
                    headers: [
                        "x-client-info": "chravel-ios/1.0.0"
                    ]
                )
            )
        )
    }
}

// MARK: - Keychain Storage

final class KeychainStorage: AuthLocalStorage {
    private let keychain = KeychainHelper.standard
    private let key = "supabase.auth.token"
    
    func store(key: String, value: Data) throws {
        try keychain.save(value, service: self.key, account: key)
    }
    
    func retrieve(key: String) throws -> Data? {
        try keychain.read(service: self.key, account: key)
    }
    
    func remove(key: String) throws {
        try keychain.delete(service: self.key, account: key)
    }
}

// MARK: - Keychain Helper

import Security

final class KeychainHelper {
    static let standard = KeychainHelper()
    
    private init() {}
    
    func save(_ data: Data, service: String, account: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]
        
        // Delete any existing item
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw KeychainError.unableToSave
        }
    }
    
    func read(service: String, account: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                return nil
            }
            throw KeychainError.unableToRead
        }
        
        return result as? Data
    }
    
    func delete(service: String, account: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unableToDelete
        }
    }
}

enum KeychainError: Error {
    case unableToSave
    case unableToRead
    case unableToDelete
}

// MARK: - Network Monitor

import Network
import Observation

@Observable
final class NetworkMonitor {
    static let shared = NetworkMonitor()
    
    var isConnected: Bool = true
    var connectionType: NWInterface.InterfaceType?
    
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                self?.connectionType = path.availableInterfaces.first?.type
            }
        }
        monitor.start(queue: queue)
    }
    
    deinit {
        monitor.cancel()
    }
}

// MARK: - Retry Helper

func retryWithBackoff<T>(
    maxAttempts: Int = 3,
    initialDelay: TimeInterval = 0.5,
    maxDelay: TimeInterval = 8,
    multiplier: Double = 2,
    operation: @escaping () async throws -> T
) async throws -> T {
    var lastError: Error?
    var delay = initialDelay
    
    for attempt in 1...maxAttempts {
        do {
            return try await operation()
        } catch {
            lastError = error
            
            // Don't retry on certain errors
            if let urlError = error as? URLError {
                switch urlError.code {
                case .notConnectedToInternet,
                     .networkConnectionLost:
                    throw error // Don't retry network connectivity issues
                default:
                    break
                }
            }
            
            // Don't retry on last attempt
            if attempt == maxAttempts {
                break
            }
            
            // Wait with exponential backoff
            try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            delay = min(delay * multiplier, maxDelay)
        }
    }
    
    throw lastError ?? NetworkError.unknown
}

enum NetworkError: Error {
    case unknown
    case noConnection
    case timeout
}

// MARK: - API Response Types

struct APIResponse<T: Decodable>: Decodable {
    let data: T?
    let error: APIError?
}

struct APIError: Decodable, Error {
    let message: String
    let code: String?
    let details: String?
}

// MARK: - Realtime Subscription Helper

extension SupabaseClient {
    func subscribeToTable<T: Decodable>(
        _ table: String,
        event: RealtimeEventType = .all,
        filter: String? = nil,
        callback: @escaping (RealtimePayload<T>) -> Void
    ) async -> RealtimeChannel {
        let channel = realtime.channel(table)
        
        var filterConfig = RealtimeFilterConfig(
            event: event,
            schema: "public",
            table: table
        )
        
        if let filter {
            filterConfig.filter = filter
        }
        
        channel.on("postgres_changes", filter: filterConfig) { message in
            guard let data = try? JSONSerialization.data(withJSONObject: message.payload),
                  let payload = try? JSONDecoder.supabaseDecoder.decode(RealtimePayload<T>.self, from: data) else {
                return
            }
            callback(payload)
        }
        
        await channel.subscribe()
        
        return channel
    }
}

struct RealtimePayload<T: Decodable>: Decodable {
    let eventType: String
    let new: T?
    let old: T?
    
    enum CodingKeys: String, CodingKey {
        case eventType = "type"
        case new
        case old
    }
}

enum RealtimeEventType: String {
    case insert = "INSERT"
    case update = "UPDATE"
    case delete = "DELETE"
    case all = "*"
}

struct RealtimeFilterConfig {
    var event: RealtimeEventType
    var schema: String
    var table: String
    var filter: String?
}

// MARK: - Mock Types for Compilation
// These would be provided by the actual Supabase Swift SDK

protocol AuthLocalStorage {
    func store(key: String, value: Data) throws
    func retrieve(key: String) throws -> Data?
    func remove(key: String) throws
}

struct AuthClientOptions {
    let storage: AuthLocalStorage
    let flowType: FlowType
    
    enum FlowType {
        case pkce
        case implicit
    }
}

struct GlobalOptions {
    let headers: [String: String]
}

struct SupabaseClientOptions {
    let auth: AuthClientOptions
    let global: GlobalOptions
}

class AuthClient {
    var currentUser: User?
    
    func session() async throws -> Session {
        Session(user: User(id: UUID()))
    }
    
    func signIn(email: String, password: String) async throws -> Session {
        Session(user: User(id: UUID()))
    }
    
    func signUp(email: String, password: String, data: [String: AnyJSON]?) async throws -> AuthResponse {
        AuthResponse(user: User(id: UUID()))
    }
    
    func signInWithIdToken(credentials: OAuthCredentials) async throws -> Session {
        Session(user: User(id: UUID()))
    }
    
    func getOAuthSignInURL(provider: OAuthProvider, redirectTo: URL?) async throws -> URL {
        URL(string: "https://example.com")!
    }
    
    func signOut() async throws {}
    
    func resetPasswordForEmail(_ email: String) async throws {}
    
    func refreshSession() async throws {}
}

struct Session {
    let user: User
}

struct User {
    let id: UUID
    var email: String?
}

struct AuthResponse {
    let user: User?
}

struct OAuthCredentials {
    let provider: OAuthProvider
    let idToken: String
}

enum OAuthProvider {
    case apple
    case google
}

enum AnyJSON {
    case string(String)
}

class PostgrestClient {
    func from(_ table: String) -> PostgrestQueryBuilder {
        PostgrestQueryBuilder()
    }
    
    func rpc(_ function: String, params: [String: Any]) -> PostgrestQueryBuilder {
        PostgrestQueryBuilder()
    }
}

class PostgrestQueryBuilder {
    func select(_ columns: String = "*") -> Self { self }
    func insert(_ values: [String: Any]) -> Self { self }
    func update(_ values: [String: Any]) -> Self { self }
    func delete() -> Self { self }
    func eq(_ column: String, value: Any) -> Self { self }
    func neq(_ column: String, value: Any) -> Self { self }
    func single() -> Self { self }
    func limit(_ count: Int) -> Self { self }
    func order(_ column: String, ascending: Bool) -> Self { self }
    func execute() async throws -> PostgrestResponse { PostgrestResponse() }
}

struct PostgrestResponse {
    var data: Data = Data()
}

class SupabaseStorageClient {
    func from(_ bucket: String) -> StorageBucket {
        StorageBucket()
    }
}

class StorageBucket {
    func upload(path: String, data: Data, options: UploadOptions) async throws -> String {
        path
    }
    
    func getPublicURL(path: String) -> URL {
        URL(string: "https://storage.example.com/\(path)")!
    }
}

struct UploadOptions {
    let contentType: String
}

class FunctionsClient {
    func invoke(_ function: String, options: FunctionInvokeOptions) async throws -> FunctionResponse {
        FunctionResponse()
    }
}

struct FunctionInvokeOptions {
    let body: Any?
    
    init(body: Any?) {
        self.body = body
    }
}

struct FunctionResponse {
    var data: Data?
}

class RealtimeClient {
    func channel(_ topic: String) -> RealtimeChannel {
        RealtimeChannel()
    }
}

class RealtimeChannel {
    @discardableResult
    func on(_ event: String, filter: RealtimeFilterConfig, callback: @escaping (RealtimeMessage) -> Void) -> Self { self }
    
    func subscribe() async {}
    func unsubscribe() async {}
}

struct RealtimeMessage {
    let payload: [String: Any]
}
