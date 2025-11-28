// MapViewModel.swift
// Chravel iOS - Map ViewModel

import Foundation
import CoreLocation
import MapKit

// MARK: - Place Data Model

struct PlaceData: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    var googlePlaceId: String?
    var address: String?
    var latitude: Double?
    var longitude: Double?
    var types: [String]?
    var rating: Double?
    var userRatingsTotal: Int?
    var priceLevel: Int?
    var photoUrl: String?
    var phoneNumber: String?
    var websiteUrl: String?
    var openingHours: [String]?
    var metadata: [String: String]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case googlePlaceId = "google_place_id"
        case address
        case latitude
        case longitude
        case types
        case rating
        case userRatingsTotal = "user_ratings_total"
        case priceLevel = "price_level"
        case photoUrl = "photo_url"
        case phoneNumber = "phone_number"
        case websiteUrl = "website_url"
        case openingHours = "opening_hours"
        case metadata
    }
    
    var coordinate: CLLocationCoordinate2D? {
        guard let lat = latitude, let lng = longitude else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

// MARK: - Map ViewModel

@Observable
final class MapViewModel: NSObject {
    // MARK: - Properties
    
    let tripId: String?
    
    var mode: MapMode = .tripBase
    var searchQuery: String = ""
    var selectedCategory: PlaceCategory?
    
    var tripPlaces: [PlaceData] = []
    var searchResults: [PlaceData] = []
    var nearbyPlaces: [PlaceData] = []
    
    var isSearching: Bool = false
    var isLoadingPlaces: Bool = false
    var errorMessage: String?
    
    var userLocation: CLLocationCoordinate2D?
    var currentRegion: MKCoordinateRegion?
    
    // Location Manager
    private let locationManager = CLLocationManager()
    
    // MARK: - Init
    
    init(tripId: String? = nil) {
        self.tripId = tripId
        super.init()
        
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }
    
    // MARK: - Location Permission
    
    @MainActor
    func requestLocationPermission() async {
        let status = locationManager.authorizationStatus
        
        switch status {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager.startUpdatingLocation()
        default:
            break
        }
    }
    
    // MARK: - Load Trip Places
    
    @MainActor
    func loadTripPlaces() async {
        guard let tripId else { return }
        
        isLoadingPlaces = true
        
        do {
            let response = try await SupabaseClient.shared.database
                .from("trip_places")
                .select("*")
                .eq("trip_id", value: tripId)
                .execute()
            
            tripPlaces = try JSONDecoder.supabaseDecoder.decode([PlaceData].self, from: response.data)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoadingPlaces = false
    }
    
    // MARK: - Search
    
    @MainActor
    func search() async {
        guard !searchQuery.isEmpty else {
            searchResults = []
            return
        }
        
        isSearching = true
        
        do {
            let center = currentRegion?.center ?? userLocation ?? CLLocationCoordinate2D(latitude: 34.0522, longitude: -118.2437)
            
            let results = try await GooglePlacesService.shared.searchPlaces(
                query: searchQuery,
                location: center,
                radius: 5000,
                types: selectedCategory?.googleTypes
            )
            
            searchResults = results
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
        
        isSearching = false
    }
    
    // MARK: - Filter by Category
    
    @MainActor
    func filterByCategory(_ category: PlaceCategory?) async {
        selectedCategory = category
        
        guard let category else {
            // Clear filter - reload nearby
            await loadNearbyPlaces()
            return
        }
        
        isSearching = true
        
        do {
            let center = currentRegion?.center ?? userLocation ?? CLLocationCoordinate2D(latitude: 34.0522, longitude: -118.2437)
            
            let results = try await GooglePlacesService.shared.nearbySearch(
                location: center,
                radius: 3000,
                types: category.googleTypes
            )
            
            searchResults = results
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isSearching = false
    }
    
    // MARK: - Load Nearby Places
    
    @MainActor
    func loadNearbyPlaces() async {
        guard let location = userLocation ?? currentRegion?.center else { return }
        
        isSearching = true
        
        do {
            let results = try await GooglePlacesService.shared.nearbySearch(
                location: location,
                radius: 2000
            )
            
            nearbyPlaces = results
            
            // Show nearby as search results if no active search
            if searchQuery.isEmpty && selectedCategory == nil {
                searchResults = results
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isSearching = false
    }
    
    // MARK: - Add Place to Trip
    
    @MainActor
    func addPlaceToTrip(_ place: PlaceData) async {
        guard let tripId else { return }
        
        do {
            let placeData: [String: Any] = [
                "id": UUID().uuidString,
                "trip_id": tripId,
                "google_place_id": place.googlePlaceId ?? place.id,
                "name": place.name,
                "address": place.address ?? "",
                "latitude": place.latitude ?? 0,
                "longitude": place.longitude ?? 0,
                "types": place.types ?? [],
                "rating": place.rating ?? 0,
                "photo_url": place.photoUrl ?? "",
                "created_at": Date().iso8601String
            ]
            
            try await SupabaseClient.shared.database
                .from("trip_places")
                .insert(placeData)
                .execute()
            
            // Add to local list
            tripPlaces.append(place)
            
            // Remove from search results
            searchResults.removeAll { $0.id == place.id }
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
    }
    
    // MARK: - Remove Place from Trip
    
    @MainActor
    func removePlaceFromTrip(_ placeId: String) async {
        guard let tripId else { return }
        
        do {
            try await SupabaseClient.shared.database
                .from("trip_places")
                .delete()
                .eq("trip_id", value: tripId)
                .eq("id", value: placeId)
                .execute()
            
            tripPlaces.removeAll { $0.id == placeId }
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Clear Search
    
    func clearSearch() {
        searchQuery = ""
        selectedCategory = nil
        searchResults = []
    }
    
    // MARK: - Update Region
    
    func updateRegion(_ region: MKCoordinateRegion) {
        currentRegion = region
    }
}

// MARK: - CLLocationManagerDelegate

extension MapViewModel: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        userLocation = location.coordinate
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        default:
            break
        }
    }
}

// MARK: - Google Places Service

final class GooglePlacesService {
    static let shared = GooglePlacesService()
    
    private init() {}
    
    func searchPlaces(
        query: String,
        location: CLLocationCoordinate2D,
        radius: Int = 5000,
        types: [String]? = nil
    ) async throws -> [PlaceData] {
        // Call Supabase Edge Function that proxies to Google Places API
        var payload: [String: Any] = [
            "query": query,
            "location": [
                "lat": location.latitude,
                "lng": location.longitude
            ],
            "radius": radius
        ]
        
        if let types {
            payload["types"] = types
        }
        
        let response = try await SupabaseClient.shared.functions
            .invoke("google-maps-proxy", options: .init(body: [
                "action": "textSearch",
                "params": payload
            ]))
        
        guard let data = response.data else {
            throw PlacesError.emptyResponse
        }
        
        struct PlacesResponse: Decodable {
            let places: [PlaceData]
        }
        
        let result = try JSONDecoder().decode(PlacesResponse.self, from: data)
        return result.places
    }
    
    func nearbySearch(
        location: CLLocationCoordinate2D,
        radius: Int = 2000,
        types: [String]? = nil
    ) async throws -> [PlaceData] {
        var payload: [String: Any] = [
            "location": [
                "lat": location.latitude,
                "lng": location.longitude
            ],
            "radius": radius
        ]
        
        if let types {
            payload["types"] = types
        }
        
        let response = try await SupabaseClient.shared.functions
            .invoke("google-maps-proxy", options: .init(body: [
                "action": "nearbySearch",
                "params": payload
            ]))
        
        guard let data = response.data else {
            throw PlacesError.emptyResponse
        }
        
        struct PlacesResponse: Decodable {
            let places: [PlaceData]
        }
        
        let result = try JSONDecoder().decode(PlacesResponse.self, from: data)
        return result.places
    }
    
    func getPlaceDetails(placeId: String) async throws -> PlaceData {
        let response = try await SupabaseClient.shared.functions
            .invoke("google-maps-proxy", options: .init(body: [
                "action": "placeDetails",
                "params": [
                    "place_id": placeId
                ]
            ]))
        
        guard let data = response.data else {
            throw PlacesError.emptyResponse
        }
        
        return try JSONDecoder().decode(PlaceData.self, from: data)
    }
    
    func autocomplete(
        query: String,
        location: CLLocationCoordinate2D?
    ) async throws -> [AutocompletePrediction] {
        var payload: [String: Any] = [
            "input": query
        ]
        
        if let location {
            payload["location"] = [
                "lat": location.latitude,
                "lng": location.longitude
            ]
        }
        
        let response = try await SupabaseClient.shared.functions
            .invoke("google-maps-proxy", options: .init(body: [
                "action": "autocomplete",
                "params": payload
            ]))
        
        guard let data = response.data else {
            throw PlacesError.emptyResponse
        }
        
        struct AutocompleteResponse: Decodable {
            let predictions: [AutocompletePrediction]
        }
        
        let result = try JSONDecoder().decode(AutocompleteResponse.self, from: data)
        return result.predictions
    }
}

// MARK: - Autocomplete Prediction

struct AutocompletePrediction: Identifiable, Codable {
    let id: String
    let description: String
    let placeId: String
    var mainText: String?
    var secondaryText: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case description
        case placeId = "place_id"
        case mainText = "main_text"
        case secondaryText = "secondary_text"
    }
}

// MARK: - Places Error

enum PlacesError: LocalizedError {
    case emptyResponse
    case invalidLocation
    case quotaExceeded
    
    var errorDescription: String? {
        switch self {
        case .emptyResponse:
            return "No places found."
        case .invalidLocation:
            return "Invalid location coordinates."
        case .quotaExceeded:
            return "Places API quota exceeded."
        }
    }
}
