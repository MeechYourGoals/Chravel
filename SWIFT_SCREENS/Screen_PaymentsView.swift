=== SCREEN: PaymentsView START ===

// PaymentsView.swift
// Chravel iOS - Payments/Budget Screen
// Generated from MSPEC

import SwiftUI

// MARK: - Payments View

struct PaymentsView: View {
    // MARK: - Parameters
    let tripId: String
    
    // MARK: - Environment
    @Environment(AuthViewModel.self) private var authViewModel
    
    // MARK: - State
    @State private var viewModel: PaymentsViewModel
    @State private var showAddExpense = false
    @State private var showSettlements = false
    @State private var selectedExpense: PaymentMessage?
    
    // MARK: - Init
    
    init(tripId: String) {
        self.tripId = tripId
        _viewModel = State(wrappedValue: PaymentsViewModel(tripId: tripId))
    }
    
    // MARK: - Body
    
    var body: some View {
        @Bindable var viewModel = viewModel
        
        ZStack {
            Color.chravelBlack.ignoresSafeArea()
            
            if viewModel.isLoading {
                ProgressView()
                    .tint(.chravelOrange)
            } else {
                ScrollView {
                    VStack(spacing: ChravelSpacing.lg) {
                        // Balance Summary Card
                        BalanceSummaryCard(summary: viewModel.summary)
                        
                        // Quick Actions
                        HStack(spacing: ChravelSpacing.md) {
                            QuickActionButton(
                                icon: "plus.circle.fill",
                                label: "Add Expense",
                                color: .chravelOrange
                            ) {
                                showAddExpense = true
                            }
                            
                            QuickActionButton(
                                icon: "arrow.left.arrow.right.circle.fill",
                                label: "Settle Up",
                                color: .success
                            ) {
                                showSettlements = true
                            }
                        }
                        .padding(.horizontal, ChravelSpacing.md)
                        
                        // Expenses List
                        ExpensesList(
                            expenses: viewModel.expenses,
                            currentUserId: authViewModel.user?.id ?? "",
                            onExpenseTap: { expense in
                                selectedExpense = expense
                            }
                        )
                    }
                    .padding(.vertical, ChravelSpacing.md)
                }
            }
            
            // Empty State
            if !viewModel.isLoading && viewModel.expenses.isEmpty {
                EmptyStateView(
                    icon: "creditcard",
                    title: "No expenses yet",
                    message: "Track shared expenses and split costs with your group.",
                    actionTitle: "Add First Expense"
                ) {
                    showAddExpense = true
                }
            }
        }
        .navigationTitle("Budget")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showAddExpense) {
            AddExpenseSheet(
                tripId: tripId,
                members: viewModel.members,
                onExpenseAdded: { expense in
                    viewModel.expenses.insert(expense, at: 0)
                    viewModel.recalculateSummary()
                }
            )
        }
        .sheet(isPresented: $showSettlements) {
            SettlementsSheet(
                summary: viewModel.summary,
                members: viewModel.members,
                onSettle: { settlement in
                    Task {
                        await viewModel.settlePayment(settlement)
                    }
                }
            )
        }
        .sheet(item: $selectedExpense) { expense in
            ExpenseDetailSheet(
                expense: expense,
                members: viewModel.members,
                currentUserId: authViewModel.user?.id ?? "",
                onDelete: {
                    Task {
                        await viewModel.deleteExpense(expense.id)
                    }
                }
            )
        }
        .task {
            await viewModel.loadData()
        }
        .refreshable {
            await viewModel.loadData()
        }
    }
}

// MARK: - Balance Summary Card

struct BalanceSummaryCard: View {
    let summary: PaymentSummary?
    
