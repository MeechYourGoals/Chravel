=== SCREEN: AuthView START ===

// AuthView.swift
// Chravel iOS - Authentication Screen (Login/Signup)
// Generated from MSPEC

import SwiftUI
import AuthenticationServices

// MARK: - Auth Mode

enum AuthMode: String, CaseIterable {
    case signIn = "Sign In"
    case signUp = "Sign Up"
}

// MARK: - Auth View

struct AuthView: View {
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthViewModel.self) private var viewModel
    
    // MARK: - State
    @State private var authMode: AuthMode = .signIn
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    @State private var displayName: String = ""
    @State private var showPassword: Bool = false
    @State private var agreedToTerms: Bool = false
    @State private var showForgotPassword: Bool = false
    
    // Focus States
    @FocusState private var focusedField: AuthField?
    
    enum AuthField: Hashable {
        case email, password, confirmPassword, displayName
    }
    
    // MARK: - Body
    
    var body: some View {
        @Bindable var viewModel = viewModel
        
        ZStack {
            // Background
            AuthBackground()
            
            ScrollView {
                VStack(spacing: ChravelSpacing.xl) {
                    // Logo
                    LogoHeader()
                        .padding(.top, ChravelSpacing.xxxl)
                    
                    // Mode Toggle
                    AuthModeToggle(mode: $authMode)
                        .padding(.horizontal, ChravelSpacing.lg)
                    
                    // Form Fields
                    VStack(spacing: ChravelSpacing.md) {
                        // Display Name (Sign Up only)
                        if authMode == .signUp {
                            ChravelTextField(
                                placeholder: "Display Name",
                                text: $displayName,
                                icon: "person.fill"
                            )
                            .focused($focusedField, equals: .displayName)
                            .submitLabel(.next)
                            .onSubmit {
                                focusedField = .email
                            }
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }
                        
                        // Email
                        ChravelTextField(
                            placeholder: "Email",
                            text: $email,
                            icon: "envelope.fill",
                            keyboardType: .emailAddress,
                            autocapitalization: .never
                        )
                        .focused($focusedField, equals: .email)
                        .submitLabel(.next)
                        .onSubmit {
                            focusedField = .password
                        }
                        
                        // Password
                        ChravelSecureField(
                            placeholder: "Password",
                            text: $password,
                            showPassword: $showPassword,
                            icon: "lock.fill"
                        )
                        .focused($focusedField, equals: .password)
                        .submitLabel(authMode == .signUp ? .next : .go)
                        .onSubmit {
                            if authMode == .signUp {
                                focusedField = .confirmPassword
                            } else {
                                handleSubmit()
                            }
                        }
                        
                        // Confirm Password (Sign Up only)
                        if authMode == .signUp {
                            ChravelSecureField(
                                placeholder: "Confirm Password",
                                text: $confirmPassword,
                                showPassword: $showPassword,
                                icon: "lock.fill"
                            )
                            .focused($focusedField, equals: .confirmPassword)
                            .submitLabel(.go)
                            .onSubmit {
                                handleSubmit()
                            }
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }
                        
                        // Forgot Password (Sign In only)
                        if authMode == .signIn {
                            HStack {
                                Spacer()
                                Button {
                                    showForgotPassword = true
                                } label: {
                                    Text("Forgot Password?")
                                        .font(ChravelTypography.labelSmall)
                                        .foregroundColor(.chravelOrange)
                                }
                            }
                        }
                        
                        // Terms Agreement (Sign Up only)
                        if authMode == .signUp {
                            TermsCheckbox(isChecked: $agreedToTerms)
                                .transition(.move(edge: .top).combined(with: .opacity))
                        }
                    }
                    .padding(.horizontal, ChravelSpacing.lg)
                    .animation(.easeInOut(duration: 0.3), value: authMode)
                    
                    // Error Message
                    if let errorMessage = viewModel.errorMessage {
                        ErrorBanner(message: errorMessage) {
                            viewModel.errorMessage = nil
                        }
                        .padding(.horizontal, ChravelSpacing.lg)
                        .transition(.scale.combined(with: .opacity))
                    }
                    
                    // Submit Button
                    ChravelButton(
                        title: authMode == .signIn ? "Sign In" : "Create Account",
                        style: .primary,
                        isLoading: viewModel.isLoading,
                        isDisabled: !isFormValid
                    ) {
                        handleSubmit()
                    }
                    .padding(.horizontal, ChravelSpacing.lg)
                    
                    // Divider
                    DividerWithText(text: "or continue with")
                        .padding(.horizontal, ChravelSpacing.lg)
                    
                    // Social Auth
                    VStack(spacing: ChravelSpacing.sm) {
                        // Sign in with Apple
                        SignInWithAppleButton(
                            authMode == .signIn ? .signIn : .signUp,
                            onRequest: { request in
                                request.requestedScopes = [.fullName, .email]
                            },
                            onCompletion: { result in
                                Task {
                                    await handleAppleSignIn(result)
                                }
                            }
                        )
                        .signInWithAppleButtonStyle(.white)
                        .frame(height: 50)
                        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
                        
                        // Sign in with Google
                        SocialAuthButton(
                            provider: .google,
                            action: {
                                Task {
                                    await viewModel.signInWithGoogle()
                                }
                            }
                        )
                    }
                    .padding(.horizontal, ChravelSpacing.lg)
                    
                    Spacer(minLength: ChravelSpacing.xxxl)
                }
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .animation(.easeInOut, value: viewModel.errorMessage != nil)
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordSheet(email: email)
        }
        .onChange(of: viewModel.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                ChravelHaptics.success()
                dismiss()
            }
        }
    }
    
    // MARK: - Computed Properties
    
    private var isFormValid: Bool {
        let emailValid = email.isValidEmail
        let passwordValid = password.count >= 6
        
        if authMode == .signIn {
            return emailValid && passwordValid
        } else {
            let confirmValid = password == confirmPassword
            let nameValid = !displayName.isEmpty
            return emailValid && passwordValid && confirmValid && nameValid && agreedToTerms
        }
    }
    
    // MARK: - Actions
    
    private func handleSubmit() {
        guard isFormValid else { return }
        
        ChravelHaptics.light()
        focusedField = nil
        
        Task {
            if authMode == .signIn {
                await viewModel.signIn(email: email, password: password)
            } else {
                await viewModel.signUp(
                    email: email,
                    password: password,
                    displayName: displayName
                )
            }
        }
    }
    
    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            await viewModel.signInWithApple(authorization: authorization)
        case .failure(let error):
            viewModel.errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
    }
}

