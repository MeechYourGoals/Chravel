// ProfileView.swift
// Chravel iOS - User Profile Screen
// Generated from MSPEC

import SwiftUI
import PhotosUI

// MARK: - Profile View

struct ProfileView: View {
    // MARK: - Environment
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(NavigationCoordinator.self) private var coordinator
    
    // MARK: - State
    @State private var showEditProfile = false
    @State private var showSettings = false
    @State private var showUpgrade = false
    @State private var showSignOutConfirmation = false
    
    // MARK: - Body
    
    var body: some View {
        ScrollView {
            VStack(spacing: ChravelSpacing.lg) {
                // Profile Header
                ProfileHeaderSection(
                    user: authViewModel.user,
                    onEditTap: { showEditProfile = true }
                )
                
                // Stats Section
                ProfileStatsSection()
                
                // Quick Actions
                QuickActionsSection(
                    onSavedPlacesTap: {
                        // Navigate to saved places
                    },
                    onTravelPrefsTap: {
                        // Navigate to travel preferences
                    },
                    onPaymentMethodsTap: {
                        // Navigate to payment methods
                    }
                )
                
                // Subscription Card
                SubscriptionCard(
                    tier: authViewModel.user?.subscriptionTier ?? .free,
                    onUpgradeTap: { showUpgrade = true }
                )
                
                // Account Actions
                AccountActionsSection(
                    onSettingsTap: { showSettings = true },
                    onSignOutTap: { showSignOutConfirmation = true }
                )
                
                // App Version
                Text("Chravel v1.0.0")
                    .font(ChravelTypography.captionSmall)
                    .foregroundColor(.textMuted)
                    .padding(.top, ChravelSpacing.lg)
            }
            .padding(ChravelSpacing.md)
        }
        .background(Color.chravelBlack)
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showEditProfile) {
            EditProfileSheet()
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .sheet(isPresented: $showUpgrade) {
            UpgradeView()
        }
        .confirmationDialog(
            "Sign Out",
            isPresented: $showSignOutConfirmation,
            titleVisibility: .visible
        ) {
            Button("Sign Out", role: .destructive) {
                Task {
                    await authViewModel.signOut()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to sign out?")
        }
    }
}

// MARK: - Profile Header Section

struct ProfileHeaderSection: View {
    let user: UserProfile?
    let onEditTap: () -> Void
    
    var body: some View {
        VStack(spacing: ChravelSpacing.md) {
            // Avatar with Edit Button
            ZStack(alignment: .bottomTrailing) {
                ChravelAvatar(
                    url: user?.avatarURL,
                    fallback: String(user?.displayName.prefix(1) ?? "?"),
                    size: .xlarge
                )
                
                Button(action: onEditTap) {
                    Image(systemName: "pencil.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.chravelOrange)
                        .background(Color.chravelBlack)
                        .clipShape(Circle())
                }
                .offset(x: 4, y: 4)
            }
            
            // Name & Email
            VStack(spacing: ChravelSpacing.xxs) {
                Text(user?.displayName ?? "Loading...")
                    .font(ChravelTypography.title2)
                    .foregroundColor(.textPrimary)
                
                Text(user?.email ?? "")
                    .font(ChravelTypography.body)
                    .foregroundColor(.textSecondary)
                
                // Verified Badge
                if user?.isVerified == true {
                    HStack(spacing: ChravelSpacing.xxs) {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundColor(.success)
                        Text("Verified")
                            .foregroundColor(.success)
                    }
                    .font(ChravelTypography.caption)
                }
            }
            
            // Bio
            if let bio = user?.bio, !bio.isEmpty {
                Text(bio)
                    .font(ChravelTypography.body)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
            }
            
            // Home City
            if let homeCity = user?.homeCity, !homeCity.isEmpty {
                HStack(spacing: ChravelSpacing.xxs) {
                    Image(systemName: "house.fill")
                        .font(.system(size: 12))
                    Text(homeCity)
                }
                .font(ChravelTypography.caption)
                .foregroundColor(.textMuted)
            }
        }
        .padding(ChravelSpacing.lg)
        .frame(maxWidth: .infinity)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
    }
}

// MARK: - Profile Stats Section

struct ProfileStatsSection: View {
    var body: some View {
        HStack(spacing: ChravelSpacing.md) {
            StatCard(
                value: "12",
                label: "Trips",
                icon: "airplane"
            )
            
            StatCard(
                value: "47",
                label: "Places",
                icon: "mappin"
            )
            
            StatCard(
                value: "8",
                label: "Friends",
                icon: "person.2"
            )
        }
    }
}

struct StatCard: View {
    let value: String
    let label: String
    let icon: String
    
    var body: some View {
        VStack(spacing: ChravelSpacing.xs) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.chravelOrange)
            
            Text(value)
                .font(ChravelTypography.title2)
                .foregroundColor(.textPrimary)
            
            Text(label)
                .font(ChravelTypography.captionSmall)
                .foregroundColor(.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(ChravelSpacing.md)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
    }
}

// MARK: - Quick Actions Section

struct QuickActionsSection: View {
    let onSavedPlacesTap: () -> Void
    let onTravelPrefsTap: () -> Void
    let onPaymentMethodsTap: () -> Void
    
    var body: some View {
        VStack(spacing: ChravelSpacing.xs) {
            ProfileActionRow(
                icon: "bookmark.fill",
                title: "Saved Places",
                subtitle: "Your bookmarked locations",
                iconColor: .chravelOrange
            ) {
                onSavedPlacesTap()
            }
            
            ProfileActionRow(
                icon: "slider.horizontal.3",
                title: "Travel Preferences",
                subtitle: "Dietary, accessibility, interests",
                iconColor: .purple
            ) {
                onTravelPrefsTap()
            }
            
            ProfileActionRow(
                icon: "creditcard.fill",
                title: "Payment Methods",
                subtitle: "Manage your payment options",
                iconColor: .success
            ) {
                onPaymentMethodsTap()
            }
        }
        .padding(ChravelSpacing.sm)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
    }
}

struct ProfileActionRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let iconColor: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            ChravelHaptics.light()
            action()
        }) {
            HStack(spacing: ChravelSpacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(iconColor)
                    .frame(width: 36, height: 36)
                    .background(iconColor.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.sm))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(ChravelTypography.label)
                        .foregroundColor(.textPrimary)
                    
                    Text(subtitle)
                        .font(ChravelTypography.captionSmall)
                        .foregroundColor(.textMuted)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textMuted)
            }
            .padding(ChravelSpacing.sm)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Subscription Card

