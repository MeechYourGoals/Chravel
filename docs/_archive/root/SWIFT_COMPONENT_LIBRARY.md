=== SWIFT-COMPONENT-LIBRARY START ===

# CHRAVEL iOS COMPONENT LIBRARY
## Reusable SwiftUI Component System

**Version:** 1.0  
**Platform:** iOS 17.0+  
**Framework:** SwiftUI  

---

## 1. ATOMIC COMPONENTS

### 1.1 Design Tokens

```swift
import SwiftUI

// MARK: - Color Palette

extension Color {
    // Primary Brand Colors
    static let chravelOrange = Color(hex: "#FF6B35")
    static let chravelYellow = Color(hex: "#F7C948")
    static let chravelGold = Color(hex: "#D4A574")
    
    // Background Colors
    static let chravelBlack = Color(hex: "#0A0A0A")
    static let chravelDarkGray = Color(hex: "#1A1A1A")
    static let chravelGray = Color(hex: "#2A2A2A")
    static let chravelLightGray = Color(hex: "#3A3A3A")
    
    // Glass Effect Colors
    static let glassWhite = Color.white.opacity(0.1)
    static let glassBorder = Color.white.opacity(0.15)
    static let glassOrange = Color(hex: "#FF6B35").opacity(0.2)
    
    // Semantic Colors
    static let success = Color(hex: "#10B981")
    static let warning = Color(hex: "#F59E0B")
    static let error = Color(hex: "#EF4444")
    static let info = Color(hex: "#3B82F6")
    
    // Text Colors
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.7)
    static let textTertiary = Color.white.opacity(0.5)
    static let textMuted = Color.white.opacity(0.3)
    
    // Hex Initializer
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Typography Scale

struct ChravelTypography {
    // Display
    static let displayLarge = Font.system(size: 34, weight: .bold, design: .rounded)
    static let displayMedium = Font.system(size: 28, weight: .bold, design: .rounded)
    static let displaySmall = Font.system(size: 24, weight: .bold, design: .rounded)
    
    // Headlines
    static let headline = Font.system(size: 20, weight: .semibold, design: .rounded)
    static let subheadline = Font.system(size: 17, weight: .medium, design: .rounded)
    
    // Body
    static let bodyLarge = Font.system(size: 17, weight: .regular)
    static let body = Font.system(size: 15, weight: .regular)
    static let bodySmall = Font.system(size: 13, weight: .regular)
    
    // Labels
    static let labelLarge = Font.system(size: 14, weight: .semibold)
    static let label = Font.system(size: 12, weight: .medium)
    static let labelSmall = Font.system(size: 11, weight: .medium)
    
    // Caption
    static let caption = Font.system(size: 12, weight: .regular)
    static let captionSmall = Font.system(size: 10, weight: .regular)
    
    // Mono
    static let mono = Font.system(size: 13, weight: .regular, design: .monospaced)
}

// MARK: - Spacing Scale

struct ChravelSpacing {
    static let xxxs: CGFloat = 2
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
    static let xxxl: CGFloat = 64
}

// MARK: - Corner Radius

struct ChravelRadius {
    static let none: CGFloat = 0
    static let sm: CGFloat = 6
    static let md: CGFloat = 10
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let full: CGFloat = 9999
}

// MARK: - Shadows

struct ChravelShadow {
    static let none = Shadow(color: .clear, radius: 0, x: 0, y: 0)
    static let sm = Shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    static let md = Shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
    static let lg = Shadow(color: .black.opacity(0.2), radius: 16, x: 0, y: 8)
    static let xl = Shadow(color: .black.opacity(0.25), radius: 24, x: 0, y: 12)
    
    struct Shadow {
        let color: Color
        let radius: CGFloat
        let x: CGFloat
        let y: CGFloat
    }
}

// MARK: - Animation Durations

struct ChravelAnimation {
    static let instant: Double = 0.1
    static let fast: Double = 0.2
    static let normal: Double = 0.3
    static let slow: Double = 0.5
    
    static let spring = Animation.spring(response: 0.3, dampingFraction: 0.7)
    static let springBouncy = Animation.spring(response: 0.4, dampingFraction: 0.6)
    static let easeOut = Animation.easeOut(duration: normal)
}
```

### 1.2 Haptics

```swift
import UIKit

enum ChravelHaptics {
    static func light() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
    
    static func medium() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }
    
    static func heavy() {
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()
    }
    
    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
    
    static func warning() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.warning)
    }
    
    static func error() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.error)
    }
    
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
}
```

---

## 2. MOLECULE COMPONENTS

### 2.1 Buttons

