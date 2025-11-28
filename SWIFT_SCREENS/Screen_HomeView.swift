// HomeView.swift
// Chravel iOS - Main Trip Dashboard Screen
// Generated from MSPEC

import SwiftUI

// MARK: - HomeView

struct HomeView: View {
    // MARK: - Environment
    @Environment(TripsViewModel.self) private var viewModel
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(NavigationCoordinator.self) private var coordinator
    
    // MARK: - State
    @State private var showCreateTrip = false
    @State private var showSearch = false
    @State private var showSettings = false
    @State private var showUpgrade = false
    
    // MARK: - Body
    var body: some View {
        @Bindable var viewModel = viewModel
        
        ZStack {
            // Background
            Color.chravelBlack
                .ignoresSafeArea()
            
            // Animated background elements
            GeometryReader { geometry in
                AnimatedBackground(size: geometry.size)
            }
            .ignoresSafeArea()
            
            // Main Content
            VStack(spacing: 0) {
                // View Mode Selector
                ViewModeSelector(selectedMode: $viewModel.viewMode)
                    .padding(.horizontal, ChravelSpacing.md)
                    .padding(.top, ChravelSpacing.xs)
                
                // Search/Filter Indicator or Stats
                Group {
                    if !viewModel.searchQuery.isEmpty || viewModel.activeFilter != .all {
                        SearchIndicator(
                            query: viewModel.searchQuery,
                            filter: viewModel.activeFilter,
                            resultCount: viewModel.filteredTrips.count
                        ) {
                            viewModel.searchQuery = ""
                            viewModel.activeFilter = .all
                        }
                    } else {
                        TripStatsBar(stats: viewModel.tripStats)
                    }
                }
                .padding(.horizontal, ChravelSpacing.md)
                .padding(.vertical, ChravelSpacing.sm)
                
                // Trip Grid
                if viewModel.isLoading {
                    LoadingGridView()
                } else if currentTrips.isEmpty {
                    EmptyStateForCurrentMode()
                } else {
                    TripGridView(
                        trips: currentTrips,
                        onTripTap: navigateToTrip
                    )
                }
            }
            
            // Floating Action Button
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    ChravelFAB(icon: "plus") {
                        ChravelHaptics.medium()
                        showCreateTrip = true
                    }
                    .padding(ChravelSpacing.lg)
                }
            }
        }
        .navigationTitle("Chravel")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    showSettings = true
                } label: {
                    ChravelAvatar(
                        url: authViewModel.user?.avatarURL,
                        fallback: String(authViewModel.user?.displayName.prefix(1) ?? "?"),
                        size: .small
                    )
                }
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: ChravelSpacing.sm) {
                    Button {
                        showSearch = true
                    } label: {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.textPrimary)
                    }
                    
                    Button {
                        showUpgrade = true
                    } label: {
                        Image(systemName: "crown")
                            .foregroundColor(.chravelGold)
                    }
                }
            }
        }
        .searchable(
            text: $viewModel.searchQuery,
            isPresented: $showSearch,
            prompt: "Search trips..."
        )
        .refreshable {
            await viewModel.loadTrips()
        }
        .sheet(isPresented: $showCreateTrip) {
            CreateTripSheet()
        }
        .sheet(isPresented: $showSettings) {
            SettingsSheet()
        }
        .sheet(isPresented: $showUpgrade) {
            UpgradeSheet()
        }
        .task {
            await viewModel.loadTrips()
        }
    }
    
    // MARK: - Computed Properties
    
    private var currentTrips: [Trip] {
        switch viewModel.viewMode {
        case .myTrips:
            return viewModel.filteredTrips
        case .tripsPro:
            return viewModel.proTrips
        case .events:
            return viewModel.events
        case .travelRecs:
            return [] // Handled separately
        }
    }
    
    // MARK: - Navigation
    
    private func navigateToTrip(_ trip: Trip) {
        ChravelHaptics.light()
        
        switch trip.tripType {
        case .consumer:
            coordinator.homeNavPath.append(TripDestination.detail(trip.id))
        case .pro:
            coordinator.homeNavPath.append(TripDestination.proDetail(trip.id))
        case .event:
            coordinator.homeNavPath.append(TripDestination.event(trip.id))
        }
    }
    
    // MARK: - Empty State
    
    @ViewBuilder
    private func EmptyStateForCurrentMode() -> some View {
        switch viewModel.viewMode {
        case .myTrips:
            EmptyStateView(
                icon: "airplane",
                title: "No trips yet",
                message: "Create your first trip to start planning your adventure!",
                actionTitle: "Create Trip"
            ) {
                showCreateTrip = true
            }
        case .tripsPro:
            EmptyStateView(
                icon: "briefcase.fill",
                title: "No Pro trips",
                message: "Pro trips are for professional teams and tours. Upgrade to create one.",
                actionTitle: "Learn More"
            ) {
                showUpgrade = true
            }
        case .events:
            EmptyStateView(
                icon: "calendar.badge.plus",
                title: "No events",
                message: "Events are for conferences, festivals, and gatherings.",
                actionTitle: "Create Event"
            ) {
                showCreateTrip = true
            }
        case .travelRecs:
            TravelRecsView()
        }
    }
}