struct SubscriptionCard: View {
    let tier: SubscriptionTier
    let onUpgradeTap: () -> Void
    
    var body: some View {
        VStack(spacing: ChravelSpacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                    HStack(spacing: ChravelSpacing.xs) {
                        Image(systemName: tier == .free ? "star" : "crown.fill")
                            .foregroundColor(tier.color)
                        
                        Text(tier.displayName)
                            .font(ChravelTypography.headline)
                            .foregroundColor(.textPrimary)
                    }
                    
                    Text(tierDescription)
                        .font(ChravelTypography.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
                
                if tier == .free || tier == .plus {
                    Button {
                        ChravelHaptics.light()
                        onUpgradeTap()
                    } label: {
                        Text("Upgrade")
                            .font(ChravelTypography.labelSmall)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, ChravelSpacing.md)
                            .padding(.vertical, ChravelSpacing.xs)
                            .background(
                                LinearGradient(
                                    colors: [.chravelOrange, .chravelYellow],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .clipShape(Capsule())
                    }
                }
            }
            
            // Features Preview
            if tier == .free {
                HStack(spacing: ChravelSpacing.md) {
                    FeaturePreview(icon: "infinity", label: "Unlimited trips")
                    FeaturePreview(icon: "sparkles", label: "AI Concierge")
                    FeaturePreview(icon: "person.3", label: "Pro features")
                }
            }
        }
        .padding(ChravelSpacing.md)
        .background(
            LinearGradient(
                colors: [
                    tier.color.opacity(0.15),
                    Color.glassWhite
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: ChravelRadius.lg)
                .stroke(tier.color.opacity(0.3), lineWidth: 1)
        )
    }
    
    private var tierDescription: String {
        switch tier {
        case .free:
            return "5 trips, basic features"
        case .plus:
            return "Unlimited trips, AI features"
        case .pro:
            return "All features, team management"
        case .enterprise:
            return "Custom solutions, dedicated support"
        }
    }
}

struct FeaturePreview: View {
    let icon: String
    let label: String
    
    var body: some View {
        VStack(spacing: ChravelSpacing.xxs) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.chravelOrange)
            
            Text(label)
                .font(ChravelTypography.captionSmall)
                .foregroundColor(.textMuted)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Account Actions Section

struct AccountActionsSection: View {
    let onSettingsTap: () -> Void
    let onSignOutTap: () -> Void
    
    var body: some View {
        VStack(spacing: ChravelSpacing.xs) {
            ProfileActionRow(
                icon: "gearshape.fill",
                title: "Settings",
                subtitle: "Notifications, privacy, account",
                iconColor: .textMuted
            ) {
                onSettingsTap()
            }
            
            ProfileActionRow(
                icon: "rectangle.portrait.and.arrow.right",
                title: "Sign Out",
                subtitle: "Sign out of your account",
                iconColor: .error
            ) {
                onSignOutTap()
            }
        }
        .padding(ChravelSpacing.sm)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
    }
}

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthViewModel.self) private var authViewModel
    
    @State private var displayName: String = ""
    @State private var bio: String = ""
    @State private var homeCity: String = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var avatarImage: UIImage?
    @State private var isLoading: Bool = false
    @State private var isSaving: Bool = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: ChravelSpacing.lg) {
                    // Avatar Picker
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        ZStack(alignment: .bottomTrailing) {
                            if let avatarImage {
                                Image(uiImage: avatarImage)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                            } else {
                                ChravelAvatar(
                                    url: authViewModel.user?.avatarURL,
                                    fallback: String(displayName.prefix(1)),
                                    size: .xlarge
                                )
                            }
                            
                            Circle()
                                .fill(Color.chravelOrange)
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Image(systemName: "camera.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white)
                                )
                        }
                    }
                    .onChange(of: selectedPhoto) { _, newValue in
                        Task {
                            if let data = try? await newValue?.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) {
                                avatarImage = image
                            }
                        }
                    }
                    
                    // Form Fields
                    VStack(spacing: ChravelSpacing.md) {
                        ChravelTextField(
                            placeholder: "Display Name",
                            text: $displayName,
                            icon: "person.fill"
                        )
                        
                        ChravelTextArea(
                            placeholder: "Bio (optional)",
                            text: $bio,
                            minHeight: 80
                        )
                        
                        ChravelTextField(
                            placeholder: "Home City (optional)",
                            text: $homeCity,
                            icon: "house.fill"
                        )
                    }
                }
                .padding(ChravelSpacing.lg)
            }
            .background(Color.chravelBlack)
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.textSecondary)
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        Task {
                            await saveProfile()
                        }
                    }
                    .fontWeight(.semibold)
                    .foregroundColor(.chravelOrange)
                    .disabled(displayName.isEmpty || isSaving)
                }
            }
            .loadingOverlay(isLoading: isSaving, message: "Saving...")
            .onAppear {
                loadCurrentProfile()
            }
        }
    }
    
    private func loadCurrentProfile() {
        if let user = authViewModel.user {
            displayName = user.displayName
            bio = user.bio ?? ""
            homeCity = user.homeCity ?? ""
        }
    }
    
    private func saveProfile() async {
        isSaving = true
        
        var avatarURL: String? = nil
        
        // Upload new avatar if selected
        if let avatarImage {
            do {
                avatarURL = try await MediaService.shared.uploadImage(
                    image: avatarImage,
                    path: "avatars/\(authViewModel.user?.id ?? "unknown")"
                )
            } catch {
                // Continue without avatar update
            }
        }
        
        let updates = ProfileUpdate(
            displayName: displayName,
            bio: bio.isEmpty ? nil : bio,
            homeCity: homeCity.isEmpty ? nil : homeCity,
            avatarURL: avatarURL
        )
        
        let success = await authViewModel.updateProfile(updates)
        
        if success {
            dismiss()
        }
        
        isSaving = false
    }
}

