=== NAVIGATION: Coordinator START ===

// NavigationCoordinator.swift
// Chravel iOS - Navigation Coordinator

import SwiftUI

// MARK: - Navigation Destinations

enum TripDestination: Hashable {
    case detail(String)          // tripId
    case proDetail(String)       // tripId
    case event(String)           // eventId
    case chat(String)            // tripId
    case media(String)           // tripId
    case payments(String)        // tripId
    case calendar(String)        // tripId
    case ai(String, String)      // tripId, tripName
    case map(String?)            // tripId (optional)
    case placeDetail(String)     // placeId
    case invite(String)          // tripId
    case settings(String)        // tripId
    case members(String)         // tripId
}

enum ProfileDestination: Hashable {
    case edit
    case settings
    case notifications
    case savedPlaces
    case travelPreferences
    case paymentMethods
    case subscription
    case organization(String)    // organizationId
}

enum RootDestination: Hashable {
    case home
    case profile
    case map
    case notifications
    case search
}

// MARK: - Tab Enum

enum AppTab: String, CaseIterable, Identifiable {
    case home = "Home"
    case map = "Map"
    case profile = "Profile"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .home: return "airplane"
        case .map: return "map"
        case .profile: return "person"
        }
    }
    
    var selectedIcon: String {
        switch self {
        case .home: return "airplane.circle.fill"
        case .map: return "map.fill"
        case .profile: return "person.fill"
        }
    }
}

// MARK: - Navigation Coordinator

@Observable
final class NavigationCoordinator {
    // MARK: - Properties
    
    var selectedTab: AppTab = .home
    
    var homeNavPath = NavigationPath()
    var mapNavPath = NavigationPath()
    var profileNavPath = NavigationPath()
    
    var presentedSheet: PresentedSheet?
    var presentedFullScreen: PresentedFullScreen?
    
    var isShowingAuth: Bool = false
    var isShowingOnboarding: Bool = false
    
    // MARK: - Active Path
    
    var activeNavPath: NavigationPath {
        get {
            switch selectedTab {
            case .home: return homeNavPath
            case .map: return mapNavPath
            case .profile: return profileNavPath
            }
        }
        set {
            switch selectedTab {
            case .home: homeNavPath = newValue
            case .map: mapNavPath = newValue
            case .profile: profileNavPath = newValue
            }
        }
    }
    
    // MARK: - Navigation Methods
    
    func navigate(to destination: TripDestination) {
        switch selectedTab {
        case .home:
            homeNavPath.append(destination)
        case .map:
            mapNavPath.append(destination)
        case .profile:
            profileNavPath.append(destination)
        }
        ChravelHaptics.selection()
    }
    
    func navigate(to destination: ProfileDestination) {
        profileNavPath.append(destination)
        ChravelHaptics.selection()
    }
    
    func popToRoot() {
        switch selectedTab {
        case .home:
            homeNavPath = NavigationPath()
        case .map:
            mapNavPath = NavigationPath()
        case .profile:
            profileNavPath = NavigationPath()
        }
    }
    
    func pop() {
        guard !activeNavPath.isEmpty else { return }
        
        switch selectedTab {
        case .home:
            homeNavPath.removeLast()
        case .map:
            mapNavPath.removeLast()
        case .profile:
            profileNavPath.removeLast()
        }
    }
    
    func switchTab(to tab: AppTab) {
        selectedTab = tab
        ChravelHaptics.selection()
    }
    
    // MARK: - Sheet Presentation
    
    func presentSheet(_ sheet: PresentedSheet) {
        presentedSheet = sheet
    }
    
    func dismissSheet() {
        presentedSheet = nil
    }
    
    func presentFullScreen(_ screen: PresentedFullScreen) {
        presentedFullScreen = screen
    }
    
    func dismissFullScreen() {
        presentedFullScreen = nil
    }
    
    // MARK: - Deep Linking
    
    func handleDeepLink(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              components.scheme == "chravel" else {
            return
        }
        
        let pathComponents = components.path.split(separator: "/").map(String.init)
        
        switch pathComponents.first {
        case "trip":
            if let tripId = pathComponents.dropFirst().first {
                switchTab(to: .home)
                navigate(to: .detail(tripId))
            }
            
        case "event":
            if let eventId = pathComponents.dropFirst().first {
                switchTab(to: .home)
                navigate(to: .event(eventId))
            }
            
        case "map":
            switchTab(to: .map)
            
        case "profile":
            switchTab(to: .profile)
            
        case "invite":
            if let code = components.queryItems?.first(where: { $0.name == "code" })?.value {
                handleInviteCode(code)
            }
            
        case "auth":
            // Handle auth callback
            if pathComponents.dropFirst().first == "callback" {
                // Process OAuth callback
            }
            
        default:
            break
        }
    }
    