```swift
import SwiftUI

// MARK: - Primary Button

struct ChravelButton: View {
    let title: String
    var icon: String?
    var style: ButtonStyle = .primary
    var size: ButtonSize = .medium
    var isLoading: Bool = false
    var isDisabled: Bool = false
    let action: () -> Void
    
    enum ButtonStyle {
        case primary, secondary, ghost, destructive
        
        var backgroundColor: Color {
            switch self {
            case .primary: return .chravelOrange
            case .secondary: return .glassWhite
            case .ghost: return .clear
            case .destructive: return .error
            }
        }
        
        var foregroundColor: Color {
            switch self {
            case .primary, .destructive: return .white
            case .secondary, .ghost: return .textPrimary
            }
        }
        
        var borderColor: Color {
            switch self {
            case .secondary: return .glassBorder
            case .ghost: return .clear
            default: return .clear
            }
        }
    }
    
    enum ButtonSize {
        case small, medium, large
        
        var height: CGFloat {
            switch self {
            case .small: return 36
            case .medium: return 44
            case .large: return 52
            }
        }
        
        var font: Font {
            switch self {
            case .small: return ChravelTypography.labelSmall
            case .medium: return ChravelTypography.labelLarge
            case .large: return ChravelTypography.body
            }
        }
        
        var padding: CGFloat {
            switch self {
            case .small: return ChravelSpacing.sm
            case .medium: return ChravelSpacing.md
            case .large: return ChravelSpacing.lg
            }
        }
    }
    
    var body: some View {
        Button(action: {
            ChravelHaptics.light()
            action()
        }) {
            HStack(spacing: ChravelSpacing.xs) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: style.foregroundColor))
                        .scaleEffect(0.8)
                } else {
                    if let icon = icon {
                        Image(systemName: icon)
                            .font(size.font)
                    }
                    
                    Text(title)
                        .font(size.font)
                        .fontWeight(.semibold)
                }
            }
            .foregroundColor(style.foregroundColor)
            .frame(height: size.height)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, size.padding)
            .background(style.backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: ChravelRadius.lg)
                    .stroke(style.borderColor, lineWidth: 1)
            )
        }
        .disabled(isLoading || isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }
}

// MARK: - Icon Button

struct ChravelIconButton: View {
    let icon: String
    var size: CGFloat = 44
    var backgroundColor: Color = .glassWhite
    var foregroundColor: Color = .textPrimary
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            ChravelHaptics.light()
            action()
        }) {
            Image(systemName: icon)
                .font(.system(size: size * 0.45, weight: .medium))
                .foregroundColor(foregroundColor)
                .frame(width: size, height: size)
                .background(backgroundColor)
                .clipShape(Circle())
        }
    }
}

// MARK: - Floating Action Button

struct ChravelFAB: View {
    let icon: String
    var backgroundColor: Color = .chravelOrange
    var size: CGFloat = 56
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            ChravelHaptics.medium()
            action()
        }) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: size, height: size)
                .background(backgroundColor)
                .clipShape(Circle())
                .shadow(color: backgroundColor.opacity(0.4), radius: 12, x: 0, y: 6)
        }
    }
}
```

### 2.2 Inputs

```swift
import SwiftUI

// MARK: - Text Input

struct ChravelTextField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String?
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    var errorMessage: String?
    var onSubmit: (() -> Void)?
    
    @FocusState private var isFocused: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: ChravelSpacing.xxs) {
            HStack(spacing: ChravelSpacing.sm) {
                if let icon = icon {
                    Image(systemName: icon)
                        .foregroundColor(isFocused ? .chravelOrange : .textTertiary)
                        .frame(width: 20)
                }
                
                Group {
                    if isSecure {
                        SecureField(placeholder, text: $text)
                    } else {
                        TextField(placeholder, text: $text)
                            .keyboardType(keyboardType)
                            .textInputAutocapitalization(autocapitalization)
                    }
                }
                .foregroundColor(.textPrimary)
                .font(ChravelTypography.body)
                .focused($isFocused)
                .onSubmit {
                    onSubmit?()
                }
                
                if !text.isEmpty {
                    Button {
                        text = ""
                        ChravelHaptics.light()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.textTertiary)
                    }
                }
            }
            .padding(.horizontal, ChravelSpacing.md)
            .frame(height: 52)
            .background(Color.glassWhite)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: ChravelRadius.lg)
                    .stroke(
                        errorMessage != nil ? Color.error :
                            (isFocused ? Color.chravelOrange : Color.glassBorder),
                        lineWidth: 1
                    )
            )
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(ChravelTypography.caption)
                    .foregroundColor(.error)
                    .padding(.leading, ChravelSpacing.xs)
            }
        }
    }
}

// MARK: - Text Area

struct ChravelTextArea: View {
    let placeholder: String
    @Binding var text: String
    var minHeight: CGFloat = 100
    var maxHeight: CGFloat = 200
    
    @FocusState private var isFocused: Bool
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(ChravelTypography.body)
                    .foregroundColor(.textTertiary)
                    .padding(.horizontal, ChravelSpacing.md)
                    .padding(.vertical, ChravelSpacing.sm)
            }
            
            TextEditor(text: $text)
                .font(ChravelTypography.body)
                .foregroundColor(.textPrimary)
                .scrollContentBackground(.hidden)
                .focused($isFocused)
                .padding(.horizontal, ChravelSpacing.xs)
                .padding(.vertical, ChravelSpacing.xxs)
        }
        .frame(minHeight: minHeight, maxHeight: maxHeight)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: ChravelRadius.lg)
                .stroke(isFocused ? Color.chravelOrange : Color.glassBorder, lineWidth: 1)
        )
    }
}

// MARK: - Search Bar

struct ChravelSearchBar: View {
    @Binding var text: String
    var placeholder: String = "Search..."
    var onSubmit: (() -> Void)?
    
    @FocusState private var isFocused: Bool
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.textTertiary)
            
            TextField(placeholder, text: $text)
                .font(ChravelTypography.body)
                .foregroundColor(.textPrimary)
                .focused($isFocused)
                .onSubmit {
                    onSubmit?()
                }
            
            if !text.isEmpty {
                Button {
                    text = ""
                    ChravelHaptics.light()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(.horizontal, ChravelSpacing.md)
        .frame(height: 44)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.full))
    }
}
```

