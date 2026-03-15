import Foundation

/// Bridges auth state from the main Capacitor app to the Share Extension
/// via App Group shared UserDefaults and Keychain Access Group.
enum AuthBridge {

    private static let accessTokenKey = "chravel_share_access_token"
    private static let refreshTokenKey = "chravel_share_refresh_token"
    private static let userIdKey = "chravel_share_user_id"
    private static let userDisplayNameKey = "chravel_share_user_display_name"
    private static let tokenExpiryKey = "chravel_share_token_expiry"
    private static let supabaseURLKey = "chravel_supabase_url"
    private static let supabaseAnonKey = "chravel_supabase_anon_key"

    private static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: ChravelAppGroup.identifier)
    }

    // MARK: - Write (called from main app)

    /// Sync current auth state to shared container. Call on login/token refresh.
    static func syncAuthState(
        accessToken: String,
        refreshToken: String,
        userId: String,
        displayName: String?,
        expiresAt: Date?,
        supabaseURL: String,
        supabaseAnonKey: String
    ) {
        guard let defaults = sharedDefaults else { return }
        defaults.set(accessToken, forKey: accessTokenKey)
        defaults.set(refreshToken, forKey: refreshTokenKey)
        defaults.set(userId, forKey: userIdKey)
        defaults.set(displayName, forKey: userDisplayNameKey)
        defaults.set(expiresAt?.timeIntervalSince1970, forKey: tokenExpiryKey)
        defaults.set(supabaseURL, forKey: supabaseURLKey)
        defaults.set(supabaseAnonKey, forKey: supabaseAnonKey)
    }

    /// Clear auth state from shared container. Call on logout.
    static func clearAuthState() {
        guard let defaults = sharedDefaults else { return }
        [accessTokenKey, refreshTokenKey, userIdKey, userDisplayNameKey,
         tokenExpiryKey, supabaseURLKey, supabaseAnonKey].forEach {
            defaults.removeObject(forKey: $0)
        }
    }

    // MARK: - Read (called from extension)

    struct SharedAuthState {
        let accessToken: String
        let refreshToken: String
        let userId: String
        let displayName: String?
        let expiresAt: Date?
        let supabaseURL: String
        let supabaseAnonKey: String

        var isExpired: Bool {
            guard let expiry = expiresAt else { return false }
            // Consider expired if within 60 seconds of expiry
            return expiry.timeIntervalSinceNow < 60
        }
    }

    /// Read current auth state from shared container. Returns nil if not signed in.
    static func readAuthState() -> SharedAuthState? {
        guard let defaults = sharedDefaults else { return nil }
        guard let accessToken = defaults.string(forKey: accessTokenKey),
              let refreshToken = defaults.string(forKey: refreshTokenKey),
              let userId = defaults.string(forKey: userIdKey),
              let supabaseURL = defaults.string(forKey: supabaseURLKey),
              let anonKey = defaults.string(forKey: supabaseAnonKey) else {
            return nil
        }

        let displayName = defaults.string(forKey: userDisplayNameKey)
        let expiryTimestamp = defaults.double(forKey: tokenExpiryKey)
        let expiresAt = expiryTimestamp > 0 ? Date(timeIntervalSince1970: expiryTimestamp) : nil

        return SharedAuthState(
            accessToken: accessToken,
            refreshToken: refreshToken,
            userId: userId,
            displayName: displayName,
            expiresAt: expiresAt,
            supabaseURL: supabaseURL,
            supabaseAnonKey: anonKey
        )
    }

    /// Check if a valid auth session exists without loading full state.
    static var isSignedIn: Bool {
        guard let defaults = sharedDefaults else { return false }
        return defaults.string(forKey: accessTokenKey) != nil &&
               defaults.string(forKey: userIdKey) != nil
    }
}