    var body: some View {
        VStack(spacing: ChravelSpacing.md) {
            // Total Spent
            VStack(spacing: ChravelSpacing.xxs) {
                Text("Total Spent")
                    .font(ChravelTypography.label)
                    .foregroundColor(.textSecondary)
                
                Text(formatCurrency(summary?.totalSpent ?? 0))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.textPrimary)
            }
            
            Divider()
            
            // Balance Stats
            HStack(spacing: ChravelSpacing.lg) {
                BalanceStat(
                    label: "You Paid",
                    amount: summary?.yourTotal ?? 0,
                    color: .chravelOrange
                )
                
                BalanceStat(
                    label: "Your Share",
                    amount: summary?.yourShare ?? 0,
                    color: .textSecondary
                )
                
                BalanceStat(
                    label: "Balance",
                    amount: (summary?.yourTotal ?? 0) - (summary?.yourShare ?? 0),
                    color: balanceColor
                )
            }
        }
        .padding(ChravelSpacing.lg)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
        .padding(.horizontal, ChravelSpacing.md)
    }
    
    private var balanceColor: Color {
        let balance = (summary?.yourTotal ?? 0) - (summary?.yourShare ?? 0)
        if balance > 0 { return .success }
        if balance < 0 { return .error }
        return .textSecondary
    }
}

struct BalanceStat: View {
    let label: String
    let amount: Double
    let color: Color
    
    var body: some View {
        VStack(spacing: ChravelSpacing.xxs) {
            Text(label)
                .font(ChravelTypography.captionSmall)
                .foregroundColor(.textMuted)
            
            Text(formatCurrency(amount))
                .font(ChravelTypography.headline)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            ChravelHaptics.light()
            action()
        }) {
            HStack(spacing: ChravelSpacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(color)
                
                Text(label)
                    .font(ChravelTypography.label)
                    .foregroundColor(.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(ChravelSpacing.md)
            .background(Color.glassWhite)
            .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
        }
    }
}

// MARK: - Expenses List

struct ExpensesList: View {
    let expenses: [PaymentMessage]
    let currentUserId: String
    let onExpenseTap: (PaymentMessage) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: ChravelSpacing.sm) {
            Text("Recent Expenses")
                .font(ChravelTypography.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, ChravelSpacing.md)
            
            LazyVStack(spacing: ChravelSpacing.xs) {
                ForEach(expenses) { expense in
                    ExpenseRow(
                        expense: expense,
                        isCurrentUser: expense.payerId == currentUserId
                    )
                    .onTapGesture {
                        onExpenseTap(expense)
                    }
                }
            }
            .padding(.horizontal, ChravelSpacing.md)
        }
    }
}

struct ExpenseRow: View {
    let expense: PaymentMessage
    let isCurrentUser: Bool
    
    var body: some View {
        HStack(spacing: ChravelSpacing.md) {
            // Category Icon
            ZStack {
                Circle()
                    .fill(categoryColor.opacity(0.2))
                    .frame(width: 44, height: 44)
                
                Image(systemName: categoryIcon)
                    .font(.system(size: 18))
                    .foregroundColor(categoryColor)
            }
            
            // Details
            VStack(alignment: .leading, spacing: 2) {
                Text(expense.description)
                    .font(ChravelTypography.label)
                    .foregroundColor(.textPrimary)
                    .lineLimit(1)
                
                HStack(spacing: ChravelSpacing.xxs) {
                    Text(isCurrentUser ? "You paid" : "\(expense.payerName ?? "Someone") paid")
                        .foregroundColor(.textMuted)
                    
                    Text("•")
                        .foregroundColor(.textMuted)
                    
                    Text(expense.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .foregroundColor(.textMuted)
                }
                .font(ChravelTypography.captionSmall)
            }
            
            Spacer()
            
            // Amount
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatCurrency(expense.amount))
                    .font(ChravelTypography.headline)
                    .foregroundColor(.textPrimary)
                
                if let split = expense.splitType {
                    Text(split.capitalized)
                        .font(ChravelTypography.captionSmall)
                        .foregroundColor(.textMuted)
                }
            }
        }
        .padding(ChravelSpacing.sm)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
    }
    
    private var categoryIcon: String {
        switch expense.category?.lowercased() {
        case "food", "restaurant": return "fork.knife"
        case "transport", "transportation": return "car.fill"
        case "lodging", "accommodation": return "bed.double.fill"
        case "activity", "entertainment": return "ticket.fill"
        case "shopping": return "bag.fill"
        default: return "creditcard.fill"
        }
    }
    
    private var categoryColor: Color {
        switch expense.category?.lowercased() {
        case "food", "restaurant": return .orange
        case "transport", "transportation": return .blue
        case "lodging", "accommodation": return .purple
        case "activity", "entertainment": return .pink
        case "shopping": return .green
        default: return .chravelOrange
        }
    }
}