### 2.3 Avatars

```swift
import SwiftUI

// MARK: - Avatar

struct ChravelAvatar: View {
    let url: URL?
    var fallback: String = "?"
    var size: AvatarSize = .medium
    var showBorder: Bool = false
    var isOnline: Bool = false
    
    enum AvatarSize {
        case small, medium, large, xlarge
        
        var dimension: CGFloat {
            switch self {
            case .small: return 32
            case .medium: return 40
            case .large: return 56
            case .xlarge: return 80
            }
        }
        
        var font: Font {
            switch self {
            case .small: return .system(size: 12, weight: .semibold)
            case .medium: return .system(size: 16, weight: .semibold)
            case .large: return .system(size: 22, weight: .semibold)
            case .xlarge: return .system(size: 30, weight: .semibold)
            }
        }
    }
    
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Group {
                if let url = url {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        fallbackView
                    }
                } else {
                    fallbackView
                }
            }
            .frame(width: size.dimension, height: size.dimension)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .stroke(showBorder ? Color.chravelOrange : Color.clear, lineWidth: 2)
            )
            
            if isOnline {
                Circle()
                    .fill(Color.success)
                    .frame(width: size.dimension * 0.25, height: size.dimension * 0.25)
                    .overlay(
                        Circle()
                            .stroke(Color.chravelBlack, lineWidth: 2)
                    )
                    .offset(x: 2, y: 2)
            }
        }
    }
    
    private var fallbackView: some View {
        Circle()
            .fill(LinearGradient(
                colors: [.chravelOrange, .chravelYellow],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ))
            .overlay(
                Text(fallback.prefix(2).uppercased())
                    .font(size.font)
                    .foregroundColor(.white)
            )
    }
}

// MARK: - Avatar Stack

struct ChravelAvatarStack: View {
    let avatars: [AvatarData]
    var maxVisible: Int = 4
    var size: ChravelAvatar.AvatarSize = .small
    var overlap: CGFloat = 8
    
    struct AvatarData: Identifiable {
        let id = UUID()
        let url: URL?
        let fallback: String
    }
    
    var body: some View {
        HStack(spacing: -overlap) {
            ForEach(avatars.prefix(maxVisible)) { avatar in
                ChravelAvatar(url: avatar.url, fallback: avatar.fallback, size: size)
                    .overlay(
                        Circle()
                            .stroke(Color.chravelBlack, lineWidth: 2)
                    )
            }
            
            if avatars.count > maxVisible {
                Circle()
                    .fill(Color.chravelGray)
                    .frame(width: size.dimension, height: size.dimension)
                    .overlay(
                        Text("+\(avatars.count - maxVisible)")
                            .font(size.font)
                            .foregroundColor(.textPrimary)
                    )
                    .overlay(
                        Circle()
                            .stroke(Color.chravelBlack, lineWidth: 2)
                    )
            }
        }
    }
}
```

### 2.4 Tags & Badges

```swift
import SwiftUI

// MARK: - Badge

struct ChravelBadge: View {
    let text: String
    var style: BadgeStyle = .default
    var size: BadgeSize = .medium
    
    enum BadgeStyle {
        case `default`, primary, success, warning, error, info
        
        var backgroundColor: Color {
            switch self {
            case .default: return .glassWhite
            case .primary: return .chravelOrange.opacity(0.2)
            case .success: return .success.opacity(0.2)
            case .warning: return .warning.opacity(0.2)
            case .error: return .error.opacity(0.2)
            case .info: return .info.opacity(0.2)
            }
        }
        
        var foregroundColor: Color {
            switch self {
            case .default: return .textPrimary
            case .primary: return .chravelOrange
            case .success: return .success
            case .warning: return .warning
            case .error: return .error
            case .info: return .info
            }
        }
    }
    
    enum BadgeSize {
        case small, medium
        
        var font: Font {
            switch self {
            case .small: return ChravelTypography.labelSmall
            case .medium: return ChravelTypography.label
            }
        }
        
        var padding: EdgeInsets {
            switch self {
            case .small: return EdgeInsets(top: 2, leading: 6, bottom: 2, trailing: 6)
            case .medium: return EdgeInsets(top: 4, leading: 10, bottom: 4, trailing: 10)
            }
        }
    }
    
    var body: some View {
        Text(text)
            .font(size.font)
            .foregroundColor(style.foregroundColor)
            .padding(size.padding)
            .background(style.backgroundColor)
            .clipShape(Capsule())
    }
}

// MARK: - Tag Pill

struct ChravelTagPill: View {
    let text: String
    var icon: String?
    var isSelected: Bool = false
    var onTap: (() -> Void)?
    
    var body: some View {
        Button {
            ChravelHaptics.selection()
            onTap?()
        } label: {
            HStack(spacing: ChravelSpacing.xxs) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 12))
                }
                
                Text(text)
                    .font(ChravelTypography.label)
            }
            .foregroundColor(isSelected ? .white : .textPrimary)
            .padding(.horizontal, ChravelSpacing.sm)
            .padding(.vertical, ChravelSpacing.xs)
            .background(isSelected ? Color.chravelOrange : Color.glassWhite)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : Color.glassBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Notification Badge

struct NotificationBadge: View {
    let count: Int
    var maxCount: Int = 99
    
    var displayText: String {
        count > maxCount ? "\(maxCount)+" : "\(count)"
    }
    
    var body: some View {
        if count > 0 {
            Text(displayText)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, count > 9 ? 6 : 4)
                .padding(.vertical, 2)
                .background(Color.error)
                .clipShape(Capsule())
                .fixedSize()
        }
    }
}
```

