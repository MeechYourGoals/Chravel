//
//  SupabaseNativeService.swift
//  Native Supabase authentication service for Capacitor
//

import Foundation
import Capacitor
import Supabase

@objc(SupabaseNativeService)
public class SupabaseNativeService: CAPPlugin {
    
    private var supabaseClient: SupabaseClient?
    
    @objc public override func load() {
        // Initialize Supabase client if needed
        // This would typically read from Capacitor config or environment variables
    }
    
    @objc func signIn(_ call: CAPPluginCall) {
        guard let email = call.getString("email"),
              let password = call.getString("password") else {
            call.reject("Email and password are required")
            return
        }
        
        Task {
            do {
                let response = try await supabaseClient?.auth.signIn(
                    email: email,
                    password: password
                )
                
                // FIXED: Use optional binding to safely access session
                // In Supabase Swift, AuthResponse.session is optional and is nil for flows
                // that require email confirmation or two-factor auth
                if let session = response?.session {
                    // Only store the token when a session exists
                    let accessToken = session.accessToken
                    
                    // Store token (e.g., in Capacitor Preferences or Keychain)
                    // This is just an example - adjust based on your storage needs
                    if let preferences = self.bridge?.plugin(withName: "Preferences") as? CAPPlugin {
                        // Store token using Preferences plugin
                        // Note: You may need to adjust this based on your actual storage mechanism
                    }
                    
                    call.resolve([
                        "success": true,
                        "accessToken": accessToken,
                        "user": [
                            "id": session.user.id.uuidString,
                            "email": session.user.email ?? ""
                        ]
                    ])
                } else {
                    // Session is nil - this happens for email confirmation or 2FA flows
                    // Return appropriate response without crashing
                    // The completion handler will still run successfully
                    call.resolve([
                        "success": false,
                        "requiresEmailConfirmation": true,
                        "message": "Please check your email to confirm your account"
                    ])
                }
            } catch {
                call.reject("Sign in failed: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func signOut(_ call: CAPPluginCall) {
        Task {
            do {
                try await supabaseClient?.auth.signOut()
                call.resolve(["success": true])
            } catch {
                call.reject("Sign out failed: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func getSession(_ call: CAPPluginCall) {
        Task {
            do {
                let session = try await supabaseClient?.auth.session
                
                if let session = session {
                    call.resolve([
                        "success": true,
                        "accessToken": session.accessToken,
                        "user": [
                            "id": session.user.id.uuidString,
                            "email": session.user.email ?? ""
                        ]
                    ])
                } else {
                    call.resolve([
                        "success": false,
                        "session": nil
                    ])
                }
            } catch {
                call.reject("Failed to get session: \(error.localizedDescription)")
            }
        }
    }
}