// MARK: - Supporting Views

struct AnimatedBackground: View {
    let size: CGSize
    
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.chravelOrange.opacity(0.08))
                .frame(width: size.width * 0.8, height: size.width * 0.8)
                .blur(radius: 60)
                .offset(x: -size.width * 0.2, y: -size.height * 0.1)
            
            Circle()
                .fill(Color.chravelYellow.opacity(0.06))
                .frame(width: size.width * 0.6, height: size.width * 0.6)
                .blur(radius: 50)
                .offset(x: size.width * 0.3, y: size.height * 0.3)
        }
    }
}

struct SearchIndicator: View {
    let query: String
    let filter: DateFilter
    let resultCount: Int
    let onClear: () -> Void
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            Circle()
                .fill(Color.chravelOrange)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: ChravelSpacing.xxs) {
                    if !query.isEmpty {
                        Text(""\(query)"")
                            .foregroundColor(.chravelOrange)
                    }
                    
                    if filter != .all {
                        Text("• \(filter.displayName)")
                            .foregroundColor(.textTertiary)
                    }
                }
                .font(ChravelTypography.label)
                
                Text("\(resultCount) result\(resultCount == 1 ? "" : "s")")
                    .font(ChravelTypography.caption)
                    .foregroundColor(.textTertiary)
            }
            
            Spacer()
            
            Button {
                ChravelHaptics.light()
                onClear()
            } label: {
                HStack(spacing: ChravelSpacing.xxs) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .semibold))
                    Text("Clear")
                        .font(ChravelTypography.labelSmall)
                }
                .foregroundColor(.chravelOrange)
            }
        }
        .padding(ChravelSpacing.sm)
        .background(Color.chravelOrange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
    }
}

struct LoadingGridView: View {
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: ChravelSpacing.md),
                GridItem(.flexible(), spacing: ChravelSpacing.md)
            ], spacing: ChravelSpacing.md) {
                ForEach(0..<6, id: \.self) { _ in
                    TripCardSkeleton()
                }
            }
            .padding(ChravelSpacing.md)
        }
    }
}

struct TripCardSkeleton: View {
    @State private var isAnimating = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(Color.chravelLightGray)
                .frame(height: 120)
            
            VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                Rectangle()
                    .fill(Color.chravelLightGray)
                    .frame(height: 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                Rectangle()
                    .fill(Color.chravelLightGray)
                    .frame(width: 100, height: 12)
                
                Rectangle()
                    .fill(Color.chravelLightGray)
                    .frame(width: 80, height: 12)
            }
            .padding(ChravelSpacing.sm)
        }
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
        .opacity(isAnimating ? 0.5 : 1)
        .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
        .onAppear {
            isAnimating = true
        }
    }
}

struct TripGridView: View {
    let trips: [Trip]
    let onTripTap: (Trip) -> Void
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: ChravelSpacing.md),
                GridItem(.flexible(), spacing: ChravelSpacing.md)
            ], spacing: ChravelSpacing.md) {
                ForEach(trips) { trip in
                    TripCard(trip: trip) {
                        onTripTap(trip)
                    }
                    .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(ChravelSpacing.md)
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: trips.count)
        }
    }
}

struct TravelRecsView: View {
    var body: some View {
        VStack(spacing: ChravelSpacing.lg) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundColor(.chravelOrange)
            
            Text("AI Travel Recommendations")
                .font(ChravelTypography.headline)
                .foregroundColor(.textPrimary)
            
            Text("Coming soon! Get personalized travel suggestions based on your preferences.")
                .font(ChravelTypography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, ChravelSpacing.xl)
        }
        .frame(maxHeight: .infinity)
    }
}

// MARK: - Create Trip Sheet