### 2.5 Message Components

```swift
import SwiftUI

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let isOwnMessage: Bool
    var onReply: (() -> Void)?
    var onEdit: (() -> Void)?
    var onDelete: (() -> Void)?
    
    @State private var showActions = false
    
    var body: some View {
        HStack(alignment: .bottom, spacing: ChravelSpacing.xs) {
            if isOwnMessage { Spacer(minLength: 60) }
            
            if !isOwnMessage {
                ChravelAvatar(
                    url: nil,
                    fallback: String(message.authorName?.prefix(1) ?? "?"),
                    size: .small
                )
            }
            
            VStack(alignment: isOwnMessage ? .trailing : .leading, spacing: ChravelSpacing.xxs) {
                if !isOwnMessage, let authorName = message.authorName {
                    Text(authorName)
                        .font(ChravelTypography.caption)
                        .foregroundColor(.textTertiary)
                }
                
                // Reply preview if exists
                if let replyToId = message.replyToId {
                    ReplyIndicator(replyToId: replyToId)
                }
                
                // Message content
                VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                    if message.isDeleted {
                        Text(message.content)
                            .font(ChravelTypography.body)
                            .foregroundColor(.textMuted)
                            .italic()
                    } else {
                        Text(message.content)
                            .font(ChravelTypography.body)
                            .foregroundColor(isOwnMessage ? .white : .textPrimary)
                    }
                    
                    // Attachments
                    if !message.attachments.isEmpty {
                        AttachmentGrid(attachments: message.attachments)
                    }
                    
                    // Link preview
                    if let linkPreview = message.linkPreview {
                        LinkPreviewCard(preview: linkPreview)
                    }
                }
                .padding(.horizontal, ChravelSpacing.sm)
                .padding(.vertical, ChravelSpacing.xs)
                .background(isOwnMessage ? Color.chravelOrange : Color.glassWhite)
                .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
                
                // Timestamp & status
                HStack(spacing: ChravelSpacing.xxs) {
                    Text(message.createdAt.formatted(date: .omitted, time: .shortened))
                        .font(ChravelTypography.captionSmall)
                        .foregroundColor(.textMuted)
                    
                    if message.isEdited {
                        Text("(edited)")
                            .font(ChravelTypography.captionSmall)
                            .foregroundColor(.textMuted)
                    }
                }
            }
            .onLongPressGesture {
                ChravelHaptics.medium()
                showActions = true
            }
            
            if !isOwnMessage { Spacer(minLength: 60) }
        }
        .confirmationDialog("Message Options", isPresented: $showActions) {
            Button("Reply") { onReply?() }
            if isOwnMessage && !message.isDeleted {
                Button("Edit") { onEdit?() }
                Button("Delete", role: .destructive) { onDelete?() }
            }
            Button("Cancel", role: .cancel) {}
        }
    }
}

// MARK: - Reply Indicator

struct ReplyIndicator: View {
    let replyToId: String
    
    var body: some View {
        HStack(spacing: ChravelSpacing.xs) {
            Rectangle()
                .fill(Color.chravelOrange)
                .frame(width: 2)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Replying to")
                    .font(ChravelTypography.captionSmall)
                    .foregroundColor(.textTertiary)
                
                Text("Original message preview...")
                    .font(ChravelTypography.caption)
                    .foregroundColor(.textSecondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, ChravelSpacing.xxs)
    }
}

// MARK: - Message Input Bar

struct MessageInputBar: View {
    @Binding var text: String
    var isEditing: Bool = false
    var isSending: Bool = false
    var onSend: () -> Void
    var onAttachment: () -> Void
    var onCancelEdit: (() -> Void)?
    
    @FocusState private var isFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            if isEditing {
                HStack {
                    Text("Editing message")
                        .font(ChravelTypography.caption)
                        .foregroundColor(.chravelOrange)
                    
                    Spacer()
                    
                    Button("Cancel") {
                        onCancelEdit?()
                    }
                    .font(ChravelTypography.caption)
                    .foregroundColor(.textTertiary)
                }
                .padding(.horizontal, ChravelSpacing.md)
                .padding(.vertical, ChravelSpacing.xs)
                .background(Color.chravelOrange.opacity(0.1))
            }
            
            HStack(spacing: ChravelSpacing.sm) {
                // Attachment button
                Button(action: onAttachment) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.textTertiary)
                }
                
                // Text input
                TextField("Message", text: $text, axis: .vertical)
                    .font(ChravelTypography.body)
                    .foregroundColor(.textPrimary)
                    .lineLimit(1...5)
                    .focused($isFocused)
                    .padding(.horizontal, ChravelSpacing.sm)
                    .padding(.vertical, ChravelSpacing.xs)
                    .background(Color.glassWhite)
                    .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.xl))
                
                // Send button
                Button(action: {
                    ChravelHaptics.light()
                    onSend()
                }) {
                    Group {
                        if isSending {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: isEditing ? "checkmark" : "arrow.up")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                        }
                    }
                    .frame(width: 36, height: 36)
                    .background(
                        text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? Color.textMuted : Color.chravelOrange
                    )
                    .clipShape(Circle())
                }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
            }
            .padding(.horizontal, ChravelSpacing.md)
            .padding(.vertical, ChravelSpacing.sm)
            .background(Color.chravelDarkGray)
        }
    }
}
```