// MARK: - Settings View (Placeholder)

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Section("Notifications") {
                    Toggle("Push Notifications", isOn: .constant(true))
                    Toggle("Email Notifications", isOn: .constant(false))
                }
                
                Section("Privacy") {
                    Toggle("Share Location", isOn: .constant(true))
                    Toggle("Read Receipts", isOn: .constant(true))
                }
                
                Section("Account") {
                    NavigationLink("Change Password") {
                        Text("Change Password")
                    }
                    NavigationLink("Delete Account") {
                        Text("Delete Account")
                    }
                }
                
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.textMuted)
                    }
                    
                    Link("Privacy Policy", destination: URL(string: "https://chravel.app/privacy")!)
                    Link("Terms of Service", destination: URL(string: "https://chravel.app/terms")!)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Upgrade View (Placeholder)

struct UpgradeView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            VStack(spacing: ChravelSpacing.xl) {
                Image(systemName: "crown.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.chravelGold)
                
                Text("Upgrade to Pro")
                    .font(ChravelTypography.largeTitle)
                    .foregroundColor(.textPrimary)
                
                Text("Unlock unlimited trips, AI concierge, and team features")
                    .font(ChravelTypography.body)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                
                Spacer()
                
                ChravelButton(title: "Start Free Trial", style: .primary) {
                    // Handle subscription
                }
            }
            .padding(ChravelSpacing.xl)
            .background(Color.chravelBlack)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.textSecondary)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ProfileView()
    }
    .environment(AuthViewModel())
    .environment(NavigationCoordinator())
    .preferredColorScheme(.dark)
}
