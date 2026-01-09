//
//  PaywallView.swift
//  ChravelApp
//
//  Custom paywall UI for RevenueCat subscriptions.
//  Displays Explorer and Frequent Chraveler tiers with pricing.
//

import SwiftUI
import RevenueCat
import RevenueCatUI

/// Main paywall view with tier selection
struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    
    @State private var selectedTier: SubscriptionTier = .explorer
    @State private var billingCycle: BillingCycle = .monthly
    @State private var isPurchasing = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    enum BillingCycle: String, CaseIterable {
        case monthly = "Monthly"
        case annual = "Annual"
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection
                    
                    // Billing cycle toggle
                    billingToggle
                    
                    // Tier cards
                    tierCards
                    
                    // Subscribe button
                    subscribeButton
                    
                    // Restore purchases
                    restoreButton
                    
                    // Terms
                    termsSection
                }
                .padding()
            }
            .background(
                LinearGradient(
                    colors: [Color(hex: "1a1a2e"), Color(hex: "16213e")],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .task {
                await loadOfferings()
            }
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
            
            Text("Upgrade to Chravel Pro")
                .font(.title.bold())
                .foregroundColor(.white)
            
            Text("Unlock all features and travel smarter")
                .font(.subheadline)
                .foregroundColor(.gray)
        }
        .padding(.top, 20)
    }
    
    // MARK: - Billing Toggle
    
    private var billingToggle: some View {
        HStack(spacing: 0) {
            ForEach(BillingCycle.allCases, id: \.self) { cycle in
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        billingCycle = cycle
                    }
                } label: {
                    Text(cycle.rawValue)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(billingCycle == cycle ? .white : .gray)
                        .padding(.vertical, 10)
                        .padding(.horizontal, 24)
                        .background(
                            billingCycle == cycle ?
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            ) : LinearGradient(colors: [.clear], startPoint: .leading, endPoint: .trailing)
                        )
                        .cornerRadius(20)
                }
            }
        }
        .background(Color.white.opacity(0.1))
        .cornerRadius(20)
    }
    
    // MARK: - Tier Cards
    
    private var tierCards: some View {
        VStack(spacing: 16) {
            ForEach(SubscriptionTier.allTiers) { tier in
                TierCard(
                    tier: tier,
                    isSelected: selectedTier.id == tier.id,
                    billingCycle: billingCycle,
                    package: billingCycle == .monthly ?
                        subscriptionManager.getMonthlyPackage(for: tier) :
                        subscriptionManager.getAnnualPackage(for: tier)
                ) {
                    withAnimation(.spring(response: 0.3)) {
                        selectedTier = tier
                    }
                }
            }
        }
    }
    
    // MARK: - Subscribe Button
    
    private var subscribeButton: some View {
        Button {
            Task {
                await purchaseSelected()
            }
        } label: {
            HStack {
                if isPurchasing {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Subscribe to \(selectedTier.name)")
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    colors: [.blue, .purple],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(14)
        }
        .disabled(isPurchasing || subscriptionManager.isLoading)
    }
    
    // MARK: - Restore Button
    
    private var restoreButton: some View {
        Button {
            Task {
                await restorePurchases()
            }
        } label: {
            Text("Restore Purchases")
                .font(.subheadline)
                .foregroundColor(.gray)
        }
    }
    
    // MARK: - Terms Section
    
    private var termsSection: some View {
        VStack(spacing: 8) {
            Text("Subscriptions auto-renew until cancelled.")
                .font(.caption)
                .foregroundColor(.gray)
            
            HStack(spacing: 16) {
                Link("Privacy Policy", destination: URL(string: "https://chravel.app/privacy")!)
                Link("Terms of Use", destination: URL(string: "https://chravel.app/terms")!)
            }
            .font(.caption)
            .foregroundColor(.blue)
        }
        .padding(.top, 8)
    }
    
    // MARK: - Actions
    
    private func loadOfferings() async {
        do {
            try await subscriptionManager.fetchOfferings()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
    
    private func purchaseSelected() async {
        isPurchasing = true
        defer { isPurchasing = false }
        
        let package: Package?
        if billingCycle == .monthly {
            package = subscriptionManager.getMonthlyPackage(for: selectedTier)
        } else {
            package = subscriptionManager.getAnnualPackage(for: selectedTier)
        }
        
        guard let package = package else {
            errorMessage = "Subscription package not available"
            showError = true
            return
        }
        
        do {
            _ = try await subscriptionManager.purchase(package: package)
            dismiss()
        } catch SubscriptionError.userCancelled {
            // User cancelled, don't show error
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
    
    private func restorePurchases() async {
        isPurchasing = true
        defer { isPurchasing = false }
        
        do {
            let info = try await subscriptionManager.restorePurchases()
            if info.entitlements.active.isEmpty {
                errorMessage = "No purchases to restore"
                showError = true
            } else {
                dismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}

// MARK: - Tier Card

struct TierCard: View {
    let tier: SubscriptionTier
    let isSelected: Bool
    let billingCycle: PaywallView.BillingCycle
    let package: Package?
    let onTap: () -> Void
    
    private var priceText: String {
        if let package = package {
            return package.localizedPriceString
        }
        return billingCycle == .monthly ? tier.monthlyPrice : tier.annualPrice
    }
    
    private var periodText: String {
        if billingCycle == .monthly {
            return "/month"
        } else {
            return "/year"
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(tier.name)
                                .font(.title3.bold())
                                .foregroundColor(.white)
                            
                            if tier.id == "frequent-chraveler" {
                                Text("BEST VALUE")
                                    .font(.caption2.bold())
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.orange)
                                    .cornerRadius(8)
                            }
                        }
                        
                        Text(tier.description)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(priceText)
                            .font(.title2.bold())
                            .foregroundColor(.white)
                        Text(periodText)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                
                Divider()
                    .background(Color.white.opacity(0.2))
                
                // Features list
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(tier.features, id: \.self) { feature in
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                            Text(feature)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.9))
                        }
                    }
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                isSelected ?
                                LinearGradient(colors: [.blue, .purple], startPoint: .leading, endPoint: .trailing) :
                                LinearGradient(colors: [.white.opacity(0.2)], startPoint: .leading, endPoint: .trailing),
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - RevenueCat Native Paywall Wrapper

/// Uses RevenueCat's built-in PaywallView for quick implementation
struct RevenueCatPaywallView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        PaywallView { customerInfo in
            // Purchase completed
            dismiss()
        }
        .paywallFooter {
            // Optional custom footer
            VStack(spacing: 8) {
                Text("Subscriptions auto-renew until cancelled.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    PaywallView()
}
