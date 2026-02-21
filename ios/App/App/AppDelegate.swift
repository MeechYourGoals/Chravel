import UIKit
import Capacitor
import WebKit
import RevenueCat

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    
    // MARK: - RevenueCat Configuration
    // API key is read from Info.plist key "REVENUECAT_API_KEY".
    // Set it in your Xcode build settings via a .xcconfig file (not committed to git)
    // or inject it during CI via fastlane / xcodebuild -xcconfig.
    private var revenueCatAPIKey: String {
        Bundle.main.object(forInfoDictionaryKey: "REVENUECAT_API_KEY") as? String ?? ""
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Configure RevenueCat SDK
        configureRevenueCat()
        
        // iOS polish: tune the Capacitor WebView scroll behavior (reduce rubber-band/overscroll artifacts).
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.applyWebViewPolish()
        }
        return true
    }
    
    // MARK: - RevenueCat Setup
    
    private func configureRevenueCat() {
        // Set log level (use .warn in production)
        Purchases.logLevel = .debug

        guard !revenueCatAPIKey.isEmpty else {
            print("[RevenueCat] REVENUECAT_API_KEY not set in Info.plist — SDK not configured.")
            return
        }

        // Configure with API key
        Purchases.configure(withAPIKey: revenueCatAPIKey)

        // Enable automatic collection of attribution data
        Purchases.shared.attribution.enableAdServicesAttributionTokenCollection()

        print("[RevenueCat] SDK configured successfully")
    }

    private func applyWebViewPolish() {
        guard let bridgeVC = findBridgeViewController(startingAt: window?.rootViewController) else {
            return
        }

        // Disable the "rubber band" overscroll bounce that can show a white/gray background
        // above/below the web content (especially noticeable on dark UIs).
        let scrollView = bridgeVC.webView.scrollView
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false

        // Match the app theme behind the web content to avoid flashing.
        scrollView.backgroundColor = UIColor.black
        bridgeVC.webView.isOpaque = false
        bridgeVC.webView.backgroundColor = UIColor.clear
    }

    private func findBridgeViewController(startingAt viewController: UIViewController?) -> CAPBridgeViewController? {
        guard let viewController else { return nil }

        if let bridge = viewController as? CAPBridgeViewController {
            return bridge
        }

        // Search children (common if embedded in container/navigation controllers).
        for child in viewController.children {
            if let found = findBridgeViewController(startingAt: child) {
                return found
            }
        }

        // Search presented view controller.
        if let presented = viewController.presentedViewController {
            if let found = findBridgeViewController(startingAt: presented) {
                return found
            }
        }

        return nil
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
