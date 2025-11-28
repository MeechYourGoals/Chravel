=== VIEWMODEL: AuthViewModel START ===

// AuthViewModel.swift
// Chravel iOS - Authentication ViewModel

import Foundation
import SwiftUI
import AuthenticationServices

// MARK: - User Profile

struct UserProfile: Codable, Identifiable {
    let id: String
    var displayName: String
    var email: String
    var avatarURL: String?
    var phone: String?
    var bio: String?
    var homeCity: String?
    var isVerified: Bool
    var subscriptionTier: SubscriptionTier
    var createdAt: Date
    var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case email
        case avatarURL = "avatar_url"
        case phone
        case bio
        case homeCity = "home_city"
        case isVerified = "is_verified"
        case subscriptionTier = "subscription_tier"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        displayName = try container.decode(String.self, forKey: .displayName)
        email = try container.decode(String.self, forKey: .email)
        avatarURL = try container.decodeIfPresent(String.self, forKey: .avatarURL)
        phone = try container.decodeIfPresent(String.self, forKey: .phone)
        bio = try container.decodeIfPresent(String.self, forKey: .bio)
        homeCity = try container.decodeIfPresent(String.self, forKey: .homeCity)
        isVerified = try container.decodeIfPresent(Bool.self, forKey: .isVerified) ?? false
        subscriptionTier = try container.decodeIfPresent(SubscriptionTier.self, forKey: .subscriptionTier) ?? .free
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }
}

// MARK: - Subscription Tier

enum SubscriptionTier: String, Codable {
    case free
    case plus
    case pro
    case enterprise
    
    var displayName: String {
        switch self {
        case .free: return "Free"
        case .plus: return "Plus"
        case .pro: return "Pro"
        case .enterprise: return "Enterprise"
        }
    }
    
    var color: Color {
        switch self {
        case .free: return .textMuted
        case .plus: return .chravelOrange
        case .pro: return .chravelGold
        case .enterprise: return .purple
        }
    }
}

// MARK: - Auth ViewModel

@Observable
final class AuthViewModel {
    // MARK: - Properties
    
    var user: UserProfile?
    var isAuthenticated: Bool = false
    var isLoading: Bool = false
    var isInitializing: Bool = true
    var errorMessage: String?
    
    // Session Management
    private var sessionRefreshTimer: Timer?
    
    // MARK: - Computed Properties
    
    var isProUser: Bool {
        guard let tier = user?.subscriptionTier else { return false }
        return tier == .pro || tier == .enterprise
    }
    
    var canCreateTrip: Bool {
        // Free users have limits (checked server-side)
        return isAuthenticated
    }
    
    // MARK: - Init
    
    init() {
        Task {
            await checkSession()
        }
    }
    
    // MARK: - Session Management
    
    @MainActor
    func checkSession() async {
        isInitializing = true
        
        do {
            let session = try await SupabaseClient.shared.auth.session
            
            if let userId = session.user.id.uuidString as String? {
                await loadUserProfile(userId: userId)
                isAuthenticated = true
                startSessionRefreshTimer()
            }
        } catch {
            // No active session
            isAuthenticated = false
            user = nil
        }
        
        isInitializing = false
    }
    
    private func startSessionRefreshTimer() {
        sessionRefreshTimer?.invalidate()
        
        // Refresh session every 10 minutes
        sessionRefreshTimer = Timer.scheduledTimer(withTimeInterval: 600, repeats: true) { [weak self] _ in
            Task {
                try? await SupabaseClient.shared.auth.refreshSession()
            }
        }
    }
    
    // MARK: - Sign In
    
    @MainActor
    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let session = try await SupabaseClient.shared.auth.signIn(
                email: email,
                password: password
            )
            
            await loadUserProfile(userId: session.user.id.uuidString)
            isAuthenticated = true
            startSessionRefreshTimer()
            
