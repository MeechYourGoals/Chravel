//
//  BasecampSelectionView.swift
//  Chravel iOS
//
//  SwiftUI view for selecting basecamp location using Apple Maps
//  Integrates with BasecampLocationManager and BasecampGeocodingService
//

import SwiftUI
import MapKit
import CoreLocation

struct BasecampSelectionView: View {
    
    // MARK: - Properties
    
    @StateObject private var locationManager = BasecampLocationManager()
    @State private var searchText = ""
    @State private var searchResults: [GeocodingResult] = []
    @State private var isSearching = false
    @State private var selectedLocation: CLLocationCoordinate2D?
    @State private var selectedAddress: String = ""
    @State private var selectedName: String = ""
    @State private var showingLocationPermissionAlert = false
    @State private var authorizationStatus: CLAuthorizationStatus = .notDetermined
    
    let tripId: String
    let basecampType: BasecampType
    let onBasecampSelected: (String, String?, CLLocationCoordinate2D?) -> Void
    let onDismiss: () -> Void
    
    enum BasecampType {
        case trip
        case personal
    }
    
    // MARK: - Body
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search Bar
                searchBar
                
                // Map View
                mapView
                    .frame(maxHeight: .infinity)
                
                // Selected Location Info
                if selectedLocation != nil {
                    selectedLocationInfo
                }
                
                // Action Buttons
                actionButtons
            }
            .navigationTitle(basecampType == .trip ? "Set Trip Base Camp" : "Set Personal Base Camp")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        onDismiss()
                    }
                }
            }
            .onAppear {
                setupLocationManager()
            }
            .alert("Location Permission Required", isPresented: $showingLocationPermissionAlert) {
                Button("Settings") {
                    if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(settingsUrl)
                    }
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Please enable location permissions in Settings to use your current location.")
            }
        }
    }
    
    // MARK: - Search Bar
    
    private var searchBar: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("Search for address or place...", text: $searchText)
                    .textFieldStyle(.plain)
                    .onChange(of: searchText) { newValue in
                        performSearch(query: newValue)
                    }
                
                if isSearching {
                    ProgressView()
                        .scaleEffect(0.8)
                }
                
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                        searchResults = []
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            
            // Search Results
            if !searchResults.isEmpty {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(searchResults.enumerated()), id: \.offset) { index, result in
                            Button(action: {
                                selectLocation(result)
                            }) {
                                VStack(alignment: .leading, spacing: 4) {
                                    if let name = result.name {
                                        Text(name)
                                            .font(.headline)
                                            .foregroundColor(.primary)
                                    }
                                    Text(result.address)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                            }
                            .buttonStyle(.plain)
                            
                            if index < searchResults.count - 1 {
                                Divider()
                            }
                        }
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(10)
                }
                .frame(maxHeight: 200)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }
    
    // MARK: - Map View
    
    private var mapView: some View {
        Map(coordinateRegion: .constant(region), annotationItems: annotations) { annotation in
            MapPin(coordinate: annotation.coordinate, tint: .red)
        }
        .onTapGesture { location in
            // Handle map tap to select location
            // Note: This is simplified - in production you'd convert screen coordinates to map coordinates
        }
        .overlay(
            Button(action: {
                requestCurrentLocation()
            }) {
                Image(systemName: "location.fill")
                    .foregroundColor(.white)
                    .padding(12)
                    .background(Color.blue)
                    .clipShape(Circle())
                    .shadow(radius: 4)
            }
            .padding(.trailing, 16)
            .padding(.bottom, 16),
            alignment: .bottomTrailing
        )
    }
    
    // MARK: - Selected Location Info
    
    private var selectedLocationInfo: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !selectedName.isEmpty {
                Text(selectedName)
                    .font(.headline)
            }
            Text(selectedAddress)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
    }
    
    // MARK: - Action Buttons
    
    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button(action: {
                onDismiss()
            }) {
                Text("Cancel")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray5))
                    .foregroundColor(.primary)
                    .cornerRadius(10)
            }
            
            Button(action: {
                saveBasecamp()
            }) {
                Text("Save")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(selectedLocation != nil ? Color.blue : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            .disabled(selectedLocation == nil)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
    }
    
    // MARK: - Computed Properties
    
    @State private var currentLocation: CLLocation?
    
    private var region: MKCoordinateRegion {
        if let location = selectedLocation {
            return MKCoordinateRegion(
                center: location,
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
        } else if let currentLocation = currentLocation {
            return MKCoordinateRegion(
                center: currentLocation.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            )
        } else {
            // Default to a central location (e.g., San Francisco)
            return MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
                span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
            )
        }
    }
    
    private var annotations: [MapAnnotation] {
        guard let location = selectedLocation else { return [] }
        return [MapAnnotation(coordinate: location)]
    }
    
    // MARK: - Methods
    
    private func setupLocationManager() {
        locationManager.delegate = self
        authorizationStatus = locationManager.authorizationStatus
        
        if authorizationStatus == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        }
    }
    
    private func performSearch(query: String) {
        guard !query.isEmpty else {
            searchResults = []
            return
        }
        
        isSearching = true
        
        // Use current map region for search bias
        let searchRegion = region
        BasecampGeocodingService.searchPlaces(query: query, region: searchRegion) { result in
            DispatchQueue.main.async {
                isSearching = false
                switch result {
                case .success(let results):
                    searchResults = Array(results.prefix(10)) // Limit to 10 results
                case .failure:
                    searchResults = []
                }
            }
        }
    }
    
    private func selectLocation(_ result: GeocodingResult) {
        selectedLocation = result.coordinates
        selectedAddress = result.address
        selectedName = result.name ?? ""
        searchText = result.address
        searchResults = []
    }
    
    private func requestCurrentLocation() {
        guard authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways else {
            showingLocationPermissionAlert = true
            return
        }
        
        locationManager.getCurrentLocation { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let location):
                    selectedLocation = location.coordinate
                    // Reverse geocode to get address
                    BasecampGeocodingService.reverseGeocode(coordinates: location.coordinate) { geocodeResult in
                        DispatchQueue.main.async {
                            switch geocodeResult {
                            case .success(let result):
                                selectLocation(result)
                            case .failure:
                                // Still set location even if reverse geocoding fails
                                selectedAddress = "\(location.coordinate.latitude), \(location.coordinate.longitude)"
                            }
                        }
                    }
                case .failure:
                    break // Handle error
                }
            }
        }
    }
    
    private func saveBasecamp() {
        guard let location = selectedLocation else { return }
        
        // Cache the basecamp
        let cacheMethod = basecampType == .trip ?
            BasecampCache.cacheTripBasecamp :
            BasecampCache.cachePersonalBasecamp
        
        cacheMethod(tripId, selectedName.isEmpty ? nil : selectedName, selectedAddress, location)
        
        // Call completion handler
        onBasecampSelected(selectedAddress, selectedName.isEmpty ? nil : selectedName, location)
        onDismiss()
    }
}

// MARK: - Map Annotation

struct MapAnnotation: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
}

// MARK: - BasecampLocationManagerDelegate

extension BasecampSelectionView: BasecampLocationManagerDelegate {
    func locationManager(_ manager: BasecampLocationManager, didUpdateLocation location: CLLocation) {
        currentLocation = location
    }
    
    func locationManager(_ manager: BasecampLocationManager, didFailWithError error: Error) {
        // Handle errors - could show alert to user
        print("Location error: \(error.localizedDescription)")
    }
    
    func locationManager(_ manager: BasecampLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        authorizationStatus = status
    }
}
