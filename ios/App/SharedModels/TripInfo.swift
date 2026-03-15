import Foundation

/// Lightweight trip model for display in the Share Extension.
/// Cached in App Group shared storage by the main app.
struct TripInfo: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let coverImageURL: String?
    let location: String?
    let startDate: String?
    let endDate: String?
    let memberCount: Int

    var displaySubtitle: String {
        var parts: [String] = []
        if let location = location, !location.isEmpty {
            parts.append(location)
        }
        if let start = startDate {
            parts.append(start)
        }
        if parts.isEmpty {
            parts.append("\(memberCount) member\(memberCount == 1 ? "" : "s")")
        }
        return parts.joined(separator: " · ")
    }
}

/// Manages cached trip list in shared container for the extension.
enum TripCache {

    private static let cacheKey = "chravel_cached_trips"
    private static let cacheTimestampKey = "chravel_trips_cache_timestamp"

    private static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: ChravelAppGroup.identifier)
    }

    /// Update the cached trip list (called from main app).
    static func updateCache(trips: [TripInfo]) {
        guard let defaults = sharedDefaults else { return }
        if let data = try? JSONEncoder().encode(trips) {
            defaults.set(data, forKey: cacheKey)
            defaults.set(Date().timeIntervalSince1970, forKey: cacheTimestampKey)
        }
    }

    /// Read cached trips (called from extension).
    static func loadCachedTrips() -> [TripInfo] {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: cacheKey),
              let trips = try? JSONDecoder().decode([TripInfo].self, from: data) else {
            return []
        }
        return trips
    }

    /// Check if cache is fresh (within 1 hour).
    static var isCacheFresh: Bool {
        guard let defaults = sharedDefaults else { return false }
        let timestamp = defaults.double(forKey: cacheTimestampKey)
        guard timestamp > 0 else { return false }
        return Date().timeIntervalSince1970 - timestamp < 3600
    }
}
