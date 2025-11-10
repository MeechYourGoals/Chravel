//
//  EventEditorView.swift
//  Chravel iOS Event Editor
//
//  SwiftUI view for creating/editing events with native date/time pickers
//

import SwiftUI
import Foundation

struct EventEditorView: View {
    @Binding var event: EventItem?
    let onSave: (EventItem) -> Void
    let onCancel: () -> Void
    
    @State private var title: String = ""
    @State private var startDate: Date = Date()
    @State private var endDate: Date = Date().addingTimeInterval(3600)
    @State private var location: String = ""
    @State private var description: String = ""
    @State private var availabilityStatus: String = "busy"
    @State private var isRecurring: Bool = false
    @State private var recurrenceFrequency: String = "daily"
    @State private var recurrenceInterval: Int = 1
    @State private var recurrenceCount: Int? = nil
    
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Event Details")) {
                    TextField("Event Title", text: $title)
                    
                    DatePicker("Start Date & Time", selection: $startDate, displayedComponents: [.date, .hourAndMinute])
                        .environment(\.timeZone, TimeZone.current)
                    
                    DatePicker("End Date & Time", selection: $endDate, displayedComponents: [.date, .hourAndMinute])
                        .environment(\.timeZone, TimeZone.current)
                }
                
                Section(header: Text("Location")) {
                    TextField("Location", text: $location)
                }
                
                Section(header: Text("Description")) {
                    TextEditor(text: $description)
                        .frame(height: 100)
                }
                
                Section(header: Text("Availability")) {
                    Picker("Status", selection: $availabilityStatus) {
                        Text("Busy").tag("busy")
                        Text("Free").tag("free")
                        Text("Tentative").tag("tentative")
                    }
                }
                
                Section(header: Text("Recurrence")) {
                    Toggle("Repeat Event", isOn: $isRecurring)
                    
                    if isRecurring {
                        Picker("Frequency", selection: $recurrenceFrequency) {
                            Text("Daily").tag("daily")
                            Text("Weekly").tag("weekly")
                            Text("Monthly").tag("monthly")
                            Text("Yearly").tag("yearly")
                        }
                        
                        Stepper("Every \(recurrenceInterval) \(recurrenceFrequency == "daily" ? "day(s)" : recurrenceFrequency == "weekly" ? "week(s)" : recurrenceFrequency == "monthly" ? "month(s)" : "year(s)")", value: $recurrenceInterval, in: 1...365)
                        
                        Toggle("End after number of occurrences", isOn: Binding(
                            get: { recurrenceCount != nil },
                            set: { if !$0 { recurrenceCount = nil } }
                        ))
                        
                        if recurrenceCount != nil {
                            Stepper("Occurrences: \(recurrenceCount ?? 1)", value: Binding(
                                get: { recurrenceCount ?? 1 },
                                set: { recurrenceCount = $0 }
                            ), in: 1...999)
                        }
                    }
                }
            }
            .navigationTitle(event == nil ? "New Event" : "Edit Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        onCancel()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveEvent()
                    }
                    .disabled(title.isEmpty)
                }
            }
        }
        .onAppear {
            if let existingEvent = event {
                loadEvent(existingEvent)
            }
        }
    }
    
    private func loadEvent(_ event: EventItem) {
        title = event.title
        startDate = event.startDate
        endDate = event.endDate ?? event.startDate.addingTimeInterval(3600)
        location = event.location ?? ""
        description = event.description ?? ""
        availabilityStatus = event.availabilityStatus ?? "busy"
        
        if let rrule = event.recurrenceRule {
            isRecurring = true
            parseRRule(rrule)
        }
    }
    
    private func parseRRule(_ rrule: String) {
        let components = rrule.components(separatedBy: ";")
        for component in components {
            let parts = component.components(separatedBy: "=")
            guard parts.count == 2 else { continue }
            
            switch parts[0].uppercased() {
            case "FREQ":
                recurrenceFrequency = parts[1].lowercased()
            case "INTERVAL":
                recurrenceInterval = Int(parts[1]) ?? 1
            case "COUNT":
                recurrenceCount = Int(parts[1])
            default:
                break
            }
        }
    }
    
    private func generateRRule() -> String? {
        guard isRecurring else { return nil }
        
        var rrule = "FREQ=\(recurrenceFrequency.uppercased())"
        rrule += ";INTERVAL=\(recurrenceInterval)"
        
        if let count = recurrenceCount {
            rrule += ";COUNT=\(count)"
        }
        
        return rrule
    }
    
    private func saveEvent() {
        let newEvent = EventItem(
            id: event?.id ?? UUID().uuidString,
            title: title,
            startDate: startDate,
            endDate: endDate,
            location: location.isEmpty ? nil : location,
            description: description.isEmpty ? nil : description,
            recurrenceRule: generateRRule(),
            availabilityStatus: availabilityStatus,
            isBusy: availabilityStatus == "busy"
        )
        
        onSave(newEvent)
        presentationMode.wrappedValue.dismiss()
    }
}