            ChravelHaptics.success()
        } catch {
            handleAuthError(error)
            ChravelHaptics.error()
        }
        
        isLoading = false
    }
    
    // MARK: - Sign Up
    
    @MainActor
    func signUp(email: String, password: String, displayName: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await SupabaseClient.shared.auth.signUp(
                email: email,
                password: password,
                data: [
                    "display_name": .string(displayName)
                ]
            )
            
            if let userId = response.user?.id.uuidString {
                // Create profile
                try await createProfile(
                    userId: userId,
                    email: email,
                    displayName: displayName
                )
                
                await loadUserProfile(userId: userId)
                isAuthenticated = true
                startSessionRefreshTimer()
                
                ChravelHaptics.success()
            }
        } catch {
            handleAuthError(error)
            ChravelHaptics.error()
        }
        
        isLoading = false
    }
    
    // MARK: - Social Sign In
    
    @MainActor
    func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Google Sign In requires UIKit integration
            // This would use GoogleSignIn SDK
            
            // Placeholder for Google OAuth flow
            let url = try await SupabaseClient.shared.auth.getOAuthSignInURL(
                provider: .google,
                redirectTo: URL(string: "chravel://auth/callback")
            )
            
            // Open URL in Safari/ASWebAuthenticationSession
            await UIApplication.shared.open(url)
            
        } catch {
            handleAuthError(error)
            ChravelHaptics.error()
        }
        
        isLoading = false
    }
    
    @MainActor
    func signInWithApple(authorization: ASAuthorization) async {
        isLoading = true
        errorMessage = nil
        
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityToken = appleIDCredential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8) else {
            errorMessage = "Failed to get Apple ID credentials"
            isLoading = false
            return
        }
        
        do {
            let session = try await SupabaseClient.shared.auth.signInWithIdToken(
                credentials: .init(
                    provider: .apple,
                    idToken: tokenString
                )
            )
            
            // Get user name from Apple credential (only available on first sign up)
            let fullName = [
                appleIDCredential.fullName?.givenName,
                appleIDCredential.fullName?.familyName
            ].compactMap { $0 }.joined(separator: " ")
            
            let userId = session.user.id.uuidString
            
            // Check if profile exists, create if not
            let profileExists = await checkProfileExists(userId: userId)
            
            if !profileExists {
                let displayName = fullName.isEmpty ? "Chravel User" : fullName
                let email = appleIDCredential.email ?? session.user.email ?? ""
                
                try await createProfile(
                    userId: userId,
                    email: email,
                    displayName: displayName
                )
            }
            
            await loadUserProfile(userId: userId)
            isAuthenticated = true
            startSessionRefreshTimer()
            
            ChravelHaptics.success()
        } catch {
            handleAuthError(error)
            ChravelHaptics.error()
        }
        
        isLoading = false
    }
    
    // MARK: - Sign Out
    
    @MainActor
    func signOut() async {
        do {
            try await SupabaseClient.shared.auth.signOut()
            
            user = nil
            isAuthenticated = false
            sessionRefreshTimer?.invalidate()
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
    }
    
    // MARK: - Password Reset
    
    @MainActor
    func resetPassword(email: String) async {
        do {
            try await SupabaseClient.shared.auth.resetPasswordForEmail(email)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Update Profile
    
    @MainActor
    func updateProfile(_ updates: ProfileUpdate) async -> Bool {
        guard let userId = user?.id else { return false }
        
        do {
            var updateDict: [String: Any] = [:]
            
            if let displayName = updates.displayName { updateDict["display_name"] = displayName }
            if let bio = updates.bio { updateDict["bio"] = bio }
            if let homeCity = updates.homeCity { updateDict["home_city"] = homeCity }
            if let avatarURL = updates.avatarURL { updateDict["avatar_url"] = avatarURL }
            
            updateDict["updated_at"] = Date().iso8601String
            
            try await SupabaseClient.shared.database
                .from("profiles")
                .update(updateDict)
                .eq("id", value: userId)
                .execute()
            
            // Reload profile
            await loadUserProfile(userId: userId)
            
            ChravelHaptics.success()
            return true
        } catch {
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
            return false
        }
    }
    
    // MARK: - Private Helpers
    
    @MainActor
    private func loadUserProfile(userId: String) async {
        do {
            let response = try await SupabaseClient.shared.database
                .from("profiles")
                .select("*")
                .eq("id", value: userId)
                .single()
                .execute()
            
            user = try JSONDecoder.supabaseDecoder.decode(UserProfile.self, from: response.data)
        } catch {
            // Profile may not exist yet
            print("Failed to load profile: \(error)")
        }
    }
    
    private func createProfile(userId: String, email: String, displayName: String) async throws {
        let profileData: [String: Any] = [
            "id": userId,
            "email": email,
            "display_name": displayName,
            "subscription_tier": SubscriptionTier.free.rawValue,
            "is_verified": false,
            "created_at": Date().iso8601String,
            "updated_at": Date().iso8601String
        ]
        
        try await SupabaseClient.shared.database
            .from("profiles")
            .insert(profileData)
            .execute()
    }
    
    private func checkProfileExists(userId: String) async -> Bool {
        do {
            let response = try await SupabaseClient.shared.database
                .from("profiles")
                .select("id")
                .eq("id", value: userId)
                .execute()
            
            // Check if we got any results
            let profiles = try JSONDecoder().decode([[String: String]].self, from: response.data)
            return !profiles.isEmpty
        } catch {
            return false
        }
    }
    
    private func handleAuthError(_ error: Error) {
        // Map Supabase auth errors to user-friendly messages
        let message = error.localizedDescription.lowercased()
        
        if message.contains("invalid") && message.contains("credentials") {
            errorMessage = "Invalid email or password"
        } else if message.contains("already registered") || message.contains("already exists") {
            errorMessage = "An account with this email already exists"
        } else if message.contains("email not confirmed") {
            errorMessage = "Please verify your email address"
        } else if message.contains("rate limit") {
            errorMessage = "Too many attempts. Please try again later"
        } else {
            errorMessage = "Authentication failed. Please try again"
        }
    }
    
    deinit {
        sessionRefreshTimer?.invalidate()
    }
}

// MARK: - Profile Update

struct ProfileUpdate {
    var displayName: String?
    var bio: String?
    var homeCity: String?
    var avatarURL: String?
}

// MARK: - Date Extension

extension Date {
    var iso8601String: String {
        ISO8601DateFormatter().string(from: self)
    }
}

// MARK: - JSONDecoder Extension

extension JSONDecoder {
    static let supabaseDecoder: JSONDecoder = {
        let decoder = JSONDecoder()
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

=== VIEWMODEL: AuthViewModel END ===
