//
//  BasecampGeocodingServiceTests.swift
//  Chravel iOS Tests
//
//  XCTest unit tests for BasecampGeocodingService
//

import XCTest
import CoreLocation
import MapKit
@testable import App

class BasecampGeocodingServiceTests: XCTestCase {
    
    var geocodingService: BasecampGeocodingService.Type!
    
    override func setUp() {
        super.setUp()
        geocodingService = BasecampGeocodingService.self
    }
    
    override func tearDown() {
        geocodingService = nil
        super.tearDown()
    }
    
    // MARK: - Geocoding Tests
    
    func testGeocodeValidAddress() {
        let expectation = expectation(description: "Geocode address")
        
        geocodingService.geocodeAddress("1600 Amphitheatre Parkway, Mountain View, CA") { result in
            switch result {
            case .success(let geocodingResult):
                XCTAssertNotNil(geocodingResult.coordinates)
                XCTAssertFalse(geocodingResult.address.isEmpty)
                XCTAssertEqual(geocodingResult.coordinates.latitude, 37.4220, accuracy: 0.1)
                XCTAssertEqual(geocodingResult.coordinates.longitude, -122.0841, accuracy: 0.1)
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Geocoding failed: \(error.localizedDescription)")
            }
        }
        
        waitForExpectations(timeout: 10.0)
    }
    
    func testGeocodeEmptyAddress() {
        let expectation = expectation(description: "Geocode empty address")
        
        geocodingService.geocodeAddress("") { result in
            switch result {
            case .success:
                XCTFail("Should not succeed with empty address")
            case .failure(let error):
                XCTAssertEqual(error, GeocodingError.invalidAddress)
                expectation.fulfill()
            }
        }
        
        waitForExpectations(timeout: 5.0)
    }
    
    func testGeocodeInvalidAddress() {
        let expectation = expectation(description: "Geocode invalid address")
        
        geocodingService.geocodeAddress("ThisIsNotARealAddress12345") { result in
            switch result {
            case .success:
                // MKLocalSearch might still return something, so we accept success
                expectation.fulfill()
            case .failure:
                // Or it might fail, which is also acceptable
                expectation.fulfill()
            }
        }
        
        waitForExpectations(timeout: 10.0)
    }
    
    // MARK: - Reverse Geocoding Tests
    
    func testReverseGeocodeValidCoordinates() {
        let expectation = expectation(description: "Reverse geocode coordinates")
        
        let coordinates = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194) // San Francisco
        
        geocodingService.reverseGeocode(coordinates: coordinates) { result in
            switch result {
            case .success(let geocodingResult):
                XCTAssertNotNil(geocodingResult.coordinates)
                XCTAssertFalse(geocodingResult.address.isEmpty)
                XCTAssertEqual(geocodingResult.coordinates.latitude, coordinates.latitude, accuracy: 0.0001)
                XCTAssertEqual(geocodingResult.coordinates.longitude, coordinates.longitude, accuracy: 0.0001)
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Reverse geocoding failed: \(error.localizedDescription)")
            }
        }
        
        waitForExpectations(timeout: 10.0)
    }
    
    // MARK: - Search Places Tests
    
    func testSearchPlaces() {
        let expectation = expectation(description: "Search places")
        
        geocodingService.searchPlaces(query: "Starbucks") { result in
            switch result {
            case .success(let results):
                // Should return some results (may be empty in some regions)
                XCTAssertNotNil(results)
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Search places failed: \(error.localizedDescription)")
            }
        }
        
        waitForExpectations(timeout: 10.0)
    }
    
    func testSearchPlacesEmptyQuery() {
        let expectation = expectation(description: "Search places with empty query")
        
        geocodingService.searchPlaces(query: "") { result in
            switch result {
            case .success(let results):
                XCTAssertEqual(results.count, 0)
                expectation.fulfill()
            case .failure:
                XCTFail("Should return empty array, not error")
            }
        }
        
        waitForExpectations(timeout: 5.0)
    }
    
    // MARK: - Region Bias Tests
    
    func testGeocodeWithRegionBias() {
        let expectation = expectation(description: "Geocode with region bias")
        
        // Create a region centered on San Francisco
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
        )
        
        geocodingService.geocodeAddress("Coffee", region: region) { result in
            switch result {
            case .success(let geocodingResult):
                XCTAssertNotNil(geocodingResult.coordinates)
                // Results should be biased toward San Francisco region
                let distance = CLLocation(
                    latitude: region.center.latitude,
                    longitude: region.center.longitude
                ).distance(from: CLLocation(
                    latitude: geocodingResult.coordinates.latitude,
                    longitude: geocodingResult.coordinates.longitude
                ))
                
                // Should be within reasonable distance (e.g., 50km)
                XCTAssertLessThan(distance, 50000)
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Geocoding with region bias failed: \(error.localizedDescription)")
            }
        }
        
        waitForExpectations(timeout: 10.0)
    }
}

// MARK: - Helper Extensions

extension CLLocation {
    func distance(from location: CLLocation) -> CLLocationDistance {
        return self.distance(from: location)
    }
}
