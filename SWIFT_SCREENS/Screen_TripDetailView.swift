// TripDetailView.swift
// Chravel iOS - Trip Detail Screen with Tabbed Navigation
// Generated from MSPEC

import SwiftUI

// MARK: - Trip Tab

enum TripTab: String, CaseIterable, Identifiable {
    case chat = "Chat"
    case media = "Media"
    case pay = "Pay"
    case calendar = "Calendar"
    case ai = "AI"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .chat: return "message.fill"
        case .media: return "photo.fill"
        case .pay: return "creditcard.fill"
        case .calendar: return "calendar"
        case .ai: return "sparkles"
        }
    }
}

// MARK: - Trip Detail View

struct TripDetailView: View {
    // MARK: - Parameters
    let tripId: String
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(NavigationCoordinator.self) private var coordinator
    
    // MARK: - State
    @State private var viewModel: TripDetailViewModel
    @State private var selectedTab: TripTab = .chat
    @State private var showTripSettings = false
    @State private var showInviteSheet = false
    @State private var showPlaceSearch = false
    
    // MARK: - Init
    
    init(tripId: String) {
        self.tripId = tripId
        _viewModel = State(wrappedValue: TripDetailViewModel(tripId: tripId))
    }
    
    // MARK: - Body
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Background
            Color.chravelBlack
                .ignoresSafeArea()
            
            // Main Content
            VStack(spacing: 0) {
                // Trip Header
                TripDetailHeader(
                    trip: viewModel.trip,
                    memberCount: viewModel.members.count,
                    onSettingsTap: { showTripSettings = true },
                    onInviteTap: { showInviteSheet = true },
                    onMapTap: { showPlaceSearch = true }
                )
                
                // Tab Content
                TabView(selection: $selectedTab) {
                    ChatTabView(viewModel: viewModel.chatViewModel)
                        .tag(TripTab.chat)
                    
                    MediaTabView(tripId: tripId)
                        .tag(TripTab.media)
                    
                    PaymentsTabView(tripId: tripId)
                        .tag(TripTab.pay)
                    
                    CalendarTabView(tripId: tripId)
                        .tag(TripTab.calendar)
                    
                    AITabView(tripId: tripId)
                        .tag(TripTab.ai)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .ignoresSafeArea(.keyboard)
                
                // Custom Tab Bar
                TripTabBar(selectedTab: $selectedTab)
            }
            
            // Loading Overlay
            if viewModel.isLoading {
                LoadingOverlay(message: "Loading trip...")
            }
        }
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: ChravelSpacing.xxs) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                        Text("Back")
                    }
                    .foregroundColor(.chravelOrange)
                }
            }
        }
        .sheet(isPresented: $showTripSettings) {
            TripSettingsSheet(
                trip: viewModel.trip,
                onUpdate: { updatedTrip in
                    viewModel.trip = updatedTrip
                }
            )
        }
        .sheet(isPresented: $showInviteSheet) {
            InviteSheet(tripId: tripId)
        }
        .sheet(isPresented: $showPlaceSearch) {
            PlaceSearchSheet(
                tripId: tripId,
                onPlaceSelected: { place in
                    viewModel.addPlace(place)
                }
            )
        }
        .task {
            await viewModel.loadTrip()
        }
        .onAppear {
            ChravelHaptics.light()
        }
    }
}

// MARK: - Trip Detail Header

struct TripDetailHeader: View {
    let trip: Trip?
    let memberCount: Int
    let onSettingsTap: () -> Void
    let onInviteTap: () -> Void
    let onMapTap: () -> Void
    
    @State private var showFullImage = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Cover Image
            if let imageUrl = trip?.coverImageUrl {
                AsyncImage(url: URL(string: imageUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        placeholderView
                    case .empty:
                        placeholderView
                            .overlay(ProgressView().tint(.white))
                    @unknown default:
                        placeholderView
                    }
                }
                .frame(height: 180)
                .clipped()
                .onTapGesture {
                    showFullImage = true
                }
            } else {
                placeholderView
                    .frame(height: 180)
            }
            
            // Gradient Overlay
            LinearGradient(
                colors: [.clear, .chravelBlack.opacity(0.8), .chravelBlack],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 100)
            
            // Info Overlay
            VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(trip?.name ?? "Loading...")
                            .font(ChravelTypography.title2)
                            .foregroundColor(.textPrimary)
                        
