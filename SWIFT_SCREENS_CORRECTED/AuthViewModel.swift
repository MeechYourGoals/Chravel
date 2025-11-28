// AuthViewModel.swift
// Chravel iOS - CORRECTED Authentication ViewModel
// Uses actual supabase-swift SDK patterns

import Foundation
import SwiftUI
import Supabase
import AuthenticationServices

// MARK: - User Profile Model

struct UserProfile: Codable, Identifiable {
    let id: String
    var displayName: String
    var email: String
    var avatarUrl: String?
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
        case avatarUrl = "avatar_url"
        case phone
        case bio
        case homeCity = "home_city"
        case isVerified = "is_verified"
        case subscriptionTier = "subscription_tier"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Subscription Tier

enum SubscriptionTier: String, Codable {
    case free
    case plus
    case pro
    case enterprise
}

// MARK: - Auth ViewModel

@Observable
@MainActor
final class AuthViewModel {
    // MARK: - Published State
    
    private(set) var user: UserProfile?
    private(set) var isAuthenticated: Bool = false
    private(set) var isLoading: Bool = false
    private(set) var isInitializing: Bool = true
    var errorMessage: String?
    
    // MARK: - Private
    
    private let supabase = AppSupabase.shared
    
    // MARK: - Computed Properties
    
    var isProUser: Bool {
        guard let tier = user?.subscriptionTier else { return false }
        return tier == .pro || tier == .enterprise
    }
    
    var currentUserId: String? {
        user?.id
    }
    
    // MARK: - Init
    
    init() {
        Task {
            await checkSession()
        }
    }
    
    // MARK: - Session Management
    
    func checkSession() async {
        isInitializing = true
        
        do {
            // supabase-swift: auth.session returns Session
            let session = try await supabase.auth.session
            
            // Session exists - user is authenticated
            let userId = session.user.id.uuidString
            await loadUserProfile(userId: userId)
            
            // Save token to keychain
            supabase.saveAccessToken(session.accessToken)
            
            isAuthenticated = true
        } catch {
            // No valid session
            isAuthenticated = false
            user = nil
            supabase.clearToken()
        }
        
        isInitializing = false
    }
    
    // MARK: - Sign In with Email/Password
    
    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            // supabase-swift: signIn returns AuthResponse with optional session
            let response = try await supabase.auth.signIn(
                email: email,
                password: password
            )
            
            // AuthResponse.session is optional - nil means email confirmation required
            if let session = response.session {
                let userId = session.user.id.uuidString
                
                // Save token
                supabase.saveAccessToken(session.accessToken)
                
                // Load profile
                await loadUserProfile(userId: userId)
                
                isAuthenticated = true
            } else {
                // Email confirmation required
                errorMessage = "Please check your email to confirm your account"
            }
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    // MARK: - Sign Up
    
    func signUp(email: String, password: String, displayName: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            // supabase-swift: signUp returns AuthResponse
            let response = try await supabase.auth.signUp(
                email: email,
                password: password,
                data: ["display_name": .string(displayName)]
            )
            
            if let user = response.user {
                let userId = user.id.uuidString
                
                // Create profile in profiles table
                try await createProfile(
                    userId: userId,
                    email: email,
                    displayName: displayName
                )
                
                // If session exists, user is auto-logged in
                if let session = response.session {
                    supabase.saveAccessToken(session.accessToken)
                    await loadUserProfile(userId: userId)
                    isAuthenticated = true
                } else {
                    // Email confirmation required
                    errorMessage = "Please check your email to confirm your account"
                }
            }
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    // MARK: - Sign In with Apple
    
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
            // supabase-swift: signInWithIdToken
            let session = try await supabase.auth.signInWithIdToken(
                credentials: .init(
                    provider: .apple,
                    idToken: tokenString
                )
            )
            
            let userId = session.user.id.uuidString
            supabase.saveAccessToken(session.accessToken)
            
            // Check if profile exists, create if not
            let profileExists = await checkProfileExists(userId: userId)
            
            if !profileExists {
                // Get name from Apple credential (only on first sign-up)
                let fullName = [
                    appleIDCredential.fullName?.givenName,
                    appleIDCredential.fullName?.familyName
                ].compactMap { $0 }.joined(separator: " ")
                
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
            
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    // MARK: - Sign In with Google
    
    func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Get OAuth URL for Google
            let url = try await supabase.auth.getOAuthSignInURL(
                provider: .google,
                redirectTo: URL(string: "chravel://auth/callback")
            )
            
            // Open in ASWebAuthenticationSession or Safari
            await UIApplication.shared.open(url)
            
        } catch {
            handleAuthError(error)
        }
        
        isLoading = false
    }
    
    // MARK: - Sign Out
    
    func signOut() async {
        do {
            try await supabase.auth.signOut()
            
            user = nil
            isAuthenticated = false
            supabase.clearToken()
            
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Password Reset
    
    func resetPassword(email: String) async {
        isLoading = true
        
        do {
            try await supabase.auth.resetPasswordForEmail(email)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    // MARK: - Update Profile
    
    func updateProfile(displayName: String? = nil, bio: String? = nil, homeCity: String? = nil, avatarUrl: String? = nil) async -> Bool {
        guard let userId = user?.id else { return false }
        
        do {
            var updates: [String: Any] = [
                "updated_at": ISO8601DateFormatter().string(from: Date())
            ]
            
            if let displayName = displayName { updates["display_name"] = displayName }
            if let bio = bio { updates["bio"] = bio }
            if let homeCity = homeCity { updates["home_city"] = homeCity }
            if let avatarUrl = avatarUrl { updates["avatar_url"] = avatarUrl }
            
            try await supabase.database
                .from("profiles")
                .update(updates)
                .eq("id", value: userId)
                .execute()
            
            // Reload profile
            await loadUserProfile(userId: userId)
            
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    // MARK: - Private Helpers
    
    private func loadUserProfile(userId: String) async {
        do {
            let profile: UserProfile = try await supabase.database
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            
            self.user = profile
        } catch {
            print("Failed to load profile: \(error)")
            // Profile might not exist yet
        }
    }
    
    private func createProfile(userId: String, email: String, displayName: String) async throws {
        let profileData: [String: Any] = [
            "id": userId,
            "email": email,
            "display_name": displayName,
            "subscription_tier": SubscriptionTier.free.rawValue,
            "is_verified": false,
            "created_at": ISO8601DateFormatter().string(from: Date()),
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]
        
        try await supabase.database
            .from("profiles")
            .insert(profileData)
            .execute()
    }
    
    private func checkProfileExists(userId: String) async -> Bool {
        do {
            let _: [UserProfile] = try await supabase.database
                .from("profiles")
                .select("id")
                .eq("id", value: userId)
                .execute()
                .value
            
            return true
        } catch {
            return false
        }
    }
    
    private func handleAuthError(_ error: Error) {
        let message = error.localizedDescription.lowercased()
        
        if message.contains("invalid") && (message.contains("credentials") || message.contains("login")) {
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
}
