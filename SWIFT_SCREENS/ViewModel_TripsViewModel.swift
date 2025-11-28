// TripsViewModel.swift
// Chravel iOS - Trip Management ViewModel

import Foundation
import SwiftUI

// MARK: - View Mode Enum

enum TripViewMode: String, CaseIterable, Identifiable {
    case myTrips = "My Trips"
    case tripsPro = "Trips Pro"
    case events = "Events"
    case travelRecs = "Travel Recs"
    
    var id: String { rawValue }
    var displayName: String { rawValue }
}

// MARK: - Date Filter

enum DateFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case upcoming = "Upcoming"
    case past = "Past"
    case active = "Active"
    
    var id: String { rawValue }
    var displayName: String { rawValue }
}

// MARK: - Trip Type

enum TripType: String, Codable, CaseIterable {
    case consumer
    case pro
    case event
    
    var displayName: String {
        switch self {
        case .consumer: return "Trip"
        case .pro: return "Pro"
        case .event: return "Event"
        }
    }
}

// MARK: - Trip Stats

struct TripStats {
    var totalTrips: Int = 0
    var activeTrips: Int = 0
    var upcomingTrips: Int = 0
    var completedTrips: Int = 0
}

// MARK: - Create Trip Request

struct CreateTripRequest {
    let name: String
    let description: String?
    let destination: String?
    let startDate: Date?
    let endDate: Date?
    let tripType: TripType
}

// MARK: - Trips ViewModel

@Observable
final class TripsViewModel {
    // MARK: - Dependencies
    private let authViewModel: AuthViewModel
    private let tripService: TripServiceProtocol
    
    // MARK: - State
    var trips: [Trip] = []
    var proTrips: [Trip] = []
    var events: [Trip] = []
    
    var viewMode: TripViewMode = .myTrips
    var searchQuery: String = ""
    var activeFilter: DateFilter = .all
    
    var isLoading: Bool = false
    var errorMessage: String?
    
    // MARK: - Computed Properties
    
    var filteredTrips: [Trip] {
        var filtered = trips
        
        // Apply search filter
        if !searchQuery.isEmpty {
            let query = searchQuery.lowercased()
            filtered = filtered.filter { trip in
                trip.name.lowercased().contains(query) ||
                (trip.destination?.lowercased().contains(query) ?? false) ||
                (trip.description?.lowercased().contains(query) ?? false)
            }
        }
        
        // Apply date filter
        let now = Date()
        switch activeFilter {
        case .all:
            break
        case .upcoming:
            filtered = filtered.filter { trip in
                guard let startDate = trip.startDate else { return false }
                return startDate > now
            }
        case .past:
            filtered = filtered.filter { trip in
                guard let endDate = trip.endDate else { return false }
                return endDate < now
            }
        case .active:
            filtered = filtered.filter { trip in
                guard let startDate = trip.startDate, let endDate = trip.endDate else {
                    return trip.startDate == nil // Trips without dates are "active"
                }
                return startDate <= now && endDate >= now
            }
        }
        
        // Sort by start date (nearest first), then by creation date
        return filtered.sorted { trip1, trip2 in
            if let date1 = trip1.startDate, let date2 = trip2.startDate {
                return date1 < date2
            } else if trip1.startDate != nil {
                return true
            } else if trip2.startDate != nil {
                return false
            } else {
                return trip1.createdAt > trip2.createdAt
            }
        }
    }
    
    var tripStats: TripStats {
        let now = Date()
        
        let upcoming = trips.filter { trip in
            guard let startDate = trip.startDate else { return false }
            return startDate > now
        }.count
        
        let active = trips.filter { trip in
            guard let startDate = trip.startDate, let endDate = trip.endDate else {
                return trip.startDate == nil
            }
            return startDate <= now && endDate >= now
        }.count
        
        let completed = trips.filter { trip in
            guard let endDate = trip.endDate else { return false }
            return endDate < now
        }.count
        
        return TripStats(
            totalTrips: trips.count,
            activeTrips: active,
            upcomingTrips: upcoming,
            completedTrips: completed
        )
    }
    
    // MARK: - Init
    
    init(
        authViewModel: AuthViewModel,
        tripService: TripServiceProtocol = TripService.shared
    ) {
        self.authViewModel = authViewModel
        self.tripService = tripService
    }
    
    // MARK: - API Methods
    