---

## 3. ORGANISM COMPONENTS

### 3.1 Trip Card

```swift
import SwiftUI

struct TripCard: View {
    let trip: Trip
    var onTap: (() -> Void)?
    
    var body: some View {
        Button(action: { onTap?() }) {
            VStack(alignment: .leading, spacing: 0) {
                // Cover Image
                ZStack(alignment: .topTrailing) {
                    if let coverURL = trip.coverImageURL {
                        AsyncImage(url: coverURL) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            placeholderImage
                        }
                    } else {
                        placeholderImage
                    }
                    
                    // Type badge
                    if trip.tripType != .consumer {
                        ChravelBadge(
                            text: trip.tripType.displayName,
                            style: trip.tripType == .pro ? .primary : .info,
                            size: .small
                        )
                        .padding(ChravelSpacing.xs)
                    }
                }
                .frame(height: 120)
                .clipped()
                
                // Content
                VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                    Text(trip.name)
                        .font(ChravelTypography.subheadline)
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)
                    
                    if let destination = trip.destination {
                        HStack(spacing: ChravelSpacing.xxs) {
                            Image(systemName: "mappin")
                                .font(.system(size: 10))
                            Text(destination)
                                .font(ChravelTypography.caption)
                        }
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)
                    }
                    
                    if let startDate = trip.startDate {
                        HStack(spacing: ChravelSpacing.xxs) {
                            Image(systemName: "calendar")
                                .font(.system(size: 10))
                            Text(formatDateRange(start: startDate, end: trip.endDate))
                                .font(ChravelTypography.caption)
                        }
                        .foregroundColor(.textTertiary)
                    }
                }
                .padding(ChravelSpacing.sm)
            }
            .background(Color.chravelGray)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: ChravelRadius.lg)
                    .stroke(Color.glassBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    private var placeholderImage: some View {
        LinearGradient(
            colors: [.chravelOrange.opacity(0.3), .chravelYellow.opacity(0.3)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: "airplane")
                .font(.system(size: 30))
                .foregroundColor(.textMuted)
        )
    }
    
    private func formatDateRange(start: Date, end: Date?) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        
        if let end = end, !Calendar.current.isDate(start, inSameDayAs: end) {
            return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
        }
        return formatter.string(from: start)
    }
}
```

### 3.2 Payment Card

```swift
import SwiftUI

struct PaymentCard: View {
    let payment: PaymentSplit
    let currentUserId: String
    var onSettle: ((PaymentSplit) -> Void)?
    
    var isOwedToCurrentUser: Bool {
        payment.createdBy == currentUserId
    }
    
    var owedAmount: Decimal {
        payment.participants
            .first(where: { $0.userId == currentUserId })?
            .amount ?? 0
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: ChravelSpacing.sm) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: ChravelSpacing.xxs) {
                    Text(payment.description)
                        .font(ChravelTypography.subheadline)
                        .foregroundColor(.textPrimary)
                    
                    Text(payment.createdByName)
                        .font(ChravelTypography.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: ChravelSpacing.xxs) {
                    Text(formatCurrency(payment.amount, currency: payment.currency))
                        .font(ChravelTypography.headline)
                        .foregroundColor(.textPrimary)
                    
                    if let category = payment.category {
                        ChravelBadge(text: category.displayName, size: .small)
                    }
                }
            }
            
            // Participants
            HStack(spacing: ChravelSpacing.xs) {
                ChravelAvatarStack(
                    avatars: payment.participants.map {
                        ChravelAvatarStack.AvatarData(
                            url: $0.avatar,
                            fallback: String($0.name.prefix(1))
                        )
                    },
                    maxVisible: 5,
                    size: .small
                )
                
                Text("\(payment.participants.count) people")
                    .font(ChravelTypography.caption)
                    .foregroundColor(.textTertiary)
                
                Spacer()
            }
            
            // Status & Action
            if payment.isSettled {
                HStack(spacing: ChravelSpacing.xs) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.success)
                    Text("Settled")
                        .font(ChravelTypography.label)
                        .foregroundColor(.success)
                    
                    if let settledAt = payment.settledAt {
                        Text("• \(settledAt.formatted(date: .abbreviated, time: .omitted))")
                            .font(ChravelTypography.caption)
                            .foregroundColor(.textTertiary)
                    }
                }
            } else if !isOwedToCurrentUser && owedAmount > 0 {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("You owe")
                            .font(ChravelTypography.caption)
                            .foregroundColor(.textTertiary)
                        Text(formatCurrency(owedAmount, currency: payment.currency))
                            .font(ChravelTypography.labelLarge)
                            .foregroundColor(.warning)
                    }
                    
                    Spacer()
                    
                    ChravelButton(
                        title: "Settle",
                        style: .primary,
                        size: .small
                    ) {
                        onSettle?(payment)
                    }
                    .frame(width: 80)
                }
            }
        }
        .padding(ChravelSpacing.md)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: ChravelRadius.lg)
                .stroke(Color.glassBorder, lineWidth: 1)
        )
    }
    
    private func formatCurrency(_ amount: Decimal, currency: Currency) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.rawValue
        return formatter.string(from: amount as NSDecimalNumber) ?? "\(currency.symbol)\(amount)"
    }
}
```

