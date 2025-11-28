=== SCREEN: AIConciergeView START ===

// AIConciergeView.swift
// Chravel iOS - AI Concierge Chat Screen
// Generated from MSPEC

import SwiftUI

// MARK: - AI Concierge View

struct AIConciergeView: View {
    // MARK: - Parameters
    let tripId: String
    let tripName: String
    
    // MARK: - Environment
    @Environment(AuthViewModel.self) private var authViewModel
    
    // MARK: - State
    @State private var viewModel: AIConciergeViewModel
    @FocusState private var isInputFocused: Bool
    
    // MARK: - Init
    
    init(tripId: String, tripName: String) {
        self.tripId = tripId
        self.tripName = tripName
        _viewModel = State(wrappedValue: AIConciergeViewModel(tripId: tripId))
    }
    
    // MARK: - Body
    
    var body: some View {
        @Bindable var viewModel = viewModel
        
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: ChravelSpacing.md) {
                        // Welcome Message
                        AIWelcomeCard(tripName: tripName)
                            .id("welcome")
                        
                        // Suggested Prompts (only show when empty)
                        if viewModel.messages.isEmpty {
                            SuggestedPromptsSection(
                                prompts: viewModel.suggestedPrompts,
                                onPromptTap: { prompt in
                                    viewModel.userInput = prompt
                                    Task {
                                        await viewModel.sendMessage()
                                    }
                                }
                            )
                        }
                        
                        // Messages
                        ForEach(viewModel.messages) { message in
                            AIMessageView(message: message) { action in
                                Task {
                                    await viewModel.handleAction(action)
                                }
                            }
                            .id(message.id)
                        }
                        
                        // Typing Indicator
                        if viewModel.isTyping {
                            AITypingIndicator()
                                .id("typing")
                        }
                    }
                    .padding(ChravelSpacing.md)
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    scrollToBottom(proxy: proxy)
                }
                .onChange(of: viewModel.isTyping) { _, isTyping in
                    if isTyping {
                        scrollToBottom(proxy: proxy, to: "typing")
                    }
                }
            }
            
            // Input Bar
            AIInputBar(
                text: $viewModel.userInput,
                isFocused: $isInputFocused,
                isLoading: viewModel.isLoading,
                onSend: {
                    Task {
                        await viewModel.sendMessage()
                    }
                }
            )
        }
        .background(Color.chravelBlack)
        .navigationTitle("AI Concierge")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadContext()
        }
    }
    
    private func scrollToBottom(proxy: ScrollViewProxy, to id: String? = nil) {
        withAnimation(.easeOut(duration: 0.2)) {
            if let id {
                proxy.scrollTo(id, anchor: .bottom)
            } else if let lastMessage = viewModel.messages.last {
                proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }
}

// MARK: - AI Welcome Card

struct AIWelcomeCard: View {
    let tripName: String
    
    var body: some View {
        VStack(spacing: ChravelSpacing.md) {
            // AI Avatar
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.chravelOrange.opacity(0.8), .chravelYellow.opacity(0.6)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 72, height: 72)
                
                Image(systemName: "sparkles")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundColor(.white)
            }
            
            Text("AI Concierge")
                .font(ChravelTypography.headline)
                .foregroundColor(.textPrimary)
            
            Text("I'm your personal trip assistant for **\(tripName)**. I can help with:")
                .font(ChravelTypography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
            
            // Capabilities
            VStack(alignment: .leading, spacing: ChravelSpacing.sm) {
                AICapabilityRow(icon: "magnifyingglass", text: "Finding restaurants, activities & hotels")
                AICapabilityRow(icon: "calendar", text: "Creating itineraries & schedules")
                AICapabilityRow(icon: "dollarsign.circle", text: "Budget planning & expense splitting")
                AICapabilityRow(icon: "map", text: "Route optimization & travel tips")
                AICapabilityRow(icon: "doc.text", text: "Summarizing trip info & conversations")
            }
            .padding(.top, ChravelSpacing.xs)
        }
        .padding(ChravelSpacing.lg)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
    }
}

struct AICapabilityRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.chravelOrange)
                .frame(width: 24)
            
            Text(text)
                .font(ChravelTypography.caption)
                .foregroundColor(.textSecondary)
        }
    }
}

// MARK: - Suggested Prompts Section

struct SuggestedPromptsSection: View {
    let prompts: [String]
    let onPromptTap: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: ChravelSpacing.sm) {
            Text("Try asking:")
                .font(ChravelTypography.label)
                .foregroundColor(.textMuted)
            
            FlowLayout(spacing: ChravelSpacing.xs) {
                ForEach(prompts, id: \.self) { prompt in
                    Button {
                        ChravelHaptics.light()
                        onPromptTap(prompt)
                    } label: {
                        Text(prompt)
                            .font(ChravelTypography.caption)
                            .foregroundColor(.chravelOrange)
                            .padding(.horizontal, ChravelSpacing.sm)
                            .padding(.vertical, ChravelSpacing.xs)
                            .background(Color.chravelOrange.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(ChravelSpacing.md)
    }
}

// Simple Flow Layout for wrapping prompts
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), proposal: .unspecified)
        }
    }
    
    private func computeLayout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        var frames: [CGRect] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        let maxWidth = proposal.width ?? .infinity
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            
            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            
            frames.append(CGRect(x: currentX, y: currentY, width: size.width, height: size.height))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }
        
        return (CGSize(width: maxWidth, height: currentY + lineHeight), frames)
    }
}

