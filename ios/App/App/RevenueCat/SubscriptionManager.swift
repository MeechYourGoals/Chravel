//
//  SubscriptionManager.swift
//  ChravelApp
//
//  RevenueCat subscription management singleton.
//  Handles customer info, entitlements, and purchases.
//

import Foundation
import RevenueCat
import Combine

/// Entitlement identifiers - must match RevenueCat dashboard
enum EntitlementID: String {
    case explorer = "chravel_explorer"
    case frequentChraveler = "chravel_frequent_chraveler"
    
    // Pro tiers (for future B2B mobile use)
    case proStarter = "chravel_pro_starter"
    case proGrowth = "chravel_pro_growth"
    case proEnterprise = "chravel_pro_enterprise"
}

/// Product identifiers - must match App Store Connect
enum ProductID: String {
    // Explorer tier - $9.99/month, $99/year
    case explorerMonthly = "com.chravel.explorer.monthly"
    case explorerAnnual = "com.chravel.explorer.annual"
    
    // Frequent Chraveler tier - $19.99/month, $199/year
    case frequentChravelerMonthly = "com.chravel.frequentchraveler.monthly"
    case frequentChravelerAnnual = "com.chravel.frequentchraveler.annual"
}

/// Subscription tier with pricing info for display
struct SubscriptionTier: Identifiable, Equatable {
    let id: String
    let name: String
    let description: String
    let monthlyPrice: String
    let annualPrice: String
    let features: [String]
    let entitlementId: EntitlementID
    
    static let explorer = SubscriptionTier(
        id: "explorer",
        name: "Explorer",
        description: "Perfect for casual travelers",
        monthlyPrice: "$9.99",
        annualPrice: "$99/year (Save 17%)",
        features: [
            "Extended AI queries (100/month)",
            "Up to 25 trips",
            "PDF export",
            "Calendar sync",
            "Priority support"
        ],
        entitlementId: .explorer
    )
    
    static let frequentChraveler = SubscriptionTier(
        id: "frequent-chraveler",
        name: "Frequent Chraveler",
        description: "For power travelers who want it all",
        monthlyPrice: "$19.99",
        annualPrice: "$199/year (Save 17%)",
        features: [
            "Unlimited AI queries",
            "Unlimited trips",
            "Unlimited storage",
            "Create Pro trips",
            "Create events (up to 100 attendees)",
            "All Explorer features"
        ],
        entitlementId: .frequentChraveler
    )
    
    static let allTiers: [SubscriptionTier] = [.explorer, .frequentChraveler]
}

/// Main subscription manager using RevenueCat
@MainActor
final class SubscriptionManager: ObservableObject {
    
    // MARK: - Singleton
    static let shared = SubscriptionManager()
    
    // MARK: - Published Properties
    @Published private(set) var customerInfo: CustomerInfo?
    @Published private(set) var offerings: Offerings?
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    
    // MARK: - Computed Properties
    
    /// Current active entitlement ID
    var activeEntitlement: EntitlementID? {
        guard let entitlements = customerInfo?.entitlements.active else { return nil }
        
        // Check in order of priority (highest tier first)
        if entitlements[EntitlementID.frequentChraveler.rawValue]?.isActive == true {
            return .frequentChraveler
        }
        if entitlements[EntitlementID.explorer.rawValue]?.isActive == true {
            return .explorer
        }
        
        return nil
    }
    
    /// Check if user has any active subscription
    var isSubscribed: Bool {
        activeEntitlement != nil
    }
    
    /// Check if user has Explorer tier
    var hasExplorer: Bool {
        hasEntitlement(.explorer)
    }
    
    /// Check if user has Frequent Chraveler tier
    var hasFrequentChraveler: Bool {
        hasEntitlement(.frequentChraveler)
    }
    
    /// Check if user has "ChravelApp Pro" entitlement (any paid tier)
    var hasProAccess: Bool {
        isSubscribed
    }
    
    /// Current subscription tier name for display
    var currentTierName: String {
        switch activeEntitlement {
        case .frequentChraveler:
            return "Frequent Chraveler"
        case .explorer:
            return "Explorer"
        default:
            return "Free"
        }
    }
    
    /// Subscription expiration date
    var subscriptionExpirationDate: Date? {
        guard let entitlement = activeEntitlement else { return nil }
        return customerInfo?.entitlements.active[entitlement.rawValue]?.expirationDate
    }
    
    // MARK: - Initialization
    
    private init() {
        // Listen for customer info updates
        Purchases.shared.delegate = self
    }
    
    // MARK: - Configuration
    
    /// Configure RevenueCat with API key - call from AppDelegate
    static func configure(apiKey: String, userId: String? = nil) {
        Purchases.logLevel = .debug // Set to .warn in production
        
        if let userId = userId {
            Purchases.configure(withAPIKey: apiKey, appUserID: userId)
        } else {
            Purchases.configure(withAPIKey: apiKey)
        }
        
        // Enable syncing with StoreKit 2
        Purchases.shared.attribution.enableAdServicesAttributionTokenCollection()
        
        print("[RevenueCat] Configured with userId: \(userId ?? "anonymous")")
    }
    