    func handleInviteCode(_ code: String) {
        // Validate and process invite code
        presentSheet(.joinTrip(code))
    }
    
    // MARK: - Universal Link Handling
    
    func handleUniversalLink(_ url: URL) {
        // Handle web URLs that should open in the app
        // e.g., https://chravel.app/trip/abc123
        
        guard let host = url.host,
              host.contains("chravel") else {
            return
        }
        
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        
        switch pathComponents.first {
        case "trip":
            if let tripId = pathComponents.dropFirst().first {
                switchTab(to: .home)
                navigate(to: .detail(tripId))
            }
            
        case "join":
            if let code = pathComponents.dropFirst().first {
                handleInviteCode(code)
            }
            
        default:
            break
        }
    }
}

// MARK: - Presented Sheet

enum PresentedSheet: Identifiable, Equatable {
    case createTrip
    case createEvent
    case joinTrip(String)          // inviteCode
    case tripSettings(String)      // tripId
    case invite(String)            // tripId
    case addExpense(String)        // tripId
    case placeSearch(String?)      // tripId
    case mediaPicker(String)       // tripId
    case profile
    case settings
    case notifications
    case upgrade
    case auth
    
    var id: String {
        switch self {
        case .createTrip: return "createTrip"
        case .createEvent: return "createEvent"
        case .joinTrip(let code): return "joinTrip-\(code)"
        case .tripSettings(let id): return "tripSettings-\(id)"
        case .invite(let id): return "invite-\(id)"
        case .addExpense(let id): return "addExpense-\(id)"
        case .placeSearch(let id): return "placeSearch-\(id ?? "none")"
        case .mediaPicker(let id): return "mediaPicker-\(id)"
        case .profile: return "profile"
        case .settings: return "settings"
        case .notifications: return "notifications"
        case .upgrade: return "upgrade"
        case .auth: return "auth"
        }
    }
}

// MARK: - Presented Full Screen

enum PresentedFullScreen: Identifiable, Equatable {
    case mediaViewer(String, Int)  // mediaId, index
    case imageViewer(String)       // imageUrl
    case onboarding
    case auth
    
    var id: String {
        switch self {
        case .mediaViewer(let id, let index): return "mediaViewer-\(id)-\(index)"
        case .imageViewer(let url): return "imageViewer-\(url)"
        case .onboarding: return "onboarding"
        case .auth: return "auth"
        }
    }
}

// MARK: - Root View with Navigation

