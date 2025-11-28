// TripsViewModel.swift
// Chravel iOS - CORRECTED Trips ViewModel
// Uses actual supabase-swift SDK patterns

import Foundation
import SwiftUI

// MARK: - View Mode

enum TripViewMode: String, CaseIterable, Identifiable {
    case myTrips = "My Trips"
    case tripsPro = "Trips Pro"
    case events = "Events"
    case travelRecs = "Travel Recs"
    
    var id: String { rawValue }
}

// MARK: - Date Filter

enum DateFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case upcoming = "Upcoming"
    case past = "Past"
    case active = "Active"
    
    var id: String { rawValue }
}

// MARK: - Trip Stats

struct TripStats {
    var totalTrips: Int = 0
    var activeTrips: Int = 0
    var upcomingTrips: Int = 0
    var completedTrips: Int = 0
}

// MARK: - Trips ViewModel

@Observable
@MainActor
final class TripsViewModel {
    // MARK: - Dependencies
    
    private let authViewModel: AuthViewModel
    private let supabase = AppSupabase.shared
    
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
    
    init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    // MARK: - Load Trips
    
    func loadTrips() async {
        guard let userId = authViewModel.currentUserId else {
            errorMessage = "Not authenticated"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            // Load all trip types in parallel using TaskGroup
            async let consumerResult = fetchTrips(userId: userId, type: .consumer)
            async let proResult = fetchTrips(userId: userId, type: .pro)
            async let eventResult = fetchTrips(userId: userId, type: .event)
            
            let (consumer, pro, eventList) = try await (consumerResult, proResult, eventResult)
            
            self.trips = consumer
            self.proTrips = pro
            self.events = eventList
            
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    private func fetchTrips(userId: String, type: TripType) async throws -> [Trip] {
        // Query using the actual Supabase Swift SDK pattern
        let trips: [Trip] = try await supabase.database
            .from("trips")
            .select()
            .eq("creator_id", value: userId)
            .eq("trip_type", value: type.rawValue)
            .neq("status", value: "archived")
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return trips
    }
    
    // MARK: - Create Trip
    
    func createTrip(
        name: String,
        description: String?,
        destination: String?,
        startDate: Date?,
        endDate: Date?,
        tripType: TripType
    ) async -> Trip? {
        guard let userId = authViewModel.currentUserId else {
            errorMessage = "Not authenticated"
            return nil
        }
        
        do {
            // Build insert data
            var insertData: [String: Any] = [
                "name": name,
                "trip_type": tripType.rawValue,
                "creator_id": userId,
                "status": TripStatus.active.rawValue,
                "created_at": ISO8601DateFormatter().string(from: Date()),
                "updated_at": ISO8601DateFormatter().string(from: Date())
            ]
            
            if let description = description, !description.isEmpty {
                insertData["description"] = description
            }
            if let destination = destination, !destination.isEmpty {
                insertData["destination"] = destination
            }
            if let startDate = startDate {
                insertData["start_date"] = ISO8601DateFormatter().string(from: startDate)
            }
            if let endDate = endDate {
                insertData["end_date"] = ISO8601DateFormatter().string(from: endDate)
            }
            
            // Insert and get back the created trip
            let trip: Trip = try await supabase.database
                .from("trips")
                .insert(insertData)
                .select()
                .single()
                .execute()
                .value
            
            // Add to appropriate list
            switch tripType {
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
    
    // MARK: - Delete Trip
    
    func deleteTrip(_ tripId: String) async -> Bool {
        do {
            try await supabase.database
                .from("trips")
                .delete()
                .eq("id", value: tripId)
                .execute()
            
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
    
    // MARK: - Archive Trip
    
    func archiveTrip(_ tripId: String) async -> Bool {
        do {
            try await supabase.database
                .from("trips")
                .update(["status": TripStatus.archived.rawValue])
                .eq("id", value: tripId)
                .execute()
            
            // Update in local lists
            if let index = trips.firstIndex(where: { $0.id == tripId }) {
                trips[index].status = .archived
                trips.remove(at: index)
            }
            if let index = proTrips.firstIndex(where: { $0.id == tripId }) {
                proTrips[index].status = .archived
                proTrips.remove(at: index)
            }
            if let index = events.firstIndex(where: { $0.id == tripId }) {
                events[index].status = .archived
                events.remove(at: index)
            }
            
            return true
            
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
    
    // MARK: - Get Single Trip
    
    func getTrip(_ tripId: String) -> Trip? {
        trips.first { $0.id == tripId } ??
        proTrips.first { $0.id == tripId } ??
        events.first { $0.id == tripId }
    }
}
