// AIConciergeViewModel.swift
// Chravel iOS - AI Concierge ViewModel

import Foundation
import SwiftUI

// MARK: - AI Message Model

struct AIMessage: Identifiable, Codable {
    let id: String
    let content: String
    let isUser: Bool
    let timestamp: Date
    var actions: [AIAction]?
    var sources: [AISource]?
    
    init(
        id: String = UUID().uuidString,
        content: String,
        isUser: Bool,
        timestamp: Date = Date(),
        actions: [AIAction]? = nil,
        sources: [AISource]? = nil
    ) {
        self.id = id
        self.content = content
        self.isUser = isUser
        self.timestamp = timestamp
        self.actions = actions
        self.sources = sources
    }
}

// MARK: - AI Action Model

struct AIAction: Identifiable, Codable {
    let id: String
    let label: String
    let icon: String
    let type: ActionType
    var payload: [String: String]?
    
    enum ActionType: String, Codable {
        case addToItinerary
        case shareWithGroup
        case savePlace
        case openMap
        case createTask
        case viewDetails
    }
}

// MARK: - AI Source Model

struct AISource: Identifiable, Codable {
    let id: String
    let title: String
    let type: SourceType
    var url: String?
    
    var icon: String {
        switch type {
        case .chat: return "bubble.left"
        case .itinerary: return "calendar"
        case .place: return "mappin"
        case .document: return "doc"
        case .web: return "globe"
        }
    }
    
    enum SourceType: String, Codable {
        case chat
        case itinerary
        case place
        case document
        case web
    }
}

// MARK: - AI Concierge ViewModel

@Observable
final class AIConciergeViewModel {
    // MARK: - Properties
    
    let tripId: String
    
    var messages: [AIMessage] = []
    var userInput: String = ""
    var isLoading: Bool = false
    var isTyping: Bool = false
    var errorMessage: String?
    
    // Context for grounding
    private var tripContext: TripContext?
    
    // Suggested prompts based on trip type
    var suggestedPrompts: [String] {
        guard let context = tripContext else {
            return defaultPrompts
        }
        
        var prompts = defaultPrompts
        
        // Add destination-specific prompts
        if let destination = context.destination {
            prompts.insert("What are the best restaurants in \(destination)?", at: 0)
            prompts.insert("What should I pack for \(destination)?", at: 1)
        }
        
        // Add date-specific prompts
        if context.startDate != nil {
            prompts.append("Create a day-by-day itinerary")
        }
        
        return Array(prompts.prefix(6))
    }
    
    private let defaultPrompts = [
        "Find popular local restaurants",
        "Suggest activities for the group",
        "Help plan our budget",
        "What's the weather forecast?",
        "Recommend things to pack",
        "Create a trip summary"
    ]
    
    // MARK: - Init
    
    init(tripId: String) {
        self.tripId = tripId
    }
    
    // MARK: - Context Loading
    
    @MainActor
    func loadContext() async {
        do {
            tripContext = try await AIService.shared.loadTripContext(tripId: tripId)
        } catch {
            print("Failed to load AI context: \(error)")
        }
    }
    
    // MARK: - Send Message
    
    @MainActor
    func sendMessage() async {
        let input = userInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !input.isEmpty else { return }
        
        // Add user message
        let userMessage = AIMessage(content: input, isUser: true)
        messages.append(userMessage)
        userInput = ""
        
        // Show typing indicator
        isTyping = true
        isLoading = true
        
        do {
            // Get AI response
            let response = try await AIService.shared.chat(
                message: input,
                tripId: tripId,
                context: tripContext,
                history: messages.suffix(10).map { ($0.isUser ? "user" : "assistant", $0.content) }
            )
            
            // Add AI response
            let aiMessage = AIMessage(
                content: response.content,
                isUser: false,
                actions: response.actions,
                sources: response.sources
            )
            
            messages.append(aiMessage)
            ChravelHaptics.success()
            
        } catch {
            errorMessage = error.localizedDescription
            
            // Add error message
            let errorResponse = AIMessage(
                content: "I'm sorry, I encountered an error. Please try again.",
                isUser: false
            )
            messages.append(errorResponse)
            
            ChravelHaptics.error()
        }
        
        isTyping = false
        isLoading = false
    }
    
