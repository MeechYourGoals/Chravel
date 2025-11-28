=== XCODE-PROJECT-ASSEMBLY START ===

# Chravel iOS - Xcode Project Assembly
## Complete Project Structure and Configuration

---

## 1. File + Folder Structure

```
Chravel/
├── App/
│   ├── ChravelApp.swift                 # @main App entry point
│   ├── AppDelegate.swift                # UIKit AppDelegate for push notifications
│   └── SceneDelegate.swift              # Scene lifecycle (if needed)
│
├── Config/
│   ├── Info.plist                       # App configuration
│   ├── Chravel.entitlements             # App entitlements
│   ├── Debug.xcconfig                   # Debug build settings
│   ├── Release.xcconfig                 # Release build settings
│   └── Environment.swift                # Environment configuration
│
├── Resources/
│   ├── Assets.xcassets/                 # Images, colors, app icons
│   │   ├── AppIcon.appiconset/
│   │   ├── AccentColor.colorset/
│   │   ├── Colors/
│   │   │   ├── ChravelOrange.colorset/
│   │   │   ├── ChravelYellow.colorset/
│   │   │   ├── ChravelBlack.colorset/
│   │   │   └── ...
│   │   └── Images/
│   │       ├── logo.imageset/
│   │       ├── onboarding/
│   │       └── placeholders/
│   ├── Fonts/
│   │   ├── SF-Pro-Display-Bold.otf
│   │   ├── SF-Pro-Display-Medium.otf
│   │   └── SF-Pro-Text-Regular.otf
│   ├── Localizable.strings              # Localization
│   └── LaunchScreen.storyboard          # Launch screen
│
├── Models/
│   ├── Core/
│   │   ├── Trip.swift
│   │   ├── User.swift
│   │   ├── Message.swift
│   │   ├── Payment.swift
│   │   ├── Place.swift
│   │   ├── Task.swift
│   │   ├── Poll.swift
│   │   ├── Media.swift
│   │   ├── Notification.swift
│   │   └── Itinerary.swift
│   ├── Pro/
│   │   ├── Organization.swift
│   │   ├── Broadcast.swift
│   │   ├── Channel.swift
│   │   └── Tour.swift
│   └── Events/
│       ├── Event.swift
│       ├── Session.swift
│       └── Attendee.swift
│
├── ViewModels/
│   ├── Auth/
│   │   └── AuthViewModel.swift
│   ├── Trips/
│   │   ├── TripsViewModel.swift
│   │   └── TripDetailViewModel.swift
│   ├── Chat/
│   │   └── ChatViewModel.swift
│   ├── Payments/
│   │   └── PaymentsViewModel.swift
│   ├── Map/
│   │   └── MapViewModel.swift
│   ├── AI/
│   │   └── AIConciergeViewModel.swift
│   └── Media/
│       └── MediaViewModel.swift
│
├── Views/
│   ├── Root/
│   │   ├── RootNavigationView.swift
│   │   ├── MainTabView.swift
│   │   ├── SplashView.swift
│   │   └── LandingView.swift
│   ├── Auth/
│   │   ├── AuthView.swift
│   │   ├── ForgotPasswordSheet.swift
│   │   └── OnboardingView.swift
│   ├── Home/
│   │   ├── HomeView.swift
│   │   ├── TripGridView.swift
│   │   ├── TripCard.swift
│   │   └── CreateTripSheet.swift
│   ├── TripDetail/
│   │   ├── TripDetailView.swift
│   │   ├── TripDetailHeader.swift
│   │   ├── TripTabBar.swift
│   │   ├── ChatTabView.swift
│   │   ├── MediaTabView.swift
│   │   ├── PaymentsTabView.swift
│   │   ├── CalendarTabView.swift
│   │   └── AITabView.swift
│   ├── Chat/
│   │   ├── MessageBubble.swift
│   │   ├── MessageComposer.swift
│   │   └── AttachmentPickerSheet.swift
│   ├── Payments/
│   │   ├── PaymentsView.swift
│   │   ├── BalanceSummaryCard.swift
│   │   ├── ExpensesList.swift
│   │   ├── AddExpenseSheet.swift
│   │   └── SettlementsSheet.swift
│   ├── Map/
│   │   ├── MapView.swift
│   │   ├── PlaceCard.swift
│   │   ├── PlaceDetailSheet.swift
│   │   └── MapSearchBar.swift
│   ├── AI/
│   │   ├── AIConciergeView.swift
│   │   ├── AIMessageView.swift
│   │   ├── AIWelcomeCard.swift
│   │   └── AIInputBar.swift
│   ├── Profile/
│   │   ├── ProfileView.swift
│   │   ├── EditProfileSheet.swift
│   │   ├── SettingsView.swift
│   │   └── UpgradeView.swift
│   └── Media/
│       ├── MediaGridView.swift
│       ├── MediaViewerView.swift
│       └── MediaPickerSheet.swift
│
├── Components/
│   ├── Atoms/
│   │   ├── ChravelButton.swift
│   │   ├── ChravelTextField.swift
│   │   ├── ChravelTextArea.swift
│   │   ├── ChravelAvatar.swift
│   │   ├── ChravelFAB.swift
│   │   ├── ChravelBadge.swift
│   │   └── ChravelTag.swift
│   ├── Molecules/
│   │   ├── TripCard.swift
│   │   ├── TripStatsBar.swift
│   │   ├── ViewModeSelector.swift
│   │   ├── MessageBubble.swift
│   │   ├── PaymentCard.swift
│   │   └── TaskItem.swift
│   ├── Organisms/
│   │   ├── TripHeader.swift
│   │   ├── AIMessageComponent.swift
│   │   ├── MediaGrid.swift
│   │   └── PlaceCardsCarousel.swift
│   ├── Layout/
│   │   ├── TripTabBar.swift
│   │   ├── CustomTabBar.swift
│   │   └── FlowLayout.swift
│   ├── Modifiers/
│   │   ├── GlassEffect.swift
│   │   ├── CardStyle.swift
│   │   ├── ShakeAnimation.swift
│   │   └── LoadingOverlay.swift
│   └── Empty/
│       └── EmptyStateView.swift
│
├── Services/
│   ├── Core/
│   │   ├── SupabaseClient.swift
│   │   ├── NetworkMonitor.swift
│   │   └── KeychainHelper.swift
│   ├── Trip/
│   │   ├── TripService.swift
│   │   └── TripDetailService.swift
│   ├── Chat/
│   │   └── ChatService.swift
│   ├── Payments/
│   │   └── PaymentService.swift
│   ├── Places/
│   │   ├── GooglePlacesService.swift
│   │   └── PlacesService.swift
│   ├── Media/
│   │   └── MediaService.swift
│   ├── AI/
│   │   └── AIService.swift
│   ├── Push/
│   │   └── PushNotificationService.swift
│   └── Analytics/
│       └── AnalyticsService.swift
│
├── Navigation/
│   ├── NavigationCoordinator.swift
│   ├── Destinations.swift
│   └── DeepLinkHandler.swift
│
├── Design/
│   ├── ChravelColors.swift
│   ├── ChravelTypography.swift
│   ├── ChravelSpacing.swift
│   ├── ChravelRadius.swift
│   ├── ChravelShadows.swift
│   └── ChravelHaptics.swift
│
├── Utilities/
│   ├── Extensions/
│   │   ├── Date+Extensions.swift
│   │   ├── String+Extensions.swift
│   │   ├── View+Extensions.swift
│   │   └── Color+Extensions.swift
│   ├── Helpers/
│   │   ├── CurrencyFormatter.swift
│   │   ├── DateFormatter.swift
│   │   └── ImageCompressor.swift
│   └── Validators/
│       ├── EmailValidator.swift
│       └── FormValidator.swift
│
├── Preview Content/
│   ├── PreviewMocks.swift
│   └── SampleData.swift
│
└── Tests/
    ├── ChravelTests/
    │   ├── ViewModelTests/
    │   ├── ServiceTests/
    │   └── ModelTests/
    └── ChravelUITests/
        └── ScreenTests/
```