// MARK: - Auth Background

struct AuthBackground: View {
    var body: some View {
        ZStack {
            Color.chravelBlack
                .ignoresSafeArea()
            
            // Gradient orbs
            Circle()
                .fill(Color.chravelOrange.opacity(0.15))
                .frame(width: 300, height: 300)
                .blur(radius: 80)
                .offset(x: -100, y: -200)
            
            Circle()
                .fill(Color.chravelYellow.opacity(0.1))
                .frame(width: 250, height: 250)
                .blur(radius: 60)
                .offset(x: 150, y: 100)
            
            Circle()
                .fill(Color.chravelOrange.opacity(0.08))
                .frame(width: 200, height: 200)
                .blur(radius: 50)
                .offset(x: -50, y: 300)
        }
    }
}

// MARK: - Logo Header

struct LogoHeader: View {
    var body: some View {
        VStack(spacing: ChravelSpacing.sm) {
            // App Icon
            Image("AppIcon")
                .resizable()
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .shadow(color: .chravelOrange.opacity(0.3), radius: 20)
            
            // App Name
            Text("Chravel")
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundColor(.textPrimary)
            
            // Tagline
            Text("Group travel, simplified")
                .font(ChravelTypography.body)
                .foregroundColor(.textSecondary)
        }
    }
}

// MARK: - Auth Mode Toggle

struct AuthModeToggle: View {
    @Binding var mode: AuthMode
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(AuthMode.allCases, id: \.self) { authMode in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        mode = authMode
                    }
                    ChravelHaptics.selection()
                } label: {
                    Text(authMode.rawValue)
                        .font(ChravelTypography.label)
                        .fontWeight(mode == authMode ? .semibold : .regular)
                        .foregroundColor(mode == authMode ? .white : .textMuted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, ChravelSpacing.sm)
                        .background(
                            mode == authMode ?
                                Color.chravelOrange :
                                Color.clear
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
    }
}

// MARK: - Secure Field

struct ChravelSecureField: View {
    let placeholder: String
    @Binding var text: String
    @Binding var showPassword: Bool
    var icon: String = "lock.fill"
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.textMuted)
                .frame(width: 24)
            
            Group {
                if showPassword {
                    TextField(placeholder, text: $text)
                } else {
                    SecureField(placeholder, text: $text)
                }
            }
            .font(ChravelTypography.body)
            .foregroundColor(.textPrimary)
            .autocapitalization(.none)
            .disableAutocorrection(true)
            
            Button {
                showPassword.toggle()
            } label: {
                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.textMuted)
            }
        }
        .padding(ChravelSpacing.md)
        .background(Color.chravelDarkGray)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
    }
}

// MARK: - Terms Checkbox

struct TermsCheckbox: View {
    @Binding var isChecked: Bool
    