### 3.3 Task Item

```swift
import SwiftUI

struct TaskItemView: View {
    let task: TripTask
    let currentUserId: String
    var onToggle: ((TripTask, Bool) -> Void)?
    var onTap: ((TripTask) -> Void)?
    
    var currentUserStatus: TaskStatus? {
        task.taskStatuses.first(where: { $0.userId == currentUserId })
    }
    
    var isCompletedByCurrentUser: Bool {
        currentUserStatus?.completed ?? false
    }
    
    var body: some View {
        Button {
            onTap?(task)
        } label: {
            HStack(spacing: ChravelSpacing.sm) {
                // Checkbox
                Button {
                    ChravelHaptics.medium()
                    onToggle?(task, !isCompletedByCurrentUser)
                } label: {
                    Image(systemName: isCompletedByCurrentUser ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 24))
                        .foregroundColor(isCompletedByCurrentUser ? .success : .textTertiary)
                }
                .buttonStyle(.plain)
                
                // Content
                VStack(alignment: .leading, spacing: ChravelSpacing.xxs) {
                    Text(task.title)
                        .font(ChravelTypography.body)
                        .foregroundColor(isCompletedByCurrentUser ? .textTertiary : .textPrimary)
                        .strikethrough(isCompletedByCurrentUser)
                    
                    HStack(spacing: ChravelSpacing.sm) {
                        // Due date
                        if let dueAt = task.dueAt {
                            HStack(spacing: ChravelSpacing.xxs) {
                                Image(systemName: "calendar")
                                    .font(.system(size: 10))
                                Text(dueAt.formatted(date: .abbreviated, time: .omitted))
                                    .font(ChravelTypography.caption)
                            }
                            .foregroundColor(dueAt < Date() ? .error : .textTertiary)
                        }
                        
                        // Completion status
                        if !task.taskStatuses.isEmpty {
                            HStack(spacing: ChravelSpacing.xxs) {
                                Image(systemName: "person.2")
                                    .font(.system(size: 10))
                                Text("\(task.completedCount)/\(task.taskStatuses.count)")
                                    .font(ChravelTypography.caption)
                            }
                            .foregroundColor(.textTertiary)
                        }
                    }
                }
                
                Spacer()
                
                // Poll indicator
                if task.isPoll {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.info)
                }
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(.textMuted)
            }
            .padding(ChravelSpacing.md)
            .background(Color.glassWhite)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
        }
        .buttonStyle(.plain)
    }
}
```

### 3.4 AI Message Components