---

## 2. Package.swift (SPM Dependencies)

```swift
// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "Chravel",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "ChravelCore",
            targets: ["ChravelCore"]
        ),
        .library(
            name: "ChravelUI",
            targets: ["ChravelUI"]
        )
    ],
    dependencies: [
        // Supabase Swift SDK
        .package(
            url: "https://github.com/supabase-community/supabase-swift.git",
            from: "2.0.0"
        ),
        
        // Google Maps SDK
        .package(
            url: "https://github.com/nicklockwood/SwiftFormat",
            from: "0.52.0"
        ),
        
        // Async Image Loading
        .package(
            url: "https://github.com/kean/Nuke.git",
            from: "12.0.0"
        ),
        
        // Lottie Animations
        .package(
            url: "https://github.com/airbnb/lottie-spm.git",
            from: "4.3.0"
        ),
        
        // Keychain Access
        .package(
            url: "https://github.com/kishikawakatsumi/KeychainAccess.git",
            from: "4.2.2"
        )
    ],
    targets: [
        .target(
            name: "ChravelCore",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "KeychainAccess", package: "KeychainAccess")
            ]
        ),
        .target(
            name: "ChravelUI",
            dependencies: [
                "ChravelCore",
                .product(name: "NukeUI", package: "Nuke"),
                .product(name: "Lottie", package: "lottie-spm")
            ]
        ),
        .testTarget(
            name: "ChravelTests",
            dependencies: ["ChravelCore"]
        )
    ]
)
```