    @MainActor
    func loadTrips() async {
        guard let userId = authViewModel.user?.id else {
            errorMessage = "Not authenticated"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            // Load all trip types in parallel
            async let consumerTrips = tripService.getUserTrips(userId: userId, type: .consumer)
            async let proTripsResult = tripService.getUserTrips(userId: userId, type: .pro)
            async let eventsResult = tripService.getUserTrips(userId: userId, type: .event)
            
            let (consumer, pro, eventList) = try await (consumerTrips, proTripsResult, eventsResult)
            
            self.trips = consumer
            self.proTrips = pro
            self.events = eventList
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    @MainActor
    func createTrip(_ request: CreateTripRequest) async -> Trip? {
        guard let userId = authViewModel.user?.id else {
            errorMessage = "Not authenticated"
            return nil
        }
        
        do {
            let trip = try await tripService.createTrip(
                userId: userId,
                request: request
            )
            
            // Add to appropriate list
            switch trip.tripType {
            case .consumer:
                trips.insert(trip, at: 0)
            case .pro:
                proTrips.insert(trip, at: 0)
            case .event:
                events.insert(trip, at: 0)
            }
            
            return trip
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }
    
    @MainActor
    func deleteTrip(_ tripId: String) async -> Bool {
        do {
            try await tripService.deleteTrip(tripId: tripId)
            
            // Remove from all lists
            trips.removeAll { $0.id == tripId }
            proTrips.removeAll { $0.id == tripId }
            events.removeAll { $0.id == tripId }
            
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    @MainActor
    func archiveTrip(_ tripId: String) async -> Bool {
        do {
            try await tripService.archiveTrip(tripId: tripId)
            
            // Update in lists
            if let index = trips.firstIndex(where: { $0.id == tripId }) {
                trips[index].status = .archived
            }
            
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    func getTrip(_ tripId: String) -> Trip? {
        trips.first { $0.id == tripId } ??
        proTrips.first { $0.id == tripId } ??
        events.first { $0.id == tripId }
    }
}

// MARK: - Trip Service Protocol

protocol TripServiceProtocol {
    func getUserTrips(userId: String, type: TripType) async throws -> [Trip]
    func createTrip(userId: String, request: CreateTripRequest) async throws -> Trip
    func deleteTrip(tripId: String) async throws
    func archiveTrip(tripId: String) async throws
}

// MARK: - Trip Service

final class TripService: TripServiceProtocol {
    static let shared = TripService()
    
    private init() {}
    
    func getUserTrips(userId: String, type: TripType) async throws -> [Trip] {
        let response = try await SupabaseClient.shared.database
            .from("trips")
            .select("""
                *,
                trip_members(count),
                messages(count)
            """)
            .eq("creator_id", value: userId)
            .eq("trip_type", value: type.rawValue)
            .neq("status", value: "archived")
            .order("created_at", ascending: false)
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode([Trip].self, from: response.data)
    }
    
    func createTrip(userId: String, request: CreateTripRequest) async throws -> Trip {
        // Call edge function for trip creation (handles validation, defaults)
        let payload: [String: Any] = [
            "name": request.name,
            "description": request.description as Any,
            "destination": request.destination as Any,
            "start_date": request.startDate?.iso8601String as Any,
            "end_date": request.endDate?.iso8601String as Any,
            "trip_type": request.tripType.rawValue,
            "creator_id": userId
        ].compactMapValues { $0 }
        
        let response = try await SupabaseClient.shared.functions
            .invoke("create-trip", options: .init(body: payload))
        
        guard let data = response.data else {
            throw TripError.creationFailed
        }
        
        return try JSONDecoder.supabaseDecoder.decode(Trip.self, from: data)
    }
    
    func deleteTrip(tripId: String) async throws {
        try await SupabaseClient.shared.database
            .from("trips")
            .delete()
            .eq("id", value: tripId)
            .execute()
    }
    
    func archiveTrip(tripId: String) async throws {
        try await SupabaseClient.shared.database
            .from("trips")
            .update(["status": "archived"])
            .eq("id", value: tripId)
            .execute()
    }
}

// MARK: - Trip Error

enum TripError: LocalizedError {
    case creationFailed
    case notFound
    case unauthorized
    
    var errorDescription: String? {
        switch self {
        case .creationFailed:
            return "Failed to create trip. Please try again."
        case .notFound:
            return "Trip not found."
        case .unauthorized:
            return "You don't have permission to access this trip."
        }
    }
}
