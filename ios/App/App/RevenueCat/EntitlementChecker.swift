//
//  EntitlementChecker.swift
//  ChravelApp
//
//  Utility for checking entitlements throughout the app.
//  Use these functions to gate features based on subscription tier.
//

import Foundation
import RevenueCat

/// Entitlement checking utilities
struct EntitlementChecker {
    
    // MARK: - Quick Checks (Synchronous)
    
    /// Check if user has ChravelApp Pro access (any paid subscription)
    static var hasProAccess: Bool {
        SubscriptionManager.shared.isSubscribed
    }
    
    /// Check if user has Explorer tier or higher
    static var hasExplorer: Bool {
        SubscriptionManager.shared.hasExplorer || SubscriptionManager.shared.hasFrequentChraveler
    }
    
    /// Check if user has Frequent Chraveler tier
    static var hasFrequentChraveler: Bool {
        SubscriptionManager.shared.hasFrequentChraveler
    }
    
    // MARK: - Feature-Specific Checks
    
    /// Check if user can use extended AI queries (Explorer+)
    static var canUseExtendedAI: Bool {
        hasExplorer
    }
    
    /// Check if user can use unlimited AI queries (Frequent Chraveler)
    static var canUseUnlimitedAI: Bool {
        hasFrequentChraveler
    }
    
    /// Check if user can create unlimited trips (Frequent Chraveler)
    static var canCreateUnlimitedTrips: Bool {
        hasFrequentChraveler
    }
    
    /// Check if user can export PDFs (Explorer+)
    static var canExportPDF: Bool {
        hasExplorer
    }
    
    /// Check if user can sync calendar (Explorer+)
    static var canSyncCalendar: Bool {
        hasExplorer
    }
    
    /// Check if user can create Pro trips (Frequent Chraveler)
    static var canCreateProTrips: Bool {
        hasFrequentChraveler
    }
    
    /// Check if user can create events (Frequent Chraveler)
    static var canCreateEvents: Bool {
        hasFrequentChraveler
    }
    
    // MARK: - Tier-Based Limits
    
    /// Get AI query limit based on subscription
    static var aiQueryLimit: Int {
        if hasFrequentChraveler {
            return Int.max // Unlimited
        } else if hasExplorer {
            return 100 // Extended
        } else {
            return 10 // Basic
        }
    }
    
    /// Get trip limit based on subscription
    static var tripLimit: Int {
        if hasFrequentChraveler {
            return Int.max // Unlimited
        } else if hasExplorer {
            return 25 // Extended
        } else {
            return 5 // Basic
        }
    }
    
    /// Get storage limit in MB based on subscription
    static var storageLimitMB: Int {
        if hasFrequentChraveler {
            return Int.max // Unlimited
        } else if hasExplorer {
            return 5120 // 5GB
        } else {
            return 500 // 500MB
        }
    }
    
    /// Get event attendee limit based on subscription
    static var eventAttendeeLimit: Int {
        if hasFrequentChraveler {
            return 100
        } else {
            return 0 // Can't create events
        }
    }
    
    // MARK: - Async Checks (With Refresh)
    
    /// Verify entitlement with fresh data from RevenueCat
    static func verifyEntitlement(_ entitlement: EntitlementID) async -> Bool {
        do {
            try await SubscriptionManager.shared.refreshCustomerInfo()
            return SubscriptionManager.shared.hasEntitlement(entitlement)
        } catch {
            print("[EntitlementChecker] Error verifying entitlement: \(error)")
            // Fall back to cached value
            return SubscriptionManager.shared.hasEntitlement(entitlement)
        }
    }
    
    /// Verify Pro access with fresh data
    static func verifyProAccess() async -> Bool {
        do {
            try await SubscriptionManager.shared.refreshCustomerInfo()
            return SubscriptionManager.shared.isSubscribed
        } catch {
            print("[EntitlementChecker] Error verifying Pro access: \(error)")
            return SubscriptionManager.shared.isSubscribed
        }
    }
}

// MARK: - SwiftUI Environment Key

import SwiftUI

private struct SubscriptionManagerKey: EnvironmentKey {
    static let defaultValue = SubscriptionManager.shared
}

extension EnvironmentValues {
    var subscriptionManager: SubscriptionManager {
        get { self[SubscriptionManagerKey.self] }
        set { self[SubscriptionManagerKey.self] = newValue }
    }
}

// MARK: - Convenience Property Wrapper

/// Property wrapper for easy entitlement checking in views
@propertyWrapper
struct RequiresEntitlement: DynamicProperty {
    let entitlement: EntitlementID
    
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    
    var wrappedValue: Bool {
        subscriptionManager.hasEntitlement(entitlement)
    }
    
    init(_ entitlement: EntitlementID) {
        self.entitlement = entitlement
    }
}

// MARK: - Usage Example

/*
 
// In any SwiftUI view:

struct MyFeatureView: View {
    @RequiresEntitlement(.frequentChraveler) var hasAccess
    
    var body: some View {
        if hasAccess {
            // Show premium content
            Text("Premium Feature")
        } else {
            // Show upgrade prompt
            UpgradeButton()
        }
    }
}

// Or use the view modifier:

struct AnotherView: View {
    var body: some View {
        PremiumContent()
            .requiresSubscription(.explorer, featureName: "PDF Export")
    }
}

// Or use static checks:

func someFunction() {
    if EntitlementChecker.canExportPDF {
        exportPDF()
    } else {
        showUpgradePrompt()
    }
}

*/
