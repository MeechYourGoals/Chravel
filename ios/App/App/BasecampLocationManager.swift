//
//  BasecampLocationManager.swift
//  Chravel iOS
//
//  Manages native iOS location services for Base Camp feature
//  Handles CLLocationManager, permissions, and location updates
//

import Foundation
import CoreLocation
import MapKit

protocol BasecampLocationManagerDelegate: AnyObject {
    func locationManager(_ manager: BasecampLocationManager, didUpdateLocation location: CLLocation)
    func locationManager(_ manager: BasecampLocationManager, didFailWithError error: Error)
    func locationManager(_ manager: BasecampLocationManager, didChangeAuthorization status: CLAuthorizationStatus)
}

class BasecampLocationManager: NSObject {
    
    // MARK: - Properties
    
    weak var delegate: BasecampLocationManagerDelegate?
    
    private let locationManager = CLLocationManager()
    private var desiredAccuracy: CLLocationAccuracy = kCLLocationAccuracyBest
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = desiredAccuracy
        locationManager.distanceFilter = 10 // Update every 10 meters
    }
    
    // MARK: - Public Methods
    
    /// Request "When In Use" location permission
    func requestWhenInUseAuthorization() {
        guard locationManager.authorizationStatus == .notDetermined else {
            delegate?.locationManager(self, didChangeAuthorization: locationManager.authorizationStatus)
            return
        }
        locationManager.requestWhenInUseAuthorization()
    }
    
    /// Check current authorization status
    var authorizationStatus: CLAuthorizationStatus {
        return locationManager.authorizationStatus
    }
    
    /// Check if location services are enabled
    var isLocationServicesEnabled: Bool {
        return CLLocationManager.locationServicesEnabled()
    }
    
    /// Start updating location
    func startUpdatingLocation() {
        guard isLocationServicesEnabled else {
            let error = NSError(
                domain: "BasecampLocationManager",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Location services are disabled"]
            )
            delegate?.locationManager(self, didFailWithError: error)
            return
        }
        
        guard authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways else {
            let error = NSError(
                domain: "BasecampLocationManager",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "Location permission not granted"]
            )
            delegate?.locationManager(self, didFailWithError: error)
            return
        }
        
        locationManager.startUpdatingLocation()
    }
    
    /// Stop updating location
    func stopUpdatingLocation() {
        locationManager.stopUpdatingLocation()
    }
    
    /// Get current location (one-time request)
    func getCurrentLocation(completion: @escaping (Result<CLLocation, Error>) -> Void) {
        guard isLocationServicesEnabled else {
            completion(.failure(NSError(
                domain: "BasecampLocationManager",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Location services are disabled"]
            )))
            return
        }
        
        guard authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways else {
            completion(.failure(NSError(
                domain: "BasecampLocationManager",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "Location permission not granted"]
            )))
            return
        }
        
        // Use a one-time location request
        let oneTimeDelegate = OneTimeLocationDelegate(completion: completion)
        locationManager.delegate = oneTimeDelegate
        
        // Store reference to prevent deallocation
        objc_setAssociatedObject(
            locationManager,
            &AssociatedKeys.oneTimeDelegate,
            oneTimeDelegate,
            .OBJC_ASSOCIATION_RETAIN_NONATOMIC
        )
        
        locationManager.requestLocation()
    }
    
    /// Set desired accuracy
    func setDesiredAccuracy(_ accuracy: CLLocationAccuracy) {
        desiredAccuracy = accuracy
        locationManager.desiredAccuracy = accuracy
    }
}

// MARK: - CLLocationManagerDelegate

extension BasecampLocationManager: CLLocationManagerDelegate {
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        delegate?.locationManager(self, didUpdateLocation: location)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        delegate?.locationManager(self, didFailWithError: error)
    }
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        delegate?.locationManager(self, didChangeAuthorization: status)
    }
}

// MARK: - One-Time Location Request Helper

private class OneTimeLocationDelegate: NSObject, CLLocationManagerDelegate {
    private let completion: (Result<CLLocation, Error>) -> Void
    private var hasCompleted = false
    
    init(completion: @escaping (Result<CLLocation, Error>) -> Void) {
        self.completion = completion
        super.init()
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard !hasCompleted, let location = locations.last else { return }
        hasCompleted = true
        completion(.success(location))
        
        // Clean up
        manager.delegate = nil
        objc_setAssociatedObject(manager, &AssociatedKeys.oneTimeDelegate, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard !hasCompleted else { return }
        hasCompleted = true
        completion(.failure(error))
        
        // Clean up
        manager.delegate = nil
        objc_setAssociatedObject(manager, &AssociatedKeys.oneTimeDelegate, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    }
}

// MARK: - Associated Keys

private struct AssociatedKeys {
    static var oneTimeDelegate = "oneTimeDelegate"
}