---

## 3. App Entry Point (@main)

```swift
// ChravelApp.swift

import SwiftUI

@main
struct ChravelApp: App {
    // MARK: - App Delegate
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    // MARK: - State Objects
    @State private var authViewModel = AuthViewModel()
    @State private var coordinator = NavigationCoordinator()
    
    // MARK: - Body
    var body: some Scene {
        WindowGroup {
            RootNavigationView()
                .environment(authViewModel)
                .environment(coordinator)
                .preferredColorScheme(.dark) // Chravel uses dark mode
                .onAppear {
                    configureAppearance()
                }
        }
    }
    
    // MARK: - Appearance Configuration
    private func configureAppearance() {
        // Tab Bar
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(Color.chravelDarkGray)
        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        
        // Navigation Bar
        let navBarAppearance = UINavigationBarAppearance()
        navBarAppearance.configureWithOpaqueBackground()
        navBarAppearance.backgroundColor = UIColor(Color.chravelBlack)
        navBarAppearance.titleTextAttributes = [
            .foregroundColor: UIColor(Color.textPrimary)
        ]
        navBarAppearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor(Color.textPrimary)
        ]
        UINavigationBar.appearance().standardAppearance = navBarAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navBarAppearance
        UINavigationBar.appearance().compactAppearance = navBarAppearance
        
        // Tint Color
        UIView.appearance(whenContainedInInstancesOf: [UIAlertController.self]).tintColor = UIColor(Color.chravelOrange)
    }
}
```

---

## 4. AppDelegate (Push Notifications)

```swift
// AppDelegate.swift

import UIKit
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate {
    
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Request notification permissions
        UNUserNotificationCenter.current().delegate = self
        requestNotificationPermissions()
        
        // Register for remote notifications
        application.registerForRemoteNotifications()
        
        return true
    }
    
    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
            print("Notification permission granted: \(granted)")
        }
    }
    
    // MARK: - Remote Notifications
    
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("APNs Token: \(token)")
        
        Task {
            await PushNotificationService.shared.registerToken(token)
        }
    }
    
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Failed to register for remote notifications: \(error)")
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
    
    // Handle notification when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
    
    // Handle notification tap
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        
        // Handle deep link from notification
        if let tripId = userInfo["trip_id"] as? String {
            NotificationCenter.default.post(
                name: .didReceiveNotificationDeepLink,
                object: nil,
                userInfo: ["trip_id": tripId]
            )
        }
        
        completionHandler()
    }
}

extension Notification.Name {
    static let didReceiveNotificationDeepLink = Notification.Name("didReceiveNotificationDeepLink")
}
```

