//
//  BasecampCache.swift
//  Chravel iOS
//
//  Manages UserDefaults caching for basecamp locations
//  Stores last-used basecamps for quick access
//

import Foundation
import CoreLocation

struct CachedBasecamp: Codable {
    let tripId: String
    let basecampType: String // "trip" or "personal"
    let name: String?
    let address: String
    let latitude: Double?
    let longitude: Double?
    let cachedAt: Date
    
    var coordinates: CLLocationCoordinate2D? {
        guard let lat = latitude, let lng = longitude else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

class BasecampCache {
    
    // MARK: - Constants
    
    private static let userDefaults = UserDefaults.standard
    private static let tripBasecampKeyPrefix = "basecamp_trip_"
    private static let personalBasecampKeyPrefix = "basecamp_personal_"
    private static let lastUsedBasecampsKey = "basecamp_last_used"
    
    // MARK: - Cache Trip Basecamp
    
    /// Cache trip basecamp for a trip
    static func cacheTripBasecamp(
        tripId: String,
        name: String?,
        address: String,
        coordinates: CLLocationCoordinate2D?
    ) {
        let cached = CachedBasecamp(
            tripId: tripId,
            basecampType: "trip",
            name: name,
            address: address,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            cachedAt: Date()
        )
        
        saveCachedBasecamp(cached, key: tripBasecampKeyPrefix + tripId)
        addToLastUsed(cached)
    }
    
    /// Get cached trip basecamp for a trip
    static func getCachedTripBasecamp(tripId: String) -> CachedBasecamp? {
        return getCachedBasecamp(key: tripBasecampKeyPrefix + tripId)
    }
    
    // MARK: - Cache Personal Basecamp
    
    /// Cache personal basecamp for a trip
    static func cachePersonalBasecamp(
        tripId: String,
        name: String?,
        address: String,
        coordinates: CLLocationCoordinate2D?
    ) {
        let cached = CachedBasecamp(
            tripId: tripId,
            basecampType: "personal",
            name: name,
            address: address,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            cachedAt: Date()
        )
        
        saveCachedBasecamp(cached, key: personalBasecampKeyPrefix + tripId)
        addToLastUsed(cached)
    }
    
    /// Get cached personal basecamp for a trip
    static func getCachedPersonalBasecamp(tripId: String) -> CachedBasecamp? {
        return getCachedBasecamp(key: personalBasecampKeyPrefix + tripId)
    }
    
    // MARK: - Last Used Basecamps
    
    /// Get last used basecamps (most recent first)
    static func getLastUsedBasecamps(limit: Int = 10) -> [CachedBasecamp] {
        guard let data = userDefaults.data(forKey: lastUsedBasecampsKey),
              let basecamps = try? JSONDecoder().decode([CachedBasecamp].self, from: data) else {
            return []
        }
        
        // Sort by cachedAt descending and limit
        return Array(basecamps.sorted { $0.cachedAt > $1.cachedAt }.prefix(limit))
    }
    
    /// Clear all cached basecamps
    static func clearAll() {
        // Clear all keys with our prefixes
        let keys = userDefaults.dictionaryRepresentation().keys
        for key in keys {
            if key.hasPrefix(tripBasecampKeyPrefix) || key.hasPrefix(personalBasecampKeyPrefix) {
                userDefaults.removeObject(forKey: key)
            }
        }
        userDefaults.removeObject(forKey: lastUsedBasecampsKey)
    }
    
    /// Clear cached basecamp for a specific trip
    static func clearTripBasecamp(tripId: String) {
        userDefaults.removeObject(forKey: tripBasecampKeyPrefix + tripId)
    }
    
    /// Clear cached personal basecamp for a specific trip
    static func clearPersonalBasecamp(tripId: String) {
        userDefaults.removeObject(forKey: personalBasecampKeyPrefix + tripId)
    }
    
    // MARK: - Private Helpers
    
    private static func saveCachedBasecamp(_ basecamp: CachedBasecamp, key: String) {
        guard let data = try? JSONEncoder().encode(basecamp) else { return }
        userDefaults.set(data, forKey: key)
    }
    
    private static func getCachedBasecamp(key: String) -> CachedBasecamp? {
        guard let data = userDefaults.data(forKey: key),
              let cached = try? JSONDecoder().decode(CachedBasecamp.self, from: data) else {
            return nil
        }
        
        // Check if cache is still valid (e.g., not older than 7 days)
        let cacheAge = Date().timeIntervalSince(cached.cachedAt)
        let maxCacheAge: TimeInterval = 7 * 24 * 60 * 60 // 7 days
        
        if cacheAge > maxCacheAge {
            userDefaults.removeObject(forKey: key)
            return nil
        }
        
        return cached
    }
    
    private static func addToLastUsed(_ basecamp: CachedBasecamp) {
        var lastUsed = getLastUsedBasecamps(limit: 50) // Get more to avoid duplicates
        
        // Remove existing entry for same trip and type
        lastUsed.removeAll { $0.tripId == basecamp.tripId && $0.basecampType == basecamp.basecampType }
        
        // Add new entry at the beginning
        lastUsed.insert(basecamp, at: 0)
        
        // Keep only last 50
        let limited = Array(lastUsed.prefix(50))
        
        if let data = try? JSONEncoder().encode(limited) {
            userDefaults.set(data, forKey: lastUsedBasecampsKey)
        }
    }
}