// MARK: - Add Expense Sheet

struct AddExpenseSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    let tripId: String
    let members: [TripMember]
    let onExpenseAdded: (PaymentMessage) -> Void
    
    @State private var description: String = ""
    @State private var amount: String = ""
    @State private var category: String = "other"
    @State private var splitType: SplitType = .equal
    @State private var selectedMembers: Set<String> = []
    @State private var customSplits: [String: Double] = [:]
    @State private var isSubmitting: Bool = false
    
    let categories = ["food", "transport", "lodging", "activity", "shopping", "other"]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: ChravelSpacing.lg) {
                    // Amount Input
                    VStack(spacing: ChravelSpacing.xs) {
                        Text("Amount")
                            .font(ChravelTypography.label)
                            .foregroundColor(.textSecondary)
                        
                        HStack {
                            Text("$")
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(.textMuted)
                            
                            TextField("0.00", text: $amount)
                                .font(.system(size: 48, weight: .bold, design: .rounded))
                                .foregroundColor(.textPrimary)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding(ChravelSpacing.lg)
                    .background(Color.glassWhite)
                    .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
                    
                    // Description
                    ChravelTextField(
                        placeholder: "What's this for?",
                        text: $description,
                        icon: "text.alignleft"
                    )
                    
                    // Category Picker
                    VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                        Text("Category")
                            .font(ChravelTypography.label)
                            .foregroundColor(.textSecondary)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: ChravelSpacing.xs) {
                                ForEach(categories, id: \.self) { cat in
                                    CategoryButton(
                                        category: cat,
                                        isSelected: category == cat
                                    ) {
                                        category = cat
                                    }
                                }
                            }
                        }
                    }
                    
                    // Split Type
                    VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                        Text("Split")
                            .font(ChravelTypography.label)
                            .foregroundColor(.textSecondary)
                        
                        Picker("Split Type", selection: $splitType) {
                            ForEach(SplitType.allCases, id: \.self) { type in
                                Text(type.displayName).tag(type)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                    
                    // Member Selection
                    VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                        Text("Split with")
                            .font(ChravelTypography.label)
                            .foregroundColor(.textSecondary)
                        
                        ForEach(members) { member in
                            MemberSplitRow(
                                member: member,
                                isSelected: selectedMembers.contains(member.userId),
                                splitType: splitType,
                                customAmount: customSplits[member.userId] ?? 0,
                                onToggle: {
                                    toggleMember(member.userId)
                                },
                                onAmountChange: { amount in
                                    customSplits[member.userId] = amount
                                }
                            )
                        }
                    }
                }
                .padding(ChravelSpacing.lg)
            }
            .background(Color.chravelBlack)
            .navigationTitle("Add Expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.textSecondary)
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        Task {
                            await addExpense()
                        }
                    }
                    .fontWeight(.semibold)
                    .foregroundColor(.chravelOrange)
                    .disabled(!isFormValid || isSubmitting)
                }
            }
            .onAppear {
                // Select all members by default
                selectedMembers = Set(members.map { $0.userId })
            }
        }
    }
    
    private var isFormValid: Bool {
        !description.isEmpty && !amount.isEmpty && (Double(amount) ?? 0) > 0
    }
    
    private func toggleMember(_ userId: String) {
        if selectedMembers.contains(userId) {
            selectedMembers.remove(userId)
        } else {
            selectedMembers.insert(userId)
        }
    }
    
    private func addExpense() async {
        isSubmitting = true
        
        guard let amountValue = Double(amount) else {
            isSubmitting = false
            return
        }
        
        // Call payment service to create expense
        // This would be implemented in PaymentsViewModel
        
        ChravelHaptics.success()
        dismiss()
    }
}