---

## 5. Environment Configuration

```swift
// Environment.swift

import Foundation

enum Environment {
    case development
    case staging
    case production
    
    static var current: Environment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }
    
    var supabaseURL: String {
        switch self {
        case .development:
            return ProcessInfo.processInfo.environment["SUPABASE_URL"] 
                ?? "https://dev.supabase.co"
        case .staging:
            return "https://staging.supabase.co"
        case .production:
            return Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String 
                ?? ""
        }
    }
    
    var supabaseAnonKey: String {
        switch self {
        case .development:
            return ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? ""
        case .staging:
            return "" // Staging key
        case .production:
            return Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String 
                ?? ""
        }
    }
    
    var googleMapsAPIKey: String {
        Bundle.main.object(forInfoDictionaryKey: "GOOGLE_MAPS_API_KEY") as? String ?? ""
    }
    
    var isDebug: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
}
```

---

## 6. Info.plist Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Configuration -->
    <key>CFBundleName</key>
    <string>Chravel</string>
    <key>CFBundleDisplayName</key>
    <string>Chravel</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    
    <!-- Environment Variables -->
    <key>SUPABASE_URL</key>
    <string>$(SUPABASE_URL)</string>
    <key>SUPABASE_ANON_KEY</key>
    <string>$(SUPABASE_ANON_KEY)</string>
    <key>GOOGLE_MAPS_API_KEY</key>
    <string>$(GOOGLE_MAPS_API_KEY)</string>
    
    <!-- URL Schemes -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>chravel</string>
            </array>
            <key>CFBundleURLName</key>
            <string>com.chravel.app</string>
        </dict>
    </array>
    
    <!-- Associated Domains -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
    </dict>
    
    <!-- Privacy Descriptions -->
    <key>NSCameraUsageDescription</key>
    <string>Chravel needs camera access to take photos for your trips.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Chravel needs photo library access to add photos to your trips.</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>Chravel needs your location to show nearby places and add locations to your trips.</string>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>Chravel needs your location to share it with your trip group.</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>Chravel needs microphone access to record voice messages.</string>
    <key>NSFaceIDUsageDescription</key>
    <string>Use Face ID to quickly sign in to Chravel.</string>
    
    <!-- Background Modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>fetch</string>
        <string>remote-notification</string>
        <string>location</string>
    </array>
    
    <!-- Launch Screen -->
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    
    <!-- Supported Interface Orientations -->
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
```

---

## 7. Entitlements

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Push Notifications -->
    <key>aps-environment</key>
    <string>development</string>
    
    <!-- Associated Domains (Universal Links) -->
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:chravel.app</string>
        <string>applinks:www.chravel.app</string>
    </array>
    
    <!-- Sign in with Apple -->
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
    
    <!-- iCloud (for backup) -->
    <key>com.apple.developer.icloud-container-identifiers</key>
    <array>
        <string>iCloud.com.chravel.app</string>
    </array>
    <key>com.apple.developer.icloud-services</key>
    <array>
        <string>CloudKit</string>
    </array>
    
    <!-- Keychain Sharing -->
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.chravel.app</string>
    </array>
</dict>
</plist>
```

---

## 8. Data Controllers

### Auth Controller

```swift
// AuthController.swift

import Foundation

@Observable
final class AuthController {
    static let shared = AuthController()
    
    private(set) var currentUser: UserProfile?
    private(set) var isAuthenticated: Bool = false
    private(set) var sessionState: SessionState = .unknown
    
    enum SessionState {
        case unknown
        case authenticated
        case unauthenticated
        case expired
    }
    
    private init() {
        Task {
            await checkSession()
        }
    }
    
    func checkSession() async {
        do {
            let session = try await SupabaseClient.shared.auth.session
            await loadProfile(userId: session.user.id.uuidString)
            sessionState = .authenticated
            isAuthenticated = true
        } catch {
            sessionState = .unauthenticated
            isAuthenticated = false
        }
    }
    
    private func loadProfile(userId: String) async {
        // Load from Supabase
    }
}
```