    /// Login user with their app user ID (e.g., Supabase user ID)
    func login(userId: String) async throws {
        let (customerInfo, _) = try await Purchases.shared.logIn(userId)
        self.customerInfo = customerInfo
        print("[RevenueCat] Logged in user: \(userId)")
    }
    
    /// Logout user and reset to anonymous
    func logout() async throws {
        let customerInfo = try await Purchases.shared.logOut()
        self.customerInfo = customerInfo
        print("[RevenueCat] Logged out, now anonymous")
    }
    
    // MARK: - Entitlement Checks
    
    /// Check if user has a specific entitlement
    func hasEntitlement(_ entitlement: EntitlementID) -> Bool {
        customerInfo?.entitlements.active[entitlement.rawValue]?.isActive == true
    }
    
    /// Refresh customer info from RevenueCat
    func refreshCustomerInfo() async throws {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            customerInfo = try await Purchases.shared.customerInfo()
            print("[RevenueCat] Customer info refreshed")
        } catch {
            self.error = error
            print("[RevenueCat] Error refreshing customer info: \(error)")
            throw error
        }
    }
    
    // MARK: - Offerings & Purchases
    
    /// Fetch available offerings
    func fetchOfferings() async throws {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            offerings = try await Purchases.shared.offerings()
            print("[RevenueCat] Offerings fetched: \(offerings?.current?.identifier ?? "none")")
        } catch {
            self.error = error
            print("[RevenueCat] Error fetching offerings: \(error)")
            throw error
        }
    }
    
    /// Purchase a package
    func purchase(package: Package) async throws -> CustomerInfo {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            let result = try await Purchases.shared.purchase(package: package)
            customerInfo = result.customerInfo
            
            if result.userCancelled {
                throw SubscriptionError.userCancelled
            }
            
            print("[RevenueCat] Purchase successful for package: \(package.identifier)")
            return result.customerInfo
        } catch {
            self.error = error
            print("[RevenueCat] Purchase error: \(error)")
            throw error
        }
    }
    
    /// Purchase a specific product by ID
    func purchaseProduct(productId: ProductID) async throws -> CustomerInfo {
        guard let offerings = offerings,
              let currentOffering = offerings.current else {
            throw SubscriptionError.offeringsNotAvailable
        }
        
        // Find the package containing this product
        let allPackages = currentOffering.availablePackages
        guard let package = allPackages.first(where: { $0.storeProduct.productIdentifier == productId.rawValue }) else {
            throw SubscriptionError.productNotFound
        }
        
        return try await purchase(package: package)
    }
    
    /// Restore purchases
    func restorePurchases() async throws -> CustomerInfo {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            customerInfo = try await Purchases.shared.restorePurchases()
            print("[RevenueCat] Purchases restored")
            return customerInfo!
        } catch {
            self.error = error
            print("[RevenueCat] Restore error: \(error)")
            throw error
        }
    }
    
    // MARK: - Helper Methods
    
    /// Get the current offering's packages
    var currentPackages: [Package] {
        offerings?.current?.availablePackages ?? []
    }
    
    /// Get monthly package for a tier
    func getMonthlyPackage(for tier: SubscriptionTier) -> Package? {
        let productId: String
        switch tier.entitlementId {
        case .explorer:
            productId = ProductID.explorerMonthly.rawValue
        case .frequentChraveler:
            productId = ProductID.frequentChravelerMonthly.rawValue
        default:
            return nil
        }
        
        return currentPackages.first { $0.storeProduct.productIdentifier == productId }
    }
    
    /// Get annual package for a tier
    func getAnnualPackage(for tier: SubscriptionTier) -> Package? {
        let productId: String
        switch tier.entitlementId {
        case .explorer:
            productId = ProductID.explorerAnnual.rawValue
        case .frequentChraveler:
            productId = ProductID.frequentChravelerAnnual.rawValue
        default:
            return nil
        }
        
        return currentPackages.first { $0.storeProduct.productIdentifier == productId }
    }
}

// MARK: - PurchasesDelegate

extension SubscriptionManager: PurchasesDelegate {
    nonisolated func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        Task { @MainActor in
            self.customerInfo = customerInfo
            print("[RevenueCat] Customer info updated via delegate")
        }
    }
}

// MARK: - Errors

enum SubscriptionError: LocalizedError {
    case userCancelled
    case offeringsNotAvailable
    case productNotFound
    case purchaseFailed(Error)
    
    var errorDescription: String? {
        switch self {
        case .userCancelled:
            return "Purchase was cancelled"
        case .offeringsNotAvailable:
            return "Subscription options are not available"
        case .productNotFound:
            return "Product not found"
        case .purchaseFailed(let error):
            return "Purchase failed: \(error.localizedDescription)"
        }
    }
}
