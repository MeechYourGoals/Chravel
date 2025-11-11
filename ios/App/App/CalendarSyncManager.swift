//
//  CalendarSyncManager.swift
//  Chravel iOS Calendar Sync
//
//  Manages EventKit integration for bidirectional calendar sync
//

import Foundation
import EventKit
import Capacitor

@objc public class CalendarSyncManager: NSObject {
    private let eventStore = EKEventStore()
    private var calendar: EKCalendar?
    
    // Request calendar access
    @objc public func requestCalendarAccess(completion: @escaping (Bool, String?) -> Void) {
        eventStore.requestAccess(to: .event) { granted, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(false, error.localizedDescription)
                    return
                }
                completion(granted, nil)
            }
        }
    }
    
    // Get authorization status
    @objc public func getAuthorizationStatus() -> EKAuthorizationStatus {
        return EKEventStore.authorizationStatus(for: .event)
    }
    
    // Get or create Chravel calendar
    @objc public func getChravelCalendar() -> EKCalendar? {
        if let existingCalendar = calendar {
            return existingCalendar
        }
        
        // Look for existing Chravel calendar
        let calendars = eventStore.calendars(for: .event)
        if let chravelCalendar = calendars.first(where: { $0.title == "Chravel" }) {
            calendar = chravelCalendar
            return chravelCalendar
        }
        
        // Create new Chravel calendar
        guard let newCalendar = EKCalendar(for: .event, eventStore: eventStore) else {
            return nil
        }
        
        newCalendar.title = "Chravel"
        newCalendar.cgColor = UIColor.systemBlue.cgColor
        
        // Find default calendar source
        if let defaultSource = eventStore.defaultCalendarForNewEvents?.source {
            newCalendar.source = defaultSource
        } else if let iCloudSource = eventStore.sources.first(where: { $0.sourceType == .calDAV && $0.title.contains("iCloud") }) {
            newCalendar.source = iCloudSource
        } else if let localSource = eventStore.sources.first(where: { $0.sourceType == .local }) {
            newCalendar.source = localSource
        } else {
            return nil
        }
        
        do {
            try eventStore.saveCalendar(newCalendar, commit: true)
            calendar = newCalendar
            return newCalendar
        } catch {
            print("Failed to create Chravel calendar: \(error.localizedDescription)")
            return nil
        }
    }
    
    // Sync trip event to device calendar
    @objc public func syncEventToDevice(
        eventId: String,
        title: String,
        startDate: Date,
        endDate: Date?,
        location: String?,
        notes: String?,
        recurrenceRule: String?,
        completion: @escaping (String?, String?) -> Void
    ) {
        guard let chravelCalendar = getChravelCalendar() else {
            completion(nil, "Failed to get or create Chravel calendar")
            return
        }
        
        // Check if event already exists
        let predicate = eventStore.predicateForEvents(
            withStart: startDate.addingTimeInterval(-86400), // 1 day before
            end: (endDate ?? startDate.addingTimeInterval(3600)).addingTimeInterval(86400), // 1 day after
            calendars: [chravelCalendar]
        )
        
        let existingEvents = eventStore.events(matching: predicate)
        let existingEvent = existingEvents.first { event in
            event.notes?.contains("chravel-event-id:\(eventId)") ?? false
        }
        
        let event = existingEvent ?? EKEvent(eventStore: eventStore)
        event.calendar = chravelCalendar
        event.title = title
        event.startDate = startDate
        event.endDate = endDate ?? startDate.addingTimeInterval(3600) // Default 1 hour
        event.location = location
        event.notes = notes ?? ""
        
        // Add Chravel event ID to notes for tracking
        if !event.notes!.contains("chravel-event-id:") {
            event.notes = (event.notes ?? "") + "\nchravel-event-id:\(eventId)"
        }
        
        // Handle recurrence rule (simplified - full RRULE parsing would be more complex)
        if let rrule = recurrenceRule {
            event.recurrenceRules = parseRRule(rrule, startDate: startDate)
        }
        
        do {
            if existingEvent != nil {
                try eventStore.save(event, span: .thisEvent, commit: true)
            } else {
                try eventStore.save(event, span: .futureEvents, commit: true)
            }
            completion(event.eventIdentifier, nil)
        } catch {
            completion(nil, error.localizedDescription)
        }
    }
    
    // Parse RRULE string to EKRecurrenceRule (simplified)
    private func parseRRule(_ rrule: String, startDate: Date) -> [EKRecurrenceRule]? {
        let components = rrule.components(separatedBy: ";")
        var frequency: EKRecurrenceFrequency?
        var interval: Int = 1
        var count: Int?
        
        for component in components {
            let parts = component.components(separatedBy: "=")
            guard parts.count == 2 else { continue }
            
            let key = parts[0].uppercased()
            let value = parts[1]
            
            switch key {
            case "FREQ":
                switch value.uppercased() {
                case "DAILY":
                    frequency = .daily
                case "WEEKLY":
                    frequency = .weekly
                case "MONTHLY":
                    frequency = .monthly
                case "YEARLY":
                    frequency = .yearly
                default:
                    break
                }
            case "INTERVAL":
                interval = Int(value) ?? 1
            case "COUNT":
                count = Int(value)
            default:
                break
            }
        }
        
        guard let freq = frequency else { return nil }
        
        let recurrenceRule = EKRecurrenceRule(
            recurrenceWith: freq,
            interval: interval,
            end: count != nil ? EKRecurrenceEnd(count: count!) : nil
        )
        
        return [recurrenceRule]
    }
    
    // Remove event from device calendar
    @objc public func removeEventFromDevice(eventIdentifier: String, completion: @escaping (Bool, String?) -> Void) {
        guard let event = eventStore.event(withIdentifier: eventIdentifier) else {
            completion(false, "Event not found")
            return
        }
        
        do {
            try eventStore.remove(event, span: .futureEvents, commit: true)
            completion(true, nil)
        } catch {
            completion(false, error.localizedDescription)
        }
    }
    
    // Get events from device calendar for a date range
    @objc public func getDeviceEvents(
        startDate: Date,
        endDate: Date,
        completion: @escaping ([[String: Any]]?, String?) -> Void
    ) {
        guard let chravelCalendar = getChravelCalendar() else {
            completion(nil, "Failed to get Chravel calendar")
            return
        }
        
        let predicate = eventStore.predicateForEvents(
            withStart: startDate,
            end: endDate,
            calendars: [chravelCalendar]
        )
        
        let events = eventStore.events(matching: predicate)
        let eventDicts = events.compactMap { event -> [String: Any]? in
            guard let notes = event.notes,
                  let range = notes.range(of: "chravel-event-id:"),
                  let eventIdRange = notes.range(of: "\n", range: range.upperBound..<notes.endIndex) else {
                return nil
            }
            
            let eventId = String(notes[range.upperBound..<eventIdRange.lowerBound])
            
            return [
                "id": eventId,
                "title": event.title,
                "startDate": ISO8601DateFormatter().string(from: event.startDate),
                "endDate": ISO8601DateFormatter().string(from: event.endDate),
                "location": event.location ?? "",
                "notes": event.notes ?? "",
                "eventIdentifier": event.eventIdentifier
            ]
        }
        
        completion(eventDicts, nil)
    }
    
    // Schedule local notification for event reminder
    @objc public func scheduleEventReminder(
        eventId: String,
        title: String,
        date: Date,
        reminderMinutes: Int = 15,
        completion: @escaping (Bool, String?) -> Void
    ) {
        let center = UNUserNotificationCenter.current()
        
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                completion(false, error.localizedDescription)
                return
            }
            
            guard granted else {
                completion(false, "Notification permission denied")
                return
            }
            
            let content = UNMutableNotificationContent()
            content.title = "Upcoming Event"
            content.body = title
            content.sound = .default
            content.userInfo = ["eventId": eventId, "type": "event_reminder"]
            
            let triggerDate = date.addingTimeInterval(-Double(reminderMinutes * 60))
            let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: triggerDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            
            let request = UNNotificationRequest(
                identifier: "chravel-event-\(eventId)",
                content: content,
                trigger: trigger
            )
            
            center.add(request) { error in
                if let error = error {
                    completion(false, error.localizedDescription)
                } else {
                    completion(true, nil)
                }
            }
        }
    }
}