### Sync Controller

```swift
// SyncController.swift

import Foundation

@Observable
final class SyncController {
    static let shared = SyncController()
    
    var isSyncing: Bool = false
    var lastSyncDate: Date?
    var pendingChanges: Int = 0
    
    private var syncQueue: [SyncOperation] = []
    
    enum SyncOperation {
        case tripUpdate(String)
        case messageCreate(ChatMessage)
        case paymentCreate(PaymentMessage)
    }
    
    private init() {
        setupRealtimeSubscriptions()
    }
    
    private func setupRealtimeSubscriptions() {
        // Setup Supabase Realtime for trips, messages, payments
    }
    
    func sync() async {
        isSyncing = true
        
        // Process pending operations
        for operation in syncQueue {
            await processSyncOperation(operation)
        }
        
        lastSyncDate = Date()
        isSyncing = false
    }
    
    private func processSyncOperation(_ operation: SyncOperation) async {
        // Sync with Supabase
    }
}
```

### Storage Controller

```swift
// StorageController.swift

import Foundation

@Observable
final class StorageController {
    static let shared = StorageController()
    
    var usedStorage: Int64 = 0
    var quotaLimit: Int64 = 500 * 1024 * 1024 // 500MB default
    
    var usagePercentage: Double {
        Double(usedStorage) / Double(quotaLimit)
    }
    
    private init() {}
    
    func uploadImage(_ data: Data, path: String) async throws -> String {
        let response = try await SupabaseClient.shared.storage
            .from("media")
            .upload(path: path, data: data, options: .init(contentType: "image/jpeg"))
        
        return SupabaseClient.shared.storage
            .from("media")
            .getPublicURL(path: response)
            .absoluteString
    }
    
    func uploadFile(_ data: Data, path: String, contentType: String) async throws -> String {
        let response = try await SupabaseClient.shared.storage
            .from("files")
            .upload(path: path, data: data, options: .init(contentType: contentType))
        
        return SupabaseClient.shared.storage
            .from("files")
            .getPublicURL(path: response)
            .absoluteString
    }
    
    func deleteFile(path: String) async throws {
        // Delete from Supabase storage
    }
}
```

### Networking Controller

```swift
// NetworkingController.swift

import Foundation
import Network

@Observable
final class NetworkingController {
    static let shared = NetworkingController()
    
    var isConnected: Bool = true
    var connectionType: NWInterface.InterfaceType?
    
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    private init() {
        startMonitoring()
    }
    
    private func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                self?.connectionType = path.availableInterfaces.first?.type
            }
        }
        monitor.start(queue: queue)
    }
    
    func request<T: Decodable>(
        _ endpoint: String,
        method: HTTPMethod = .get,
        body: Data? = nil
    ) async throws -> T {
        guard isConnected else {
            throw NetworkError.noConnection
        }
        
        // Make request through Supabase functions
        let response = try await SupabaseClient.shared.functions
            .invoke(endpoint, options: .init(body: body))
        
        guard let data = response.data else {
            throw NetworkError.emptyResponse
        }
        
        return try JSONDecoder.supabaseDecoder.decode(T.self, from: data)
    }
    
    enum HTTPMethod {
        case get, post, put, delete
    }
    
    enum NetworkError: Error {
        case noConnection
        case emptyResponse
        case invalidResponse
    }
}
```

---

## 9. Build Settings

### Debug.xcconfig

```
// Debug.xcconfig

PRODUCT_BUNDLE_IDENTIFIER = com.chravel.app.debug
SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG
CODE_SIGN_IDENTITY = Apple Development
PROVISIONING_PROFILE_SPECIFIER = 

// Environment
SUPABASE_URL = https://your-dev-project.supabase.co
SUPABASE_ANON_KEY = your-dev-anon-key
GOOGLE_MAPS_API_KEY = your-dev-google-api-key

// Build
ENABLE_TESTABILITY = YES
GCC_OPTIMIZATION_LEVEL = 0
```