// MARK: - AI Message View

struct AIMessageView: View {
    let message: AIMessage
    let onAction: (AIAction) -> Void
    
    var body: some View {
        HStack(alignment: .top, spacing: ChravelSpacing.sm) {
            if message.isUser {
                Spacer(minLength: 60)
            } else {
                // AI Avatar
                Image(systemName: "sparkles")
                    .font(.system(size: 14))
                    .foregroundColor(.chravelOrange)
                    .frame(width: 28, height: 28)
                    .background(Color.chravelOrange.opacity(0.2))
                    .clipShape(Circle())
            }
            
            VStack(alignment: message.isUser ? .trailing : .leading, spacing: ChravelSpacing.xs) {
                // Message Content
                Text(LocalizedStringKey(message.content))
                    .font(ChravelTypography.body)
                    .foregroundColor(message.isUser ? .white : .textPrimary)
                    .padding(ChravelSpacing.sm)
                    .background(
                        message.isUser ?
                            Color.chravelOrange :
                            Color.glassWhite
                    )
                    .clipShape(
                        RoundedRectangle(
                            cornerRadius: ChravelRadius.md,
                            style: .continuous
                        )
                    )
                
                // Actions (for AI messages)
                if !message.isUser, let actions = message.actions, !actions.isEmpty {
                    HStack(spacing: ChravelSpacing.sm) {
                        ForEach(actions, id: \.id) { action in
                            Button {
                                ChravelHaptics.light()
                                onAction(action)
                            } label: {
                                HStack(spacing: ChravelSpacing.xxs) {
                                    Image(systemName: action.icon)
                                        .font(.system(size: 12))
                                    Text(action.label)
                                        .font(ChravelTypography.captionSmall)
                                }
                                .foregroundColor(.chravelOrange)
                                .padding(.horizontal, ChravelSpacing.sm)
                                .padding(.vertical, ChravelSpacing.xs)
                                .background(Color.chravelOrange.opacity(0.1))
                                .clipShape(Capsule())
                            }
                        }
                    }
                }
                
                // Sources (for AI messages with citations)
                if !message.isUser, let sources = message.sources, !sources.isEmpty {
                    SourcesView(sources: sources)
                }
                
                // Timestamp
                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(ChravelTypography.captionSmall)
                    .foregroundColor(.textMuted)
            }
            
            if !message.isUser {
                Spacer(minLength: 60)
            }
        }
    }
}

struct SourcesView: View {
    let sources: [AISource]
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: ChravelSpacing.xxs) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 12))
                    Text("\(sources.count) source\(sources.count == 1 ? "" : "s")")
                        .font(ChravelTypography.captionSmall)
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10))
                }
                .foregroundColor(.textMuted)
            }
            
            if isExpanded {
                ForEach(sources, id: \.id) { source in
                    HStack(spacing: ChravelSpacing.xs) {
                        Image(systemName: source.icon)
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                        
                        Text(source.title)
                            .font(ChravelTypography.captionSmall)
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .padding(.top, ChravelSpacing.xs)
    }
}

// MARK: - AI Typing Indicator

struct AITypingIndicator: View {
    @State private var dotIndex = 0
    
    let timer = Timer.publish(every: 0.4, on: .main, in: .common).autoconnect()
    
    var body: some View {
        HStack(alignment: .top, spacing: ChravelSpacing.sm) {
            // AI Avatar
            Image(systemName: "sparkles")
                .font(.system(size: 14))
                .foregroundColor(.chravelOrange)
                .frame(width: 28, height: 28)
                .background(Color.chravelOrange.opacity(0.2))
                .clipShape(Circle())
            
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Color.textMuted)
                        .frame(width: 8, height: 8)
                        .opacity(dotIndex == index ? 1 : 0.4)
                }
            }
            .padding(ChravelSpacing.sm)
            .background(Color.glassWhite)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
            
            Spacer()
        }
        .onReceive(timer) { _ in
            dotIndex = (dotIndex + 1) % 3
        }
    }
}

// MARK: - AI Input Bar

struct AIInputBar: View {
    @Binding var text: String
    var isFocused: FocusState<Bool>.Binding
    let isLoading: Bool
    let onSend: () -> Void
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            // Text Input
            TextField("Ask me anything...", text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .font(ChravelTypography.body)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, ChravelSpacing.md)
                .padding(.vertical, ChravelSpacing.sm)
                .background(Color.chravelDarkGray)
                .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
                .focused(isFocused)
                .lineLimit(1...4)
                .onSubmit {
                    if !text.isEmpty {
                        onSend()
                    }
                }
            
            // Send Button
            Button {
                ChravelHaptics.medium()
                onSend()
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
                .foregroundColor(.white)
                .frame(width: 40, height: 40)
                .background(
                    text.isEmpty && !isLoading ?
                        Color.textMuted :
                        Color.chravelOrange
                )
                .clipShape(Circle())
            }
            .disabled(text.isEmpty || isLoading)
        }
        .padding(.horizontal, ChravelSpacing.md)
        .padding(.vertical, ChravelSpacing.sm)
        .background(Color.chravelBlack)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AIConciergeView(tripId: "preview", tripName: "Tokyo Adventure")
    }
    .environment(AuthViewModel())
    .preferredColorScheme(.dark)
}

=== SCREEN: AIConciergeView END ===
