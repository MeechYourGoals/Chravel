//
//  EventListView.swift
//  Chravel iOS Event List
//
//  SwiftUI view for displaying list of events
//

import SwiftUI
import Foundation

struct EventListView: View {
    let events: [EventItem]
    let onEventTap: (EventItem) -> Void
    let onEventDelete: (EventItem) -> Void
    
    var body: some View {
        List {
            if events.isEmpty {
                EmptyStateView()
            } else {
                ForEach(groupedEvents.keys.sorted(), id: \.self) { date in
                    Section(header: Text(formatDate(date))) {
                        ForEach(groupedEvents[date] ?? [], id: \.id) { event in
                            EventRowView(event: event) {
                                onEventTap(event)
                            }
                        }
                        .onDelete { indexSet in
                            if let date = groupedEvents.keys.sorted()[indexSet.first ?? 0] {
                                if let event = groupedEvents[date]?[indexSet.first ?? 0] {
                                    onEventDelete(event)
                                }
                            }
                        }
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
    }
    
    private var groupedEvents: [Date: [EventItem]] {
        Dictionary(grouping: events) { event in
            Calendar.current.startOfDay(for: event.startDate)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        formatter.locale = Locale.current
        formatter.timeZone = TimeZone.current
        
        if Calendar.current.isDateInToday(date) {
            return "Today"
        } else if Calendar.current.isDateInTomorrow(date) {
            return "Tomorrow"
        } else {
            return formatter.string(from: date)
        }
    }
}

struct EventRowView: View {
    let event: EventItem
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                // Time indicator
                VStack(alignment: .leading, spacing: 2) {
                    Text(formatTime(event.startDate))
                        .font(.headline)
                        .foregroundColor(.primary)
                    if let endDate = event.endDate {
                        Text(formatTime(endDate))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(width: 60, alignment: .leading)
                
                // Event details
                VStack(alignment: .leading, spacing: 4) {
                    Text(event.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if let location = event.location, !location.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(location)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    if let description = event.description, !description.isEmpty {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                    
                    // Availability status badge
                    if let status = event.availabilityStatus {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(statusColor(status))
                                .frame(width: 8, height: 8)
                            Text(statusText(status))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Spacer()
                
                // Recurring indicator
                if event.recurrenceRule != nil {
                    Image(systemName: "repeat")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.locale = Locale.current
        formatter.timeZone = TimeZone.current
        return formatter.string(from: date)
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status {
        case "busy":
            return .red
        case "free":
            return .green
        case "tentative":
            return .orange
        default:
            return .gray
        }
    }
    
    private func statusText(_ status: String) -> String {
        switch status {
        case "busy":
            return "Busy"
        case "free":
            return "Free"
        case "tentative":
            return "Tentative"
        default:
            return ""
        }
    }
}

struct EventItem: Identifiable {
    let id: String
    let title: String
    let startDate: Date
    let endDate: Date?
    let location: String?
    let description: String?
    let recurrenceRule: String?
    let availabilityStatus: String?
    let isBusy: Bool
}

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text("No Events")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("Add events to see them here")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}