                        if let destination = trip?.destination {
                            HStack(spacing: ChravelSpacing.xxs) {
                                Image(systemName: "mappin")
                                    .font(.system(size: 12))
                                Text(destination)
                            }
                            .font(ChravelTypography.caption)
                            .foregroundColor(.textSecondary)
                        }
                    }
                    
                    Spacer()
                    
                    HStack(spacing: ChravelSpacing.sm) {
                        Button(action: onMapTap) {
                            Image(systemName: "map")
                                .font(.system(size: 18))
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Color.glassWhite)
                                .clipShape(Circle())
                        }
                        
                        Button(action: onInviteTap) {
                            Image(systemName: "person.badge.plus")
                                .font(.system(size: 18))
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Color.glassWhite)
                                .clipShape(Circle())
                        }
                        
                        Button(action: onSettingsTap) {
                            Image(systemName: "gearshape")
                                .font(.system(size: 18))
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Color.glassWhite)
                                .clipShape(Circle())
                        }
                    }
                }
                
                // Date and Members
                HStack(spacing: ChravelSpacing.md) {
                    if let startDate = trip?.startDate {
                        HStack(spacing: ChravelSpacing.xxs) {
                            Image(systemName: "calendar")
                                .font(.system(size: 12))
                            Text(formatDateRange(start: startDate, end: trip?.endDate))
                        }
                        .font(ChravelTypography.caption)
                        .foregroundColor(.textTertiary)
                    }
                    
                    HStack(spacing: ChravelSpacing.xxs) {
                        Image(systemName: "person.2")
                            .font(.system(size: 12))
                        Text("\(memberCount) members")
                    }
                    .font(ChravelTypography.caption)
                    .foregroundColor(.textTertiary)
                }
            }
            .padding(ChravelSpacing.md)
        }
        .fullScreenCover(isPresented: $showFullImage) {
            if let imageUrl = trip?.coverImageUrl {
                FullScreenImageViewer(imageUrl: imageUrl)
            }
        }
    }
    
    private var placeholderView: some View {
        LinearGradient(
            colors: [.chravelOrange.opacity(0.3), .chravelBlack],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: "airplane")
                .font(.system(size: 48))
                .foregroundColor(.white.opacity(0.2))
        )
    }
    
    private func formatDateRange(start: Date, end: Date?) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        
        let startStr = formatter.string(from: start)
        
        if let end = end {
            let endStr = formatter.string(from: end)
            return "\(startStr) - \(endStr)"
        }
        
        return startStr
    }
}

// MARK: - Trip Tab Bar

struct TripTabBar: View {
    @Binding var selectedTab: TripTab
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(TripTab.allCases) { tab in
                TripTabButton(
                    tab: tab,
                    isSelected: selectedTab == tab
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedTab = tab
                    }
                    ChravelHaptics.selection()
                }
            }
        }
        .padding(.horizontal, ChravelSpacing.sm)
        .padding(.vertical, ChravelSpacing.xs)
        .background(
            Rectangle()
                .fill(Color.chravelDarkGray)
                .shadow(color: .black.opacity(0.3), radius: 10, y: -5)
        )
    }
}

struct TripTabButton: View {
    let tab: TripTab
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: tab.icon)
                    .font(.system(size: 20, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .chravelOrange : .textMuted)
                
                Text(tab.rawValue)
                    .font(ChravelTypography.captionSmall)
                    .foregroundColor(isSelected ? .chravelOrange : .textMuted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, ChravelSpacing.xs)
            .background(
                isSelected ?
                    Color.chravelOrange.opacity(0.1) :
                    Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Chat Tab View

struct ChatTabView: View {
    @Bindable var viewModel: ChatViewModel
    @FocusState private var isMessageFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Messages List
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: ChravelSpacing.sm) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(
                                message: message,
                                isCurrentUser: viewModel.isCurrentUser(message)
                            )
                            .id(message.id)
                        }
                    }
                    .padding(ChravelSpacing.md)
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    if let lastMessage = viewModel.messages.last {
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
            
            // Message Composer
            MessageComposer(
                text: $viewModel.draftMessage,
                isFocused: $isMessageFocused,
                onSend: {
                    Task {
                        await viewModel.sendMessage()
                    }
                },
                onAttachment: {
                    viewModel.showAttachmentPicker = true
                }
            )
        }
        .sheet(isPresented: $viewModel.showAttachmentPicker) {
            AttachmentPickerSheet(
                onImageSelected: { image in
                    Task {
                        await viewModel.sendImageMessage(image)
                    }
                }
            )
        }
        .task {
            await viewModel.loadMessages()
            viewModel.subscribeToMessages()
        }
    }
}

