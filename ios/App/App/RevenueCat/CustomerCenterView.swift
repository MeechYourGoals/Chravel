//
//  CustomerCenterView.swift
//  ChravelApp
//
//  RevenueCat Customer Center for subscription management.
//  Allows users to view, modify, and cancel subscriptions.
//

import SwiftUI
import RevenueCat
import RevenueCatUI

/// Customer Center view for subscription management
struct CustomerCenterView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    
    @State private var isLoading = true
    @State private var showCancelConfirmation = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color(hex: "1a1a2e")
                    .ignoresSafeArea()
                
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Current subscription status
                            subscriptionStatusCard
                            
                            // Subscription details
                            if subscriptionManager.isSubscribed {
                                subscriptionDetailsCard
                            }
                            
                            // Actions
                            actionsSection
                            
                            // Help section
                            helpSection
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
            .alert("Cancel Subscription?", isPresented: $showCancelConfirmation) {
                Button("Keep Subscription", role: .cancel) {}
                Button("Cancel in Settings", role: .destructive) {
                    openSubscriptionSettings()
                }
            } message: {
                Text("To cancel your subscription, you'll be redirected to your App Store subscription settings.")
            }
            .task {
                await loadCustomerInfo()
            }
        }
    }
    
    // MARK: - Subscription Status Card
    
    private var subscriptionStatusCard: some View {
        VStack(spacing: 16) {
            // Status icon
            ZStack {
                Circle()
                    .fill(
                        subscriptionManager.isSubscribed ?
                        LinearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing) :
                        LinearGradient(colors: [.gray, .gray.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .frame(width: 80, height: 80)
                
                Image(systemName: subscriptionManager.isSubscribed ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .font(.system(size: 36))
                    .foregroundColor(.white)
            }
            
            // Status text
            Text(subscriptionManager.isSubscribed ? "Active Subscription" : "No Active Subscription")
                .font(.title2.bold())
                .foregroundColor(.white)
            
            Text(subscriptionManager.currentTierName)
                .font(.headline)
                .foregroundColor(.blue)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.05))
        )
    }
    
    // MARK: - Subscription Details Card
    
    private var subscriptionDetailsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Subscription Details")
                .font(.headline)
                .foregroundColor(.white)
            
            Divider()
                .background(Color.white.opacity(0.2))
            
            // Plan
            detailRow(title: "Plan", value: subscriptionManager.currentTierName)
            
            // Renewal date
            if let expirationDate = subscriptionManager.subscriptionExpirationDate {
                detailRow(
                    title: "Renews",
                    value: expirationDate.formatted(date: .abbreviated, time: .omitted)
                )
            }
            
            // Customer ID
            if let customerId = subscriptionManager.customerInfo?.originalAppUserId {
                detailRow(title: "Customer ID", value: String(customerId.prefix(12)) + "...")
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
    }
    
    private func detailRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .foregroundColor(.white)
                .fontWeight(.medium)
        }
        .font(.subheadline)
    }
    
    // MARK: - Actions Section
    
    private var actionsSection: some View {
        VStack(spacing: 12) {
            if subscriptionManager.isSubscribed {
                // Manage subscription button
                Button {
                    openSubscriptionSettings()
                } label: {
                    HStack {
                        Image(systemName: "gear")
                        Text("Manage Subscription")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.white.opacity(0.1))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                
                // Cancel subscription button
                Button {
                    showCancelConfirmation = true
                } label: {
                    HStack {
                        Image(systemName: "xmark.circle")
                        Text("Cancel Subscription")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.red.opacity(0.2))
                    .foregroundColor(.red)
                    .cornerRadius(12)
                }
            } else {
                // Upgrade button
                NavigationLink {
                    PaywallView()
                } label: {
                    HStack {
                        Image(systemName: "sparkles")
                        Text("Upgrade to Pro")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
            }
            
            // Restore purchases
            Button {
                Task {
                    try? await subscriptionManager.restorePurchases()
                }
            } label: {
                Text("Restore Purchases")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            .padding(.top, 8)
        }
    }
    
    // MARK: - Help Section
    
    private var helpSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Need Help?")
                .font(.headline)
                .foregroundColor(.white)
            
            VStack(spacing: 8) {
                helpLink(
                    icon: "envelope",
                    title: "Contact Support",
                    url: "mailto:support@chravel.app"
                )
                
                helpLink(
                    icon: "questionmark.circle",
                    title: "FAQ",
                    url: "https://chravel.app/faq"
                )
                
                helpLink(
                    icon: "doc.text",
                    title: "Terms of Service",
                    url: "https://chravel.app/terms"
                )
                
                helpLink(
                    icon: "lock.shield",
                    title: "Privacy Policy",
                    url: "https://chravel.app/privacy"
                )
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
    }
    
    private func helpLink(icon: String, title: String, url: String) -> some View {
        Link(destination: URL(string: url)!) {
            HStack {
                Image(systemName: icon)
                    .frame(width: 24)
                Text(title)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - Actions
    
    private func loadCustomerInfo() async {
        do {
            try await subscriptionManager.refreshCustomerInfo()
        } catch {
            print("Error loading customer info: \(error)")
        }
        isLoading = false
    }
    
    private func openSubscriptionSettings() {
        if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - RevenueCat Native Customer Center (When Available)

/// Uses RevenueCat's built-in CustomerCenterView when available (RC SDK 5.0+)
@available(iOS 15.0, *)
struct RevenueCatCustomerCenterView: View {
    var body: some View {
        // RevenueCat's CustomerCenter is available in RevenueCatUI 5.0+
        // For now, use our custom implementation
        CustomerCenterView()
    }
}

#Preview {
    CustomerCenterView()
}