struct CreateTripSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(TripsViewModel.self) private var tripsViewModel
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(NavigationCoordinator.self) private var coordinator
    
    @State private var name = ""
    @State private var description = ""
    @State private var destination = ""
    @State private var startDate: Date?
    @State private var endDate: Date?
    @State private var tripType: TripType = .consumer
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showDatePicker = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: ChravelSpacing.lg) {
                    // Trip Type Selector
                    VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                        Text("Trip Type")
                            .font(ChravelTypography.label)
                            .foregroundColor(.textSecondary)
                        
                        HStack(spacing: ChravelSpacing.sm) {
                            ForEach(TripType.allCases, id: \.self) { type in
                                TripTypeButton(
                                    type: type,
                                    isSelected: tripType == type
                                ) {
                                    tripType = type
                                }
                            }
                        }
                    }
                    
                    // Name
                    ChravelTextField(
                        placeholder: "Trip Name",
                        text: $name,
                        icon: "airplane"
                    )
                    
                    // Destination
                    ChravelTextField(
                        placeholder: "Destination",
                        text: $destination,
                        icon: "mappin.circle"
                    )
                    
                    // Date Range
                    VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                        Text("Dates (Optional)")
                            .font(ChravelTypography.label)
                            .foregroundColor(.textSecondary)
                        
                        DateRangePicker(
                            startDate: $startDate,
                            endDate: $endDate
                        )
                    }
                    
                    // Description
                    ChravelTextArea(
                        placeholder: "Description (optional)",
                        text: $description,
                        minHeight: 80
                    )
                    
                    // Error Message
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(ChravelTypography.caption)
                            .foregroundColor(.error)
                    }
                }
                .padding(ChravelSpacing.lg)
            }
            .background(Color.chravelBlack)
            .navigationTitle("Create Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.textSecondary)
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Create") {
                        Task {
                            await createTrip()
                        }
                    }
                    .fontWeight(.semibold)
                    .foregroundColor(.chravelOrange)
                    .disabled(name.isEmpty || isLoading)
                }
            }
            .loadingOverlay(isLoading: isLoading, message: "Creating trip...")
        }
    }
    
    private func createTrip() async {
        isLoading = true
        errorMessage = nil
        
        let request = CreateTripRequest(
            name: name,
            description: description.isEmpty ? nil : description,
            destination: destination.isEmpty ? nil : destination,
            startDate: startDate,
            endDate: endDate,
            tripType: tripType
        )
        
        if let trip = await tripsViewModel.createTrip(request) {
            ChravelHaptics.success()
            dismiss()
            
            // Navigate to the new trip
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                switch trip.tripType {
                case .consumer:
                    coordinator.homeNavPath.append(TripDestination.detail(trip.id))
                case .pro:
                    coordinator.homeNavPath.append(TripDestination.proDetail(trip.id))
                case .event:
                    coordinator.homeNavPath.append(TripDestination.event(trip.id))
                }
            }
        } else {
            ChravelHaptics.error()
            errorMessage = tripsViewModel.errorMessage ?? "Failed to create trip"
        }
        
        isLoading = false
    }
}

struct TripTypeButton: View {
    let type: TripType
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            ChravelHaptics.selection()
            action()
        }) {
            VStack(spacing: ChravelSpacing.xs) {
                Image(systemName: iconForType)
                    .font(.system(size: 24))
                
                Text(type.displayName)
                    .font(ChravelTypography.labelSmall)
            }
            .foregroundColor(isSelected ? .white : .textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, ChravelSpacing.sm)
            .background(isSelected ? Color.chravelOrange : Color.glassWhite)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: ChravelRadius.md)
                    .stroke(isSelected ? Color.clear : Color.glassBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    private var iconForType: String {
        switch type {
        case .consumer: return "airplane"
        case .pro: return "briefcase.fill"
        case .event: return "calendar.badge.plus"
        }
    }
}

struct DateRangePicker: View {
    @Binding var startDate: Date?
    @Binding var endDate: Date?
    
    @State private var showStartPicker = false
    @State private var showEndPicker = false
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            DateButton(
                label: "Start",
                date: startDate
            ) {
                showStartPicker = true
            }
            
            Image(systemName: "arrow.right")
                .foregroundColor(.textMuted)
            
            DateButton(
                label: "End",
                date: endDate
            ) {
                showEndPicker = true
            }
        }
        .sheet(isPresented: $showStartPicker) {
            DatePickerSheet(
                title: "Start Date",
                date: Binding(
                    get: { startDate ?? Date() },
                    set: { startDate = $0 }
                ),
                minimumDate: Date()
            )
            .presentationDetents([.height(400)])
        }
        .sheet(isPresented: $showEndPicker) {
            DatePickerSheet(
                title: "End Date",
                date: Binding(
                    get: { endDate ?? (startDate ?? Date()) },
                    set: { endDate = $0 }
                ),
                minimumDate: startDate ?? Date()
            )
            .presentationDetents([.height(400)])
        }
    }
}

struct DateButton: View {
    let label: String
    let date: Date?
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(ChravelTypography.captionSmall)
                    .foregroundColor(.textTertiary)
                
                Text(date?.formatted(date: .abbreviated, time: .omitted) ?? "Select")
                    .font(ChravelTypography.body)
                    .foregroundColor(date == nil ? .textMuted : .textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(ChravelSpacing.sm)
            .background(Color.glassWhite)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
        }
        .buttonStyle(.plain)
    }
}

struct DatePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    let title: String
    @Binding var date: Date
    var minimumDate: Date = Date()
    
    var body: some View {
        NavigationStack {
            VStack {
                DatePicker(
                    "",
                    selection: $date,
                    in: minimumDate...,
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .tint(.chravelOrange)
                .padding()
                
                Spacer()
            }
            .background(Color.chravelBlack)
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .foregroundColor(.chravelOrange)
                }
            }
        }
    }
}

// MARK: - Settings Sheet (Placeholder)

struct SettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Text("Settings")
                .navigationTitle("Settings")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
        }
    }
}

// MARK: - Upgrade Sheet (Placeholder)

struct UpgradeSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Text("Upgrade to Pro")
                .navigationTitle("Upgrade")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        HomeView()
    }
    .environment(TripsViewModel(authViewModel: AuthViewModel()))
    .environment(AuthViewModel())
    .environment(NavigationCoordinator())
    .preferredColorScheme(.dark)
}