### Release.xcconfig

```
// Release.xcconfig

PRODUCT_BUNDLE_IDENTIFIER = com.chravel.app
SWIFT_ACTIVE_COMPILATION_CONDITIONS = 
CODE_SIGN_IDENTITY = Apple Distribution
PROVISIONING_PROFILE_SPECIFIER = 

// Environment (from CI/CD)
SUPABASE_URL = $(SUPABASE_URL)
SUPABASE_ANON_KEY = $(SUPABASE_ANON_KEY)
GOOGLE_MAPS_API_KEY = $(GOOGLE_MAPS_API_KEY)

// Build
ENABLE_TESTABILITY = NO
GCC_OPTIMIZATION_LEVEL = s
SWIFT_OPTIMIZATION_LEVEL = -O
```

---

## 10. Xcode Project Configuration

### Target Settings

- **Minimum iOS Version**: 17.0
- **Swift Version**: 5.10
- **Supported Devices**: iPhone, iPad
- **Build System**: New Build System
- **Code Signing**: Automatic

### Capabilities

1. ✅ Push Notifications
2. ✅ Associated Domains
3. ✅ Sign in with Apple
4. ✅ Background Modes
   - Background fetch
   - Remote notifications
   - Location updates
5. ✅ Keychain Sharing
6. ✅ iCloud (optional)

### Build Phases

1. **Compile Sources** - All Swift files
2. **Link Binary With Libraries** - SPM dependencies
3. **Copy Bundle Resources** - Assets, Fonts, Localizations
4. **SwiftLint** (optional) - Code quality
5. **SwiftFormat** (optional) - Code formatting

---

## 11. Testing Setup

### Unit Tests

```swift
// TripViewModelTests.swift

import XCTest
@testable import Chravel

final class TripViewModelTests: XCTestCase {
    var viewModel: TripsViewModel!
    var mockAuthViewModel: AuthViewModel!
    
    override func setUp() {
        super.setUp()
        mockAuthViewModel = AuthViewModel()
        viewModel = TripsViewModel(authViewModel: mockAuthViewModel)
    }
    
    func testFilterTrips() async {
        // Given
        viewModel.searchQuery = "Tokyo"
        
        // When
        let filtered = viewModel.filteredTrips
        
        // Then
        XCTAssertTrue(filtered.allSatisfy { 
            $0.name.contains("Tokyo") || $0.destination?.contains("Tokyo") == true 
        })
    }
}
```

### UI Tests

```swift
// HomeViewUITests.swift

import XCTest

final class HomeViewUITests: XCTestCase {
    let app = XCUIApplication()
    
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app.launch()
    }
    
    func testCreateTripFlow() {
        // Tap FAB
        app.buttons["plus"].tap()
        
        // Fill form
        app.textFields["Trip Name"].tap()
        app.textFields["Trip Name"].typeText("Test Trip")
        
        // Create
        app.buttons["Create"].tap()
        
        // Verify
        XCTAssertTrue(app.staticTexts["Test Trip"].exists)
    }
}
```

---

## Summary

This Xcode project assembly provides:

1. **Clean Architecture** - Clear separation between Models, ViewModels, Views, Services
2. **Modular Design** - Components organized by atomic design principles
3. **SwiftUI Navigation** - NavigationStack with typed destinations
4. **Supabase Integration** - Full backend connectivity
5. **Push Notifications** - APNs with Supabase integration
6. **Deep Linking** - URL schemes and Universal Links
7. **Secure Storage** - Keychain for auth tokens
8. **Environment Configuration** - Debug, Staging, Production
9. **Testing Infrastructure** - Unit and UI test setup
10. **CI/CD Ready** - xcconfig for automated builds

=== XCODE-PROJECT-ASSEMBLY END ===