```swift
import SwiftUI

struct AIMessageView: View {
    let message: AIMessage
    var onFeedback: ((AIMessage, AIQuery.AIFeedback) -> Void)?
    
    var body: some View {
        HStack(alignment: .top, spacing: ChravelSpacing.sm) {
            if message.role == .assistant {
                // AI Avatar
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            colors: [.chravelOrange, .chravelYellow],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                    
                    Image(systemName: "sparkles")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
                .frame(width: 32, height: 32)
            }
            
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: ChravelSpacing.xs) {
                // Message content
                Text(message.content)
                    .font(ChravelTypography.body)
                    .foregroundColor(.textPrimary)
                    .padding(ChravelSpacing.sm)
                    .background(message.role == .user ? Color.chravelOrange : Color.glassWhite)
                    .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
                
                // Sources
                if let sources = message.sources, !sources.isEmpty {
                    VStack(alignment: .leading, spacing: ChravelSpacing.xxs) {
                        Text("Sources")
                            .font(ChravelTypography.captionSmall)
                            .foregroundColor(.textTertiary)
                        
                        ForEach(sources) { source in
                            AISourceTag(source: source)
                        }
                    }
                }
                
                // Feedback buttons (for assistant messages)
                if message.role == .assistant && message.feedback == nil {
                    HStack(spacing: ChravelSpacing.sm) {
                        Button {
                            onFeedback?(message, .positive)
                        } label: {
                            Image(systemName: "hand.thumbsup")
                                .font(.system(size: 14))
                                .foregroundColor(.textTertiary)
                        }
                        
                        Button {
                            onFeedback?(message, .negative)
                        } label: {
                            Image(systemName: "hand.thumbsdown")
                                .font(.system(size: 14))
                                .foregroundColor(.textTertiary)
                        }
                    }
                } else if let feedback = message.feedback {
                    HStack(spacing: ChravelSpacing.xxs) {
                        Image(systemName: feedback == .positive ? "hand.thumbsup.fill" : "hand.thumbsdown.fill")
                            .font(.system(size: 12))
                        Text(feedback == .positive ? "Helpful" : "Not helpful")
                            .font(ChravelTypography.captionSmall)
                    }
                    .foregroundColor(.textMuted)
                }
            }
            
            if message.role == .user {
                Spacer(minLength: 40)
            }
        }
    }
}

struct AISourceTag: View {
    let source: AISource
    
    var body: some View {
        HStack(spacing: ChravelSpacing.xxs) {
            Image(systemName: iconForType(source.type))
                .font(.system(size: 10))
            
            Text(source.title)
                .font(ChravelTypography.captionSmall)
                .lineLimit(1)
        }
        .foregroundColor(.info)
        .padding(.horizontal, ChravelSpacing.xs)
        .padding(.vertical, ChravelSpacing.xxs)
        .background(Color.info.opacity(0.1))
        .clipShape(Capsule())
    }
    
    private func iconForType(_ type: AISource.SourceType) -> String {
        switch type {
        case .message: return "bubble.left"
        case .file: return "doc"
        case .link: return "link"
        case .event: return "calendar"
        case .photo: return "photo"
        }
    }
}

struct AISuggestionCard: View {
    let suggestion: AISuggestion
    var onTap: ((AISuggestion) -> Void)?
    
    var body: some View {
        Button {
            onTap?(suggestion)
        } label: {
            VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                HStack {
                    Image(systemName: iconForType(suggestion.type))
                        .font(.system(size: 14))
                        .foregroundColor(.chravelOrange)
                    
                    Text(suggestion.title)
                        .font(ChravelTypography.labelLarge)
                        .foregroundColor(.textPrimary)
                    
                    Spacer()
                    
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12))
                        .foregroundColor(.textMuted)
                }
                
                Text(suggestion.description)
                    .font(ChravelTypography.caption)
                    .foregroundColor(.textSecondary)
                    .lineLimit(2)
            }
            .padding(ChravelSpacing.sm)
            .background(Color.glassWhite)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: ChravelRadius.md)
                    .stroke(Color.glassBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    private func iconForType(_ type: AISuggestion.SuggestionType) -> String {
        switch type {
        case .activity: return "figure.hiking"
        case .restaurant: return "fork.knife"
        case .accommodation: return "bed.double"
        case .timing: return "clock"
        case .route: return "map"
        }
    }
}
```

---

## 4. LAYOUT COMPONENTS

### 4.1 Tab Bar

```swift
import SwiftUI

struct ChravelTabBar: View {
    @Binding var selectedTab: TripTab
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(TripTab.allCases, id: \.self) { tab in
                TabBarItem(
                    tab: tab,
                    isSelected: selectedTab == tab
                ) {
                    ChravelHaptics.selection()
                    selectedTab = tab
                }
            }
        }
        .padding(.horizontal, ChravelSpacing.sm)
        .padding(.top, ChravelSpacing.sm)
        .padding(.bottom, ChravelSpacing.xs)
        .background(Color.chravelDarkGray)
        .overlay(
            Rectangle()
                .fill(Color.glassBorder)
                .frame(height: 1),
            alignment: .top
        )
    }
}

struct TabBarItem: View {
    let tab: TripTab
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: ChravelSpacing.xxs) {
                Image(systemName: tab.icon)
                    .font(.system(size: 20, weight: isSelected ? .semibold : .regular))
                
                Text(tab.title)
                    .font(ChravelTypography.captionSmall)
            }
            .foregroundColor(isSelected ? .chravelOrange : .textTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, ChravelSpacing.xs)
        }
        .buttonStyle(.plain)
    }
}
```

### 4.2 View Mode Selector

```swift
import SwiftUI

struct ViewModeSelector: View {
    @Binding var selectedMode: ViewMode
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: ChravelSpacing.xs) {
                ForEach(ViewMode.allCases, id: \.self) { mode in
                    ChravelTagPill(
                        text: mode.displayName,
                        icon: iconForMode(mode),
                        isSelected: selectedMode == mode
                    ) {
                        selectedMode = mode
                    }
                }
            }
            .padding(.vertical, ChravelSpacing.xs)
        }
    }
    
    private func iconForMode(_ mode: ViewMode) -> String {
        switch mode {
        case .myTrips: return "airplane"
        case .tripsPro: return "briefcase"
        case .events: return "calendar.badge.plus"
        case .travelRecs: return "sparkles"
        }
    }
}
```

### 4.3 Stats Bar