    var body: some View {
        Button {
            isChecked.toggle()
            ChravelHaptics.selection()
        } label: {
            HStack(alignment: .top, spacing: ChravelSpacing.sm) {
                Image(systemName: isChecked ? "checkmark.square.fill" : "square")
                    .font(.system(size: 20))
                    .foregroundColor(isChecked ? .chravelOrange : .textMuted)
                
                Text("I agree to the ")
                    .foregroundColor(.textSecondary)
                +
                Text("Terms of Service")
                    .foregroundColor(.chravelOrange)
                +
                Text(" and ")
                    .foregroundColor(.textSecondary)
                +
                Text("Privacy Policy")
                    .foregroundColor(.chravelOrange)
            }
            .font(ChravelTypography.caption)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Error Banner

struct ErrorBanner: View {
    let message: String
    let onDismiss: () -> Void
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.error)
            
            Text(message)
                .font(ChravelTypography.caption)
                .foregroundColor(.error)
            
            Spacer()
            
            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.error)
            }
        }
        .padding(ChravelSpacing.sm)
        .background(Color.error.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.sm))
    }
}

// MARK: - Divider With Text

struct DividerWithText: View {
    let text: String
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            Rectangle()
                .fill(Color.glassBorder)
                .frame(height: 1)
            
            Text(text)
                .font(ChravelTypography.caption)
                .foregroundColor(.textMuted)
            
            Rectangle()
                .fill(Color.glassBorder)
                .frame(height: 1)
        }
    }
}

// MARK: - Social Auth Button

enum SocialProvider {
    case google
    case apple
    
    var icon: String {
        switch self {
        case .google: return "g.circle.fill"
        case .apple: return "apple.logo"
        }
    }
    
    var title: String {
        switch self {
        case .google: return "Continue with Google"
        case .apple: return "Continue with Apple"
        }
    }
    
    var backgroundColor: Color {
        switch self {
        case .google: return .white
        case .apple: return .black
        }
    }
    
    var foregroundColor: Color {
        switch self {
        case .google: return .black
        case .apple: return .white
        }
    }
}

struct SocialAuthButton: View {
    let provider: SocialProvider
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            ChravelHaptics.light()
            action()
        }) {
            HStack(spacing: ChravelSpacing.sm) {
                if provider == .google {
                    // Google logo (custom image would be better)
                    Text("G")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.red)
                } else {
                    Image(systemName: provider.icon)
                        .font(.system(size: 18))
                }
                
                Text(provider.title)
                    .font(ChravelTypography.label)
            }
            .foregroundColor(provider.foregroundColor)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(provider.backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Forgot Password Sheet

struct ForgotPasswordSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthViewModel.self) private var authViewModel
    
    @State var email: String
    @State private var isSubmitted: Bool = false
    @State private var isLoading: Bool = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: ChravelSpacing.lg) {
                if isSubmitted {
                    // Success State
                    VStack(spacing: ChravelSpacing.md) {
                        Image(systemName: "envelope.badge.fill")
                            .font(.system(size: 64))
                            .foregroundColor(.success)
                        
                        Text("Check Your Email")
                            .font(ChravelTypography.headline)
                            .foregroundColor(.textPrimary)
                        
                        Text("We've sent a password reset link to \(email)")
                            .font(ChravelTypography.body)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(ChravelSpacing.xl)
                    
                    ChravelButton(title: "Done", style: .primary) {
                        dismiss()
                    }
                    .padding(.horizontal, ChravelSpacing.lg)
                } else {
                    // Input State
                    VStack(alignment: .leading, spacing: ChravelSpacing.sm) {
                        Text("Enter your email address and we'll send you a link to reset your password.")
                            .font(ChravelTypography.body)
                            .foregroundColor(.textSecondary)
                        
                        ChravelTextField(
                            placeholder: "Email",
                            text: $email,
                            icon: "envelope.fill",
                            keyboardType: .emailAddress,
                            autocapitalization: .never
                        )
                    }
                    .padding(ChravelSpacing.lg)
                    
                    ChravelButton(
                        title: "Send Reset Link",
                        style: .primary,
                        isLoading: isLoading,
                        isDisabled: !email.isValidEmail
                    ) {
                        handleReset()
                    }
                    .padding(.horizontal, ChravelSpacing.lg)
                }
                
                Spacer()
            }
            .padding(.top, ChravelSpacing.lg)
            .background(Color.chravelBlack)
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.textSecondary)
                }
            }
        }
    }
    
    private func handleReset() {
        isLoading = true
        
        Task {
            await authViewModel.resetPassword(email: email)
            
            await MainActor.run {
                isLoading = false
                isSubmitted = true
                ChravelHaptics.success()
            }
        }
    }
}

// MARK: - Email Validation Extension

extension String {
    var isValidEmail: Bool {
        let emailRegex = #"^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return self.range(of: emailRegex, options: .regularExpression) != nil
    }
}

// MARK: - Preview

#Preview {
    AuthView()
        .environment(AuthViewModel())
        .preferredColorScheme(.dark)
}

=== SCREEN: AuthView END ===
