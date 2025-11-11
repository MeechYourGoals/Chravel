//
//  CalendarView.swift
//  Chravel iOS Calendar View
//
//  SwiftUI calendar view for displaying events
//

import SwiftUI
import Foundation

struct CalendarView: View {
    @State private var selectedDate: Date = Date()
    let events: [EventItem]
    let onDateSelect: (Date) -> Void
    let onEventSelect: (EventItem) -> Void
    
    private let calendar = Calendar.current
    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        formatter.locale = Locale.current
        formatter.timeZone = TimeZone.current
        return formatter
    }()
    
    var body: some View {
        VStack(spacing: 0) {
            // Month header
            HStack {
                Button(action: previousMonth) {
                    Image(systemName: "chevron.left")
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                Text(dateFormatter.string(from: selectedDate))
                    .font(.headline)
                
                Spacer()
                
                Button(action: nextMonth) {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.primary)
                }
            }
            .padding()
            
            // Weekday headers
            HStack(spacing: 0) {
                ForEach(weekdaySymbols, id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal)
            
            // Calendar grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                ForEach(calendarDays, id: \.self) { date in
                    CalendarDayView(
                        date: date,
                        isSelected: calendar.isDate(date, inSameDayAs: selectedDate),
                        isToday: calendar.isDateInToday(date),
                        hasEvents: hasEvents(on: date),
                        eventCount: eventCount(on: date)
                    ) {
                        selectedDate = date
                        onDateSelect(date)
                    }
                }
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }
    
    private var weekdaySymbols: [String] {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        return formatter.shortWeekdaySymbols
    }
    
    private var calendarDays: [Date] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: selectedDate),
              let firstDay = calendar.date(from: calendar.dateComponents([.year, .month], from: selectedDate)) else {
            return []
        }
        
        let firstWeekday = calendar.component(.weekday, from: firstDay)
        let daysToSubtract = (firstWeekday - calendar.firstWeekday + 7) % 7
        
        guard let startDate = calendar.date(byAdding: .day, value: -daysToSubtract, to: firstDay) else {
            return []
        }
        
        var days: [Date] = []
        var currentDate = startDate
        
        // Generate 42 days (6 weeks)
        for _ in 0..<42 {
            days.append(currentDate)
            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else {
                break
            }
            currentDate = nextDate
        }
        
        return days
    }
    
    private func hasEvents(on date: Date) -> Bool {
        events.contains { event in
            calendar.isDate(event.startDate, inSameDayAs: date)
        }
    }
    
    private func eventCount(on date: Date) -> Int {
        events.filter { event in
            calendar.isDate(event.startDate, inSameDayAs: date)
        }.count
    }
    
    private func previousMonth() {
        if let newDate = calendar.date(byAdding: .month, value: -1, to: selectedDate) {
            selectedDate = newDate
        }
    }
    
    private func nextMonth() {
        if let newDate = calendar.date(byAdding: .month, value: 1, to: selectedDate) {
            selectedDate = newDate
        }
    }
}

struct CalendarDayView: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let hasEvents: Bool
    let eventCount: Int
    let onTap: () -> Void
    
    private let calendar = Calendar.current
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                Text("\(calendar.component(.day, from: date))")
                    .font(.system(size: 16, weight: isToday ? .bold : .regular))
                    .foregroundColor(isToday ? .white : (isSelected ? .blue : .primary))
                
                if hasEvents {
                    HStack(spacing: 2) {
                        ForEach(0..<min(eventCount, 3), id: \.self) { _ in
                            Circle()
                                .fill(isSelected ? .white : .blue)
                                .frame(width: 4, height: 4)
                        }
                        if eventCount > 3 {
                            Text("+")
                                .font(.system(size: 8))
                                .foregroundColor(isSelected ? .white : .blue)
                        }
                    }
                }
            }
            .frame(width: 44, height: 44)
            .background(
                Circle()
                    .fill(isToday ? Color.blue : (isSelected ? Color.blue.opacity(0.1) : Color.clear))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}
