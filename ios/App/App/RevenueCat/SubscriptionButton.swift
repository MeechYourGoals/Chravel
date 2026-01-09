//
//  SubscriptionButton.swift
//  ChravelApp
//
//  Reusable subscription button and status views.
//

import SwiftUI
import RevenueCat

/// Subscription status banner for displaying in app
struct SubscriptionStatusBanner: View {
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @State private var showPaywall = false
    @State private var showCustomerCenter = false
    
    var body: some View {
        Button {
            if subscriptionManager.isSubscribed {
                showCustomerCenter = true
            } else {
                showPaywall = true
            }
        } label: {
            HStack(spacing: 12) {
                // Icon
                ZStack {
                    Circle()
                        .fill(
                            subscriptionManager.isSubscribed ?
                            LinearGradient(colors: [.blue, .purple], startPoint: .topLeading, endPoint: .bottomTrailing) :
                            LinearGradient(colors: [.gray, .gray.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
                        )
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: subscriptionManager.isSubscribed ? "crown.fill" : "sparkles")
                        .foregroundColor(.white)
                        .font(.system(size: 16, weight: .bold))
                }
                
                // Text
                VStack(alignment: .leading, spacing: 2) {
                    Text(subscriptionManager.currentTierName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.white)
                    
                    if subscriptionManager.isSubscribed {
                        if let date = subscriptionManager.subscriptionExpirationDate {
                            Text("Renews \(date.formatted(date: .abbreviated, time: .omitted))")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    } else {
                        Text("Tap to upgrade")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
        .sheet(isPresented: $showCustomerCenter) {
            CustomerCenterView()
        }
    }
}

/// Compact upgrade button for inline use
struct UpgradeButton: View {
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @State private var showPaywall = false
    
    var compact: Bool = false
    
    var body: some View {
        if !subscriptionManager.isSubscribed {
            Button {
                showPaywall = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.caption.weight(.bold))
                    Text(compact ? "Pro" : "Upgrade to Pro")
                        .font(.caption.weight(.semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, compact ? 10 : 14)
                .padding(.vertical, 8)
                .background(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(20)
            }
            .sheet(isPresented: $showPaywall) {
                PaywallView()
            }
        }
    }
}

/// Pro badge for indicating premium features
struct ProBadge: View {
    var small: Bool = false
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "crown.fill")
            if !small {
                Text("PRO")
            }
        }
        .font(small ? .caption2.weight(.bold) : .caption.weight(.bold))
        .foregroundColor(.white)
        .padding(.horizontal, small ? 6 : 8)
        .padding(.vertical, small ? 3 : 4)
        .background(
            LinearGradient(
                colors: [.orange, .red],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(small ? 6 : 8)
    }
}

/// Feature lock overlay for premium features
struct FeatureLockView: View {
    let featureName: String
    let requiredTier: String
    
    @State private var showPaywall = false
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "lock.fill")
                .font(.largeTitle)
                .foregroundColor(.gray)
            
            Text("\(featureName) requires \(requiredTier)")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
            
            Button {
                showPaywall = true
            } label: {
                Text("Upgrade Now")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(20)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.8))
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
    }
}

/// View modifier for gating content behind subscription
struct SubscriptionGate: ViewModifier {
    let requiredEntitlement: EntitlementID
    let featureName: String
    
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    
    func body(content: Content) -> some View {
        ZStack {
            content
                .blur(radius: subscriptionManager.hasEntitlement(requiredEntitlement) ? 0 : 6)
                .disabled(!subscriptionManager.hasEntitlement(requiredEntitlement))
            
            if !subscriptionManager.hasEntitlement(requiredEntitlement) {
                FeatureLockView(
                    featureName: featureName,
                    requiredTier: requiredEntitlement == .frequentChraveler ? "Frequent Chraveler" : "Explorer"
                )
            }
        }
    }
}

extension View {
    /// Gate content behind a subscription entitlement
    func requiresSubscription(_ entitlement: EntitlementID, featureName: String) -> some View {
        modifier(SubscriptionGate(requiredEntitlement: entitlement, featureName: featureName))
    }
}

#Preview("Status Banner") {
    VStack {
        SubscriptionStatusBanner()
    }
    .padding()
    .background(Color(hex: "1a1a2e"))
}

#Preview("Upgrade Button") {
    HStack {
        UpgradeButton()
        UpgradeButton(compact: true)
    }
    .padding()
    .background(Color(hex: "1a1a2e"))
}

#Preview("Pro Badge") {
    HStack {
        ProBadge()
        ProBadge(small: true)
    }
    .padding()
    .background(Color(hex: "1a1a2e"))
}