// MARK: - Message Composer

struct MessageComposer: View {
    @Binding var text: String
    var isFocused: FocusState<Bool>.Binding
    let onSend: () -> Void
    let onAttachment: () -> Void
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            // Attachment Button
            Button(action: onAttachment) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.textMuted)
            }
            
            // Text Field
            TextField("Message...", text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .font(ChravelTypography.body)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, ChravelSpacing.sm)
                .padding(.vertical, ChravelSpacing.xs)
                .background(Color.chravelDarkGray)
                .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
                .focused(isFocused)
                .lineLimit(1...5)
            
            // Send Button
            Button {
                ChravelHaptics.light()
                onSend()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(text.isEmpty ? .textMuted : .chravelOrange)
            }
            .disabled(text.isEmpty)
        }
        .padding(.horizontal, ChravelSpacing.md)
        .padding(.vertical, ChravelSpacing.sm)
        .background(Color.chravelBlack)
    }
}

// MARK: - Media Tab View (Placeholder)

struct MediaTabView: View {
    let tripId: String
    
    var body: some View {
        EmptyStateView(
            icon: "photo.on.rectangle.angled",
            title: "No media yet",
            message: "Photos and videos shared in this trip will appear here.",
            actionTitle: "Upload Photo"
        ) {
            // Handle upload
        }
    }
}

// MARK: - Payments Tab View (Placeholder)

struct PaymentsTabView: View {
    let tripId: String
    
    var body: some View {
        EmptyStateView(
            icon: "creditcard",
            title: "No expenses yet",
            message: "Track shared expenses and split costs with your group.",
            actionTitle: "Add Expense"
        ) {
            // Handle add expense
        }
    }
}

// MARK: - Calendar Tab View (Placeholder)

struct CalendarTabView: View {
    let tripId: String
    
    var body: some View {
        EmptyStateView(
            icon: "calendar.badge.plus",
            title: "No events yet",
            message: "Add itinerary items and events to your trip calendar.",
            actionTitle: "Add Event"
        ) {
            // Handle add event
        }
    }
}

// MARK: - AI Tab View (Placeholder)

struct AITabView: View {
    let tripId: String
    
    var body: some View {
        VStack(spacing: ChravelSpacing.lg) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundColor(.chravelOrange)
            
            Text("AI Concierge")
                .font(ChravelTypography.headline)
                .foregroundColor(.textPrimary)
            
            Text("Ask me anything about your trip! I can help with recommendations, planning, and more.")
                .font(ChravelTypography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, ChravelSpacing.xl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Full Screen Image Viewer

struct FullScreenImageViewer: View {
    @Environment(\.dismiss) private var dismiss
    let imageUrl: String
    
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            AsyncImage(url: URL(string: imageUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .scaleEffect(scale)
                    .gesture(
                        MagnifyGesture()
                            .onChanged { value in
                                scale = lastScale * value.magnification
                            }
                            .onEnded { _ in
                                lastScale = scale
                            }
                    )
            } placeholder: {
                ProgressView()
                    .tint(.white)
            }
            
            VStack {
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                    .padding()
                }
                Spacer()
            }
        }
    }
}

// MARK: - Trip Settings Sheet (Placeholder)

struct TripSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    let trip: Trip?
    let onUpdate: (Trip) -> Void
    
    var body: some View {
        NavigationStack {
            Text("Trip Settings")
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

// MARK: - Invite Sheet (Placeholder)

struct InviteSheet: View {
    @Environment(\.dismiss) private var dismiss
    let tripId: String
    
    var body: some View {
        NavigationStack {
            Text("Invite Members")
                .navigationTitle("Invite")
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

// MARK: - Place Search Sheet (Placeholder)

struct PlaceSearchSheet: View {
    @Environment(\.dismiss) private var dismiss
    let tripId: String
    let onPlaceSelected: (PlaceData) -> Void
    
    var body: some View {
        NavigationStack {
            Text("Search Places")
                .navigationTitle("Places")
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

// MARK: - Attachment Picker Sheet (Placeholder)

struct AttachmentPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onImageSelected: (UIImage) -> Void
    
    var body: some View {
        NavigationStack {
            Text("Select Attachment")
                .navigationTitle("Attach")
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
        TripDetailView(tripId: "preview-trip-id")
    }
    .environment(AuthViewModel())
    .environment(NavigationCoordinator())
    .preferredColorScheme(.dark)
}
