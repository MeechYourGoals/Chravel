//
//  BasecampGeocodingService.swift
//  Chravel iOS
//
//  Handles geocoding (address → coordinates) using MKLocalSearch
//  Provides fallback to CLGeocoder for broader address support
//

import Foundation
import MapKit
import CoreLocation

struct GeocodingResult {
    let coordinates: CLLocationCoordinate2D
    let address: String
    let name: String?
    let placemark: CLPlacemark?
}

enum GeocodingError: LocalizedError {
    case noResults
    case invalidAddress
    case networkError(Error)
    case permissionDenied
    
    var errorDescription: String? {
        switch self {
        case .noResults:
            return "No results found for this address"
        case .invalidAddress:
            return "Invalid address format"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .permissionDenied:
            return "Location permission denied"
        }
    }
}

class BasecampGeocodingService {
    
    // MARK: - Geocoding Methods
    
    /// Geocode an address string to coordinates using MKLocalSearch (preferred for iOS)
    /// Falls back to CLGeocoder if MKLocalSearch fails
    static func geocodeAddress(
        _ address: String,
        region: MKCoordinateRegion? = nil,
        completion: @escaping (Result<GeocodingResult, GeocodingError>) -> Void
    ) {
        guard !address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            completion(.failure(.invalidAddress))
            return
        }
        
        // Try MKLocalSearch first (better for places/venues)
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = address
        
        if let region = region {
            request.region = region
        }
        
        let search = MKLocalSearch(request: request)
        search.start { response, error in
            if let error = error {
                // Fallback to CLGeocoder
                geocodeWithCLGeocoder(address: address, completion: completion)
                return
            }
            
            guard let response = response,
                  let mapItem = response.mapItems.first,
                  let location = mapItem.placemark.location else {
                // Fallback to CLGeocoder
                geocodeWithCLGeocoder(address: address, completion: completion)
                return
            }
            
            let result = GeocodingResult(
                coordinates: location.coordinate,
                address: formatAddress(from: mapItem.placemark),
                name: mapItem.name,
                placemark: mapItem.placemark
            )
            
            completion(.success(result))
        }
    }
    
    /// Geocode using CLGeocoder (fallback method)
    private static func geocodeWithCLGeocoder(
        address: String,
        completion: @escaping (Result<GeocodingResult, GeocodingError>) -> Void
    ) {
        let geocoder = CLGeocoder()
        geocoder.geocodeAddressString(address) { placemarks, error in
            if let error = error {
                completion(.failure(.networkError(error)))
                return
            }
            
            guard let placemark = placemarks?.first,
                  let location = placemark.location else {
                completion(.failure(.noResults))
                return
            }
            
            let result = GeocodingResult(
                coordinates: location.coordinate,
                address: formatAddress(from: placemark),
                name: placemark.name,
                placemark: placemark
            )
            
            completion(.success(result))
        }
    }
    
    /// Reverse geocode coordinates to address
    static func reverseGeocode(
        coordinates: CLLocationCoordinate2D,
        completion: @escaping (Result<GeocodingResult, GeocodingError>) -> Void
    ) {
        let location = CLLocation(latitude: coordinates.latitude, longitude: coordinates.longitude)
        let geocoder = CLGeocoder()
        
        geocoder.reverseGeocodeLocation(location) { placemarks, error in
            if let error = error {
                completion(.failure(.networkError(error)))
                return
            }
            
            guard let placemark = placemarks?.first else {
                completion(.failure(.noResults))
                return
            }
            
            let result = GeocodingResult(
                coordinates: coordinates,
                address: formatAddress(from: placemark),
                name: placemark.name,
                placemark: placemark
            )
            
            completion(.success(result))
        }
    }
    
    // MARK: - Helper Methods
    
    /// Format address from placemark
    private static func formatAddress(from placemark: CLPlacemark) -> String {
        var addressComponents: [String] = []
        
        if let streetNumber = placemark.subThoroughfare {
            addressComponents.append(streetNumber)
        }
        
        if let streetName = placemark.thoroughfare {
            addressComponents.append(streetName)
        }
        
        if let city = placemark.locality {
            addressComponents.append(city)
        }
        
        if let state = placemark.administrativeArea {
            addressComponents.append(state)
        }
        
        if let zipCode = placemark.postalCode {
            addressComponents.append(zipCode)
        }
        
        if let country = placemark.country {
            addressComponents.append(country)
        }
        
        return addressComponents.joined(separator: ", ")
    }
    
    /// Search for places matching query (for autocomplete)
    static func searchPlaces(
        query: String,
        region: MKCoordinateRegion? = nil,
        completion: @escaping (Result<[GeocodingResult], GeocodingError>) -> Void
    ) {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            completion(.success([]))
            return
        }
        
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        
        if let region = region {
            request.region = region
        }
        
        let search = MKLocalSearch(request: request)
        search.start { response, error in
            if let error = error {
                completion(.failure(.networkError(error)))
                return
            }
            
            guard let response = response else {
                completion(.success([]))
                return
            }
            
            let results = response.mapItems.map { mapItem -> GeocodingResult in
                let location = mapItem.placemark.location ?? CLLocation(latitude: 0, longitude: 0)
                return GeocodingResult(
                    coordinates: location.coordinate,
                    address: formatAddress(from: mapItem.placemark),
                    name: mapItem.name,
                    placemark: mapItem.placemark
                )
            }
            
            completion(.success(results))
        }
    }
}