```swift
import SwiftUI

struct TripStatsBar: View {
    let stats: TripStats
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: ChravelSpacing.sm) {
                StatPill(label: "Total", value: stats.total, color: .textPrimary)
                StatPill(label: "Active", value: stats.active, color: .success)
                StatPill(label: "Upcoming", value: stats.upcoming, color: .info)
                StatPill(label: "Past", value: stats.past, color: .textTertiary)
            }
            .padding(.vertical, ChravelSpacing.xs)
        }
    }
}

struct StatPill: View {
    let label: String
    let value: Int
    let color: Color
    
    var body: some View {
        HStack(spacing: ChravelSpacing.xs) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            
            Text(label)
                .font(ChravelTypography.label)
                .foregroundColor(.textSecondary)
            
            Text("\(value)")
                .font(ChravelTypography.labelLarge)
                .foregroundColor(.textPrimary)
        }
        .padding(.horizontal, ChravelSpacing.sm)
        .padding(.vertical, ChravelSpacing.xs)
        .background(Color.glassWhite)
        .clipShape(Capsule())
    }
}
```

---

## 5. MODIFIERS

### 5.1 Glass Effect

```swift
import SwiftUI

struct GlassModifier: ViewModifier {
    var cornerRadius: CGFloat = ChravelRadius.lg
    var borderWidth: CGFloat = 1
    
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.glassBorder, lineWidth: borderWidth)
            )
    }
}

extension View {
    func glassEffect(cornerRadius: CGFloat = ChravelRadius.lg) -> some View {
        modifier(GlassModifier(cornerRadius: cornerRadius))
    }
}
```

### 5.2 Card Style

```swift
import SwiftUI

struct CardModifier: ViewModifier {
    var backgroundColor: Color = .glassWhite
    var cornerRadius: CGFloat = ChravelRadius.lg
    var hasBorder: Bool = true
    
    func body(content: Content) -> some View {
        content
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(hasBorder ? Color.glassBorder : Color.clear, lineWidth: 1)
            )
    }
}

extension View {
    func cardStyle(
        backgroundColor: Color = .glassWhite,
        cornerRadius: CGFloat = ChravelRadius.lg,
        hasBorder: Bool = true
    ) -> some View {
        modifier(CardModifier(
            backgroundColor: backgroundColor,
            cornerRadius: cornerRadius,
            hasBorder: hasBorder
        ))
    }
}
```

### 5.3 Shake Animation

```swift
import SwiftUI

struct ShakeModifier: ViewModifier {
    @Binding var isShaking: Bool
    
    func body(content: Content) -> some View {
        content
            .offset(x: isShaking ? -5 : 0)
            .animation(
                isShaking ?
                    Animation.linear(duration: 0.06).repeatCount(5, autoreverses: true) :
                    .default,
                value: isShaking
            )
            .onChange(of: isShaking) { _, newValue in
                if newValue {
                    ChravelHaptics.error()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                        isShaking = false
                    }
                }
            }
    }
}

extension View {
    func shake(isShaking: Binding<Bool>) -> some View {
        modifier(ShakeModifier(isShaking: isShaking))
    }
}
```

### 5.4 Loading Overlay

```swift
import SwiftUI

struct LoadingOverlayModifier: ViewModifier {
    let isLoading: Bool
    var message: String?
    
    func body(content: Content) -> some View {
        ZStack {
            content
                .disabled(isLoading)
                .blur(radius: isLoading ? 2 : 0)
            
            if isLoading {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                
                VStack(spacing: ChravelSpacing.md) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .chravelOrange))
                        .scaleEffect(1.5)
                    
                    if let message = message {
                        Text(message)
                            .font(ChravelTypography.body)
                            .foregroundColor(.textSecondary)
                    }
                }
                .padding(ChravelSpacing.lg)
                .glassEffect()
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }
}

extension View {
    func loadingOverlay(isLoading: Bool, message: String? = nil) -> some View {
        modifier(LoadingOverlayModifier(isLoading: isLoading, message: message))
    }
}
```

---

## 6. EMPTY STATES

```swift
import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    var message: String?
    var actionTitle: String?
    var action: (() -> Void)?
    
    var body: some View {
        VStack(spacing: ChravelSpacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.textMuted)
            
            VStack(spacing: ChravelSpacing.xs) {
                Text(title)
                    .font(ChravelTypography.headline)
                    .foregroundColor(.textPrimary)
                
                if let message = message {
                    Text(message)
                        .font(ChravelTypography.body)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            if let actionTitle = actionTitle, let action = action {
                ChravelButton(
                    title: actionTitle,
                    style: .primary,
                    size: .medium,
                    action: action
                )
                .frame(maxWidth: 200)
            }
        }
        .padding(ChravelSpacing.xl)
    }
}

// Predefined empty states
extension EmptyStateView {
    static var noTrips: EmptyStateView {
        EmptyStateView(
            icon: "airplane",
            title: "No trips yet",
            message: "Create your first trip to get started!",
            actionTitle: "Create Trip"
        )
    }
    
    static var noMessages: EmptyStateView {
        EmptyStateView(
            icon: "bubble.left.and.bubble.right",
            title: "No messages",
            message: "Start the conversation!"
        )
    }
    
    static var noPayments: EmptyStateView {
        EmptyStateView(
            icon: "dollarsign.circle",
            title: "No expenses yet",
            message: "Add an expense to start tracking"
        )
    }
    
    static var noResults: EmptyStateView {
        EmptyStateView(
            icon: "magnifyingglass",
            title: "No results found",
            message: "Try adjusting your search"
        )
    }
}
```

---

=== SWIFT-COMPONENT-LIBRARY END ===
