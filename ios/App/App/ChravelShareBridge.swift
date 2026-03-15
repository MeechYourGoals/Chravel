import Foundation
import Capacitor

/// Capacitor plugin that bridges the web layer to the App Group shared storage
/// used by the Share Extension.
@objc(ChravelShareBridgePlugin)
public class ChravelShareBridgePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "ChravelShareBridgePlugin"
    public let jsName = "ChravelShareBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingShares", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearProcessedShare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncTripCache", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncAuthState", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - Read pending shares from App Group

    @objc func getPendingShares(_ call: CAPPluginCall) {
        let items = SharePersistence.loadAll()
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        do {
            let data = try encoder.encode(items)
            let jsonString = String(data: data, encoding: .utf8) ?? "[]"
            call.resolve(["items": jsonString])
        } catch {
            call.resolve(["items": "[]"])
        }
    }

    // MARK: - Clear a processed share

    @objc func clearProcessedShare(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing 'id' parameter")
            return
        }
        SharePersistence.delete(id: id)
        call.resolve()
    }

    // MARK: - Sync trip cache to App Group

    @objc func syncTripCache(_ call: CAPPluginCall) {
        guard let tripsJSON = call.getString("trips"),
              let data = tripsJSON.data(using: .utf8),
              let trips = try? JSONDecoder().decode([TripInfo].self, from: data) else {
            call.reject("Invalid trips data")
            return
        }
        TripCache.updateCache(trips: trips)
        call.resolve()
    }

    // MARK: - Sync auth state to App Group

    @objc func syncAuthState(_ call: CAPPluginCall) {
        let isAuthenticated = call.getBool("isAuthenticated") ?? false

        if !isAuthenticated {
            AuthBridge.clearAuthState()
        }
        // When authenticated, the web layer should also pass token data.
        // For V1, we use a simplified approach: if authenticated, we store
        // a flag. The extension checks this flag before allowing shares.
        // Full token sync requires additional Capacitor calls from the auth layer.
        guard let defaults = UserDefaults(suiteName: ChravelAppGroup.identifier) else {
            call.resolve()
            return
        }
        defaults.set(isAuthenticated, forKey: "chravel_is_authenticated")
        call.resolve()
    }
}