    // MARK: - Handle Action
    
    @MainActor
    func handleAction(_ action: AIAction) async {
        switch action.type {
        case .addToItinerary:
            await addToItinerary(action.payload)
            
        case .shareWithGroup:
            await shareWithGroup(action.payload)
            
        case .savePlace:
            await savePlace(action.payload)
            
        case .openMap:
            openInMaps(action.payload)
            
        case .createTask:
            await createTask(action.payload)
            
        case .viewDetails:
            // Handled by navigation
            break
        }
    }
    
    // MARK: - Action Handlers
    
    private func addToItinerary(_ payload: [String: String]?) async {
        guard let name = payload?["name"],
              let dateString = payload?["date"] else {
            return
        }
        
        do {
            try await ItineraryService.shared.addEvent(
                tripId: tripId,
                name: name,
                date: ISO8601DateFormatter().date(from: dateString) ?? Date()
            )
            
            // Confirm in chat
            let confirmMessage = AIMessage(
                content: "✓ Added **\(name)** to your itinerary!",
                isUser: false
            )
            messages.append(confirmMessage)
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    private func shareWithGroup(_ payload: [String: String]?) async {
        guard let message = payload?["message"] else { return }
        
        do {
            try await ChatService.shared.sendMessage(
                tripId: tripId,
                content: message,
                type: .text
            )
            
            let confirmMessage = AIMessage(
                content: "✓ Shared with the group!",
                isUser: false
            )
            messages.append(confirmMessage)
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    private func savePlace(_ payload: [String: String]?) async {
        guard let placeId = payload?["place_id"],
              let name = payload?["name"] else {
            return
        }
        
        do {
            try await PlacesService.shared.savePlace(
                tripId: tripId,
                placeId: placeId,
                name: name
            )
            
            let confirmMessage = AIMessage(
                content: "✓ Saved **\(name)** to trip places!",
                isUser: false
            )
            messages.append(confirmMessage)
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    private func openInMaps(_ payload: [String: String]?) {
        guard let lat = payload?["lat"],
              let lng = payload?["lng"],
              let latitude = Double(lat),
              let longitude = Double(lng) else {
            return
        }
        
        let url = URL(string: "maps://?ll=\(latitude),\(longitude)")!
        UIApplication.shared.open(url)
    }
    
    private func createTask(_ payload: [String: String]?) async {
        guard let title = payload?["title"] else { return }
        
        do {
            try await TasksService.shared.createTask(
                tripId: tripId,
                title: title
            )
            
            let confirmMessage = AIMessage(
                content: "✓ Created task: **\(title)**",
                isUser: false
            )
            messages.append(confirmMessage)
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Trip Context

struct TripContext: Codable {
    let tripId: String
    let name: String
    let destination: String?
    let startDate: Date?
    let endDate: Date?
    let memberCount: Int
    var recentMessages: [String]?
    var itineraryItems: [String]?
    var savedPlaces: [String]?
}

// MARK: - AI Response

struct AIResponse {
    let content: String
    let actions: [AIAction]?
    let sources: [AISource]?
}

// MARK: - AI Service

final class AIService {
    static let shared = AIService()
    
    private init() {}
    
    func loadTripContext(tripId: String) async throws -> TripContext {
        // Fetch trip details for context
        let response = try await SupabaseClient.shared.database
            .from("trips")
            .select("""
                id, name, destination, start_date, end_date,
                trip_members(count),
                messages(content).order(created_at.desc).limit(10),
                itinerary_items(title).limit(10),
                trip_places(name).limit(10)
            """)
            .eq("id", value: tripId)
            .single()
            .execute()
        
        // Parse response into context
        struct TripRow: Decodable {
            let id: String
            let name: String
            let destination: String?
            let start_date: Date?
            let end_date: Date?
            let trip_members: [CountResult]?
            let messages: [MessageContent]?
            let itinerary_items: [ItemTitle]?
            let trip_places: [PlaceName]?
            
            struct CountResult: Decodable { let count: Int }
            struct MessageContent: Decodable { let content: String }
            struct ItemTitle: Decodable { let title: String }
            struct PlaceName: Decodable { let name: String }
        }
        
        let row = try JSONDecoder.supabaseDecoder.decode(TripRow.self, from: response.data)
        
        return TripContext(
            tripId: row.id,
            name: row.name,
            destination: row.destination,
            startDate: row.start_date,
            endDate: row.end_date,
            memberCount: row.trip_members?.first?.count ?? 0,
            recentMessages: row.messages?.map { $0.content },
            itineraryItems: row.itinerary_items?.map { $0.title },
            savedPlaces: row.trip_places?.map { $0.name }
        )
    }
    
    func chat(
        message: String,
        tripId: String,
        context: TripContext?,
        history: [(String, String)]
    ) async throws -> AIResponse {
        // Call Supabase Edge Function for AI processing
        let payload: [String: Any] = [
            "message": message,
            "trip_id": tripId,
            "context": context.map { [
                "name": $0.name,
                "destination": $0.destination ?? "",
                "start_date": $0.startDate?.iso8601String ?? "",
                "end_date": $0.endDate?.iso8601String ?? "",
                "member_count": $0.memberCount,
                "recent_messages": $0.recentMessages ?? [],
                "itinerary_items": $0.itineraryItems ?? [],
                "saved_places": $0.savedPlaces ?? []
            ] as [String: Any] } ?? [:],
            "history": history.map { ["role": $0.0, "content": $0.1] }
        ]
        
        let response = try await SupabaseClient.shared.functions
            .invoke("gemini-chat", options: .init(body: payload))
        
        guard let data = response.data else {
            throw AIError.emptyResponse
        }
        
        struct EdgeResponse: Decodable {
            let response: String
            let actions: [AIAction]?
            let sources: [AISource]?
        }
        
        let result = try JSONDecoder().decode(EdgeResponse.self, from: data)
        
        return AIResponse(
            content: result.response,
            actions: result.actions,
            sources: result.sources
        )
    }
}

// MARK: - AI Error

enum AIError: LocalizedError {
    case emptyResponse
    case parsingFailed
    
    var errorDescription: String? {
        switch self {
        case .emptyResponse:
            return "AI service returned an empty response."
        case .parsingFailed:
            return "Failed to parse AI response."
        }
    }
}

// MARK: - Stub Services

// Itinerary Service
final class ItineraryService {
    static let shared = ItineraryService()
    private init() {}
    
    func addEvent(tripId: String, name: String, date: Date) async throws {
        let eventData: [String: Any] = [
            "trip_id": tripId,
            "title": name,
            "start_time": date.iso8601String,
            "created_at": Date().iso8601String
        ]
        
        try await SupabaseClient.shared.database
            .from("itinerary_items")
            .insert(eventData)
            .execute()
    }
}

// Places Service
final class PlacesService {
    static let shared = PlacesService()
    private init() {}
    
    func savePlace(tripId: String, placeId: String, name: String) async throws {
        let placeData: [String: Any] = [
            "trip_id": tripId,
            "place_id": placeId,
            "name": name,
            "created_at": Date().iso8601String
        ]
        
        try await SupabaseClient.shared.database
            .from("trip_places")
            .insert(placeData)
            .execute()
    }
}

// Tasks Service
final class TasksService {
    static let shared = TasksService()
    private init() {}
    
    func createTask(tripId: String, title: String) async throws {
        let taskData: [String: Any] = [
            "trip_id": tripId,
            "title": title,
            "status": "pending",
            "created_at": Date().iso8601String
        ]
        
        try await SupabaseClient.shared.database
            .from("tasks")
            .insert(taskData)
            .execute()
    }
}
