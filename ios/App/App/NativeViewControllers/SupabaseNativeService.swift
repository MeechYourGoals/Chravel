//
//  SupabaseNativeService.swift
//  Native Supabase Swift SDK integration for offline support and better performance
//

import Foundation
import Supabase
import KeychainAccess

class SupabaseNativeService {
    static let shared = SupabaseNativeService()
    
    private var client: SupabaseClient?
    private let keychain = Keychain(service: "com.chravel.app")
    
    private init() {
        setupClient()
    }
    
    // MARK: - Setup
    private func setupClient() {
        guard let supabaseURL = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let supabaseKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String else {
            print("⚠️ Supabase credentials not found in Info.plist")
            return
        }
        
        client = SupabaseClient(supabaseURL: URL(string: supabaseURL)!, supabaseKey: supabaseKey)
    }
    
    // MARK: - Authentication
    func signIn(email: String, password: String, completion: @escaping (Result<AuthResponse, Error>) -> Void) {
        guard let client = client else {
            completion(.failure(NSError(domain: "SupabaseNativeService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Client not initialized"])))
            return
        }
        
        Task {
            do {
                let response = try await client.auth.signIn(email: email, password: password)
                
                // Session is optional - nil for email confirmation or 2FA flows
                if let session = response.session {
                    await saveAuthToken(session.accessToken)
                } else {
                    // Clear any existing token when session is nil (email confirmation/2FA required)
                    await clearAuthToken()
                }
                
                await MainActor.run {
                    completion(.success(response))
                }
            } catch {
                await MainActor.run {
                    completion(.failure(error))
                }
            }
        }
    }
    
    func signOut(completion: @escaping (Error?) -> Void) {
        guard let client = client else {
            completion(NSError(domain: "SupabaseNativeService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Client not initialized"]))
            return
        }
        
        Task {
            do {
                try await client.auth.signOut()
                await clearAuthToken()
                await MainActor.run {
                    completion(nil)
                }
            } catch {
                await MainActor.run {
                    completion(error)
                }
            }
        }
    }
    
    // MARK: - Token Management
    private func saveAuthToken(_ token: String) async {
        do {
            try keychain.set(token, key: "supabase_access_token")
        } catch {
            print("Failed to save auth token: \(error)")
        }
    }
    
    private func clearAuthToken() async {
        do {
            try keychain.remove("supabase_access_token")
        } catch {
            print("Failed to clear auth token: \(error)")
        }
    }
    
    func getStoredToken() -> String? {
        return try? keychain.get("supabase_access_token")
    }
    
    // MARK: - Database Queries
    func fetchTrips(userId: String, completion: @escaping (Result<[Any], Error>) -> Void) {
        guard let client = client else {
            completion(.failure(NSError(domain: "SupabaseNativeService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Client not initialized"])))
            return
        }
        
        Task {
            do {
                // TODO: Replace with actual table name and type
                let response: [Any] = try await client.database
                    .from("trips")
                    .select()
                    .eq("creator_id", value: userId)
                    .execute()
                    .value
                
                await MainActor.run {
                    completion(.success(response))
                }
            } catch {
                await MainActor.run {
                    completion(.failure(error))
                }
            }
        }
    }
}