struct CategoryButton: View {
    let category: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            ChravelHaptics.selection()
            action()
        }) {
            HStack(spacing: ChravelSpacing.xxs) {
                Image(systemName: iconForCategory)
                    .font(.system(size: 14))
                Text(category.capitalized)
                    .font(ChravelTypography.captionSmall)
            }
            .foregroundColor(isSelected ? .white : .textSecondary)
            .padding(.horizontal, ChravelSpacing.sm)
            .padding(.vertical, ChravelSpacing.xs)
            .background(isSelected ? Color.chravelOrange : Color.glassWhite)
            .clipShape(Capsule())
        }
    }
    
    private var iconForCategory: String {
        switch category {
        case "food": return "fork.knife"
        case "transport": return "car.fill"
        case "lodging": return "bed.double.fill"
        case "activity": return "ticket.fill"
        case "shopping": return "bag.fill"
        default: return "creditcard.fill"
        }
    }
}

struct MemberSplitRow: View {
    let member: TripMember
    let isSelected: Bool
    let splitType: SplitType
    let customAmount: Double
    let onToggle: () -> Void
    let onAmountChange: (Double) -> Void
    
    @State private var amountText: String = ""
    
    var body: some View {
        HStack(spacing: ChravelSpacing.md) {
            Button(action: onToggle) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? .chravelOrange : .textMuted)
            }
            
            ChravelAvatar(
                url: member.profile?.avatarUrl,
                fallback: String(member.profile?.displayName.prefix(1) ?? "?"),
                size: .small
            )
            
            Text(member.profile?.displayName ?? "Unknown")
                .font(ChravelTypography.label)
                .foregroundColor(.textPrimary)
            
            Spacer()
            
            if splitType == .custom && isSelected {
                HStack {
                    Text("$")
                        .foregroundColor(.textMuted)
                    TextField("0", text: $amountText)
                        .keyboardType(.decimalPad)
                        .frame(width: 60)
                        .multilineTextAlignment(.trailing)
                        .onChange(of: amountText) { _, newValue in
                            onAmountChange(Double(newValue) ?? 0)
                        }
                }
                .font(ChravelTypography.body)
            }
        }
        .padding(ChravelSpacing.sm)
        .background(Color.glassWhite)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.sm))
    }
}

// MARK: - Settlements Sheet (Placeholder)

struct SettlementsSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    let summary: PaymentSummary?
    let members: [TripMember]
    let onSettle: (SettlementSuggestion) -> Void
    
    var body: some View {
        NavigationStack {
            VStack(spacing: ChravelSpacing.lg) {
                Text("Settlement suggestions will appear here")
                    .foregroundColor(.textSecondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.chravelBlack)
            .navigationTitle("Settle Up")
            .navigationBarTitleDisplayMode(.inline)
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

// MARK: - Expense Detail Sheet (Placeholder)

struct ExpenseDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    let expense: PaymentMessage
    let members: [TripMember]
    let currentUserId: String
    let onDelete: () -> Void
    
    var body: some View {
        NavigationStack {
            VStack {
                Text(expense.description)
                    .font(ChravelTypography.headline)
                
                Text(formatCurrency(expense.amount))
                    .font(.system(size: 48, weight: .bold, design: .rounded))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.chravelBlack)
            .navigationTitle("Expense Details")
            .navigationBarTitleDisplayMode(.inline)
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

// MARK: - Split Type

enum SplitType: String, CaseIterable {
    case equal
    case percentage
    case custom
    
    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Helper

func formatCurrency(_ amount: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = "USD"
    return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
}

// MARK: - Preview

#Preview {
    NavigationStack {
        PaymentsView(tripId: "preview")
    }
    .environment(AuthViewModel())
    .preferredColorScheme(.dark)
}

=== SCREEN: PaymentsView END ===