struct RootNavigationView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthViewModel.self) private var authViewModel
    
    var body: some View {
        @Bindable var coordinator = coordinator
        
        Group {
            if authViewModel.isInitializing {
                SplashView()
            } else if !authViewModel.isAuthenticated {
                LandingView()
            } else {
                MainTabView()
            }
        }
        .sheet(item: $coordinator.presentedSheet) { sheet in
            sheetContent(for: sheet)
        }
        .fullScreenCover(item: $coordinator.presentedFullScreen) { screen in
            fullScreenContent(for: screen)
        }
        .onOpenURL { url in
            if url.scheme == "chravel" {
                coordinator.handleDeepLink(url)
            } else {
                coordinator.handleUniversalLink(url)
            }
        }
    }
    
    @ViewBuilder
    private func sheetContent(for sheet: PresentedSheet) -> some View {
        switch sheet {
        case .createTrip:
            CreateTripSheet()
        case .createEvent:
            CreateTripSheet() // Same for now
        case .joinTrip(let code):
            JoinTripSheet(inviteCode: code)
        case .tripSettings(let tripId):
            TripSettingsSheet(trip: nil, onUpdate: { _ in })
        case .invite(let tripId):
            InviteSheet(tripId: tripId)
        case .addExpense(let tripId):
            AddExpenseSheet(tripId: tripId, members: [], onExpenseAdded: { _ in })
        case .placeSearch(let tripId):
            PlaceSearchSheet(tripId: tripId ?? "", onPlaceSelected: { _ in })
        case .mediaPicker(let tripId):
            MediaPickerSheet(tripId: tripId)
        case .profile:
            EditProfileSheet()
        case .settings:
            SettingsView()
        case .notifications:
            NotificationsView()
        case .upgrade:
            UpgradeView()
        case .auth:
            AuthView()
        }
    }
    
    @ViewBuilder
    private func fullScreenContent(for screen: PresentedFullScreen) -> some View {
        switch screen {
        case .mediaViewer(let mediaId, let index):
            MediaViewerView(mediaId: mediaId, initialIndex: index)
        case .imageViewer(let url):
            FullScreenImageViewer(imageUrl: url)
        case .onboarding:
            OnboardingView()
        case .auth:
            AuthView()
        }
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    
    var body: some View {
        @Bindable var coordinator = coordinator
        
        TabView(selection: $coordinator.selectedTab) {
            NavigationStack(path: $coordinator.homeNavPath) {
                HomeView()
                    .navigationDestination(for: TripDestination.self) { destination in
                        tripDestinationView(for: destination)
                    }
            }
            .tabItem {
                Label(AppTab.home.rawValue, systemImage: coordinator.selectedTab == .home ? AppTab.home.selectedIcon : AppTab.home.icon)
            }
            .tag(AppTab.home)
            
            NavigationStack(path: $coordinator.mapNavPath) {
                MapView()
                    .navigationDestination(for: TripDestination.self) { destination in
                        tripDestinationView(for: destination)
                    }
            }
            .tabItem {
                Label(AppTab.map.rawValue, systemImage: coordinator.selectedTab == .map ? AppTab.map.selectedIcon : AppTab.map.icon)
            }
            .tag(AppTab.map)
            
            NavigationStack(path: $coordinator.profileNavPath) {
                ProfileView()
                    .navigationDestination(for: ProfileDestination.self) { destination in
                        profileDestinationView(for: destination)
                    }
            }
            .tabItem {
                Label(AppTab.profile.rawValue, systemImage: coordinator.selectedTab == .profile ? AppTab.profile.selectedIcon : AppTab.profile.icon)
            }
            .tag(AppTab.profile)
        }
        .tint(.chravelOrange)
    }
    
    @ViewBuilder
    private func tripDestinationView(for destination: TripDestination) -> some View {
        switch destination {
        case .detail(let tripId):
            TripDetailView(tripId: tripId)
        case .proDetail(let tripId):
            TripDetailView(tripId: tripId) // Pro version
        case .event(let eventId):
            TripDetailView(tripId: eventId) // Event version
        case .chat(let tripId):
            ChatTabView(viewModel: ChatViewModel(tripId: tripId))
        case .media(let tripId):
            MediaTabView(tripId: tripId)
        case .payments(let tripId):
            PaymentsView(tripId: tripId)
        case .calendar(let tripId):
            CalendarTabView(tripId: tripId)
        case .ai(let tripId, let tripName):
            AIConciergeView(tripId: tripId, tripName: tripName)
        case .map(let tripId):
            MapView(tripId: tripId)
        case .placeDetail(let placeId):
            Text("Place Detail: \(placeId)")
        case .invite(let tripId):
            Text("Invite: \(tripId)")
        case .settings(let tripId):
            Text("Trip Settings: \(tripId)")
        case .members(let tripId):
            Text("Members: \(tripId)")
        }
    }
    
    @ViewBuilder
    private func profileDestinationView(for destination: ProfileDestination) -> some View {
        switch destination {
        case .edit:
            EditProfileSheet()
        case .settings:
            SettingsView()
        case .notifications:
            NotificationsView()
        case .savedPlaces:
            Text("Saved Places")
        case .travelPreferences:
            Text("Travel Preferences")
        case .paymentMethods:
            Text("Payment Methods")
        case .subscription:
            UpgradeView()
        case .organization(let orgId):
            Text("Organization: \(orgId)")
        }
    }
}

// MARK: - Placeholder Views

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.chravelBlack.ignoresSafeArea()
            
            VStack(spacing: ChravelSpacing.md) {
                Image(systemName: "airplane.circle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.chravelOrange)
                
                Text("Chravel")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
                
                ProgressView()
                    .tint(.chravelOrange)
            }
        }
    }
}

struct LandingView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    
    var body: some View {
        ZStack {
            AuthBackground()
            
            VStack(spacing: ChravelSpacing.xl) {
                Spacer()
                
                LogoHeader()
                
                Spacer()
                
                VStack(spacing: ChravelSpacing.md) {
                    ChravelButton(title: "Get Started", style: .primary) {
                        coordinator.presentFullScreen(.auth)
                    }
                    
                    ChravelButton(title: "Sign In", style: .secondary) {
                        coordinator.presentFullScreen(.auth)
                    }
                }
                .padding(.horizontal, ChravelSpacing.xl)
                .padding(.bottom, ChravelSpacing.xxxl)
            }
        }
    }
}

struct OnboardingView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack {
            Text("Onboarding")
            Button("Done") { dismiss() }
        }
    }
}

struct NotificationsView: View {
    var body: some View {
        Text("Notifications")
    }
}

struct JoinTripSheet: View {
    @Environment(\.dismiss) private var dismiss
    let inviteCode: String
    
    var body: some View {
        NavigationStack {
            VStack {
                Text("Join Trip")
                Text("Code: \(inviteCode)")
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

struct MediaPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let tripId: String
    
    var body: some View {
        NavigationStack {
            Text("Media Picker")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}

struct MediaViewerView: View {
    let mediaId: String
    let initialIndex: Int
    
    var body: some View {
        Text("Media Viewer")
    }
}

=== NAVIGATION: Coordinator END ===
