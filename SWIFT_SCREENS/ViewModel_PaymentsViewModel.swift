// PaymentsViewModel.swift
// Chravel iOS - Payments/Budget ViewModel

import Foundation

// MARK: - Payment Message Model

struct PaymentMessage: Identifiable, Codable {
    let id: String
    let tripId: String
    let payerId: String
    var payerName: String?
    let amount: Double
    let description: String
    var category: String?
    var splitType: String?
    var splits: [PaymentSplit]?
    var isSettled: Bool
    let createdAt: Date
    var settledAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case payerId = "payer_id"
        case payerName = "payer_name"
        case amount
        case description
        case category
        case splitType = "split_type"
        case splits
        case isSettled = "is_settled"
        case createdAt = "created_at"
        case settledAt = "settled_at"
    }
}

// MARK: - Payment Split Model

struct PaymentSplit: Identifiable, Codable {
    let id: String
    let userId: String
    var userName: String?
    let amount: Double
    var percentage: Double?
    var isPaid: Bool
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case userName = "user_name"
        case amount
        case percentage
        case isPaid = "is_paid"
    }
}

// MARK: - Payment Summary

struct PaymentSummary: Codable {
    var totalSpent: Double
    var yourTotal: Double
    var yourShare: Double
    var balances: [MemberBalance]
    var settlements: [SettlementSuggestion]
    
    enum CodingKeys: String, CodingKey {
        case totalSpent = "total_spent"
        case yourTotal = "your_total"
        case yourShare = "your_share"
        case balances
        case settlements
    }
}

// MARK: - Member Balance

struct MemberBalance: Identifiable, Codable {
    let id: String
    let userId: String
    var userName: String?
    var avatarUrl: String?
    let paid: Double
    let owes: Double
    
    var balance: Double {
        paid - owes
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case userName = "user_name"
        case avatarUrl = "avatar_url"
        case paid
        case owes
    }
}

// MARK: - Settlement Suggestion

struct SettlementSuggestion: Identifiable, Codable {
    let id: String
    let fromUserId: String
    var fromUserName: String?
    let toUserId: String
    var toUserName: String?
    let amount: Double
    
    enum CodingKeys: String, CodingKey {
        case id
        case fromUserId = "from_user_id"
        case fromUserName = "from_user_name"
        case toUserId = "to_user_id"
        case toUserName = "to_user_name"
        case amount
    }
}

// MARK: - Trip Member

struct TripMember: Identifiable, Codable {
    let id: String
    let tripId: String
    let userId: String
    var role: String?
    var profile: MemberProfile?
    let joinedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case userId = "user_id"
        case role
        case profile = "profiles"
        case joinedAt = "joined_at"
    }
}

struct MemberProfile: Codable {
    let id: String
    let displayName: String
    var avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
    }
}

// MARK: - Payments ViewModel

@Observable
final class PaymentsViewModel {
    // MARK: - Properties
    
    let tripId: String
    
    var expenses: [PaymentMessage] = []
    var members: [TripMember] = []
    var summary: PaymentSummary?
    
    var isLoading: Bool = false
    var errorMessage: String?
    
    private var currentUserId: String? {
        SupabaseClient.shared.auth.currentUser?.id.uuidString
    }
    
    // MARK: - Init
    
    init(tripId: String) {
        self.tripId = tripId
    }
    
    // MARK: - Load Data
    
    @MainActor
    func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Load expenses, members, and summary in parallel
            async let expensesResult = loadExpenses()
            async let membersResult = loadMembers()
            async let summaryResult = loadSummary()
            
            let (exp, mem, sum) = try await (expensesResult, membersResult, summaryResult)
            
            expenses = exp
            members = mem
            summary = sum
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    private func loadExpenses() async throws -> [PaymentMessage] {
        let response = try await SupabaseClient.shared.database
            .from("trip_payments")
            .select("""
                *,
                profiles:payer_id(display_name),
                payment_splits(*)
            """)
            .eq("trip_id", value: tripId)
            .order("created_at", ascending: false)
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode([PaymentMessage].self, from: response.data)
    }
    
    private func loadMembers() async throws -> [TripMember] {
        let response = try await SupabaseClient.shared.database
            .from("trip_members")
            .select("""
                *,
                profiles(id, display_name, avatar_url)
            """)
            .eq("trip_id", value: tripId)
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode([TripMember].self, from: response.data)
    }
    
    private func loadSummary() async throws -> PaymentSummary {
        guard let userId = currentUserId else {
            throw PaymentError.notAuthenticated
        }
        
        // Call RPC function for optimized summary calculation
        let response = try await SupabaseClient.shared.database
            .rpc("get_trip_payment_summary", params: [
                "p_trip_id": tripId,
                "p_user_id": userId
            ])
            .execute()
        
        return try JSONDecoder.supabaseDecoder.decode(PaymentSummary.self, from: response.data)
    }
    
    // MARK: - Recalculate Summary
    
    func recalculateSummary() {
        guard let userId = currentUserId else { return }
        
        let totalSpent = expenses.reduce(0) { $0 + $1.amount }
        
        let yourTotal = expenses
            .filter { $0.payerId == userId }
            .reduce(0) { $0 + $1.amount }
        
        let yourShare = expenses.reduce(0) { total, expense in
            if let splits = expense.splits {
                let yourSplit = splits.first { $0.userId == userId }
                return total + (yourSplit?.amount ?? 0)
            } else {
                // Equal split assumed
                let memberCount = max(members.count, 1)
                return total + (expense.amount / Double(memberCount))
            }
        }
        
        // Calculate balances per member
        var balances: [MemberBalance] = []
        for member in members {
            let paid = expenses
                .filter { $0.payerId == member.userId }
                .reduce(0) { $0 + $1.amount }
            
            let owes = expenses.reduce(0) { total, expense in
                if let splits = expense.splits {
                    let split = splits.first { $0.userId == member.userId }
                    return total + (split?.amount ?? 0)
                } else {
                    return total + (expense.amount / Double(members.count))
                }
            }
            
            balances.append(MemberBalance(
                id: member.id,
                userId: member.userId,
                userName: member.profile?.displayName,
                avatarUrl: member.profile?.avatarUrl,
                paid: paid,
                owes: owes
            ))
        }
        
        // Calculate settlement suggestions
        let settlements = calculateSettlements(balances: balances)
        
        summary = PaymentSummary(
            totalSpent: totalSpent,
            yourTotal: yourTotal,
            yourShare: yourShare,
            balances: balances,
            settlements: settlements
        )
    }
    
    private func calculateSettlements(balances: [MemberBalance]) -> [SettlementSuggestion] {
        var settlements: [SettlementSuggestion] = []
        
        // Simplified greedy algorithm for settlements
        var creditors = balances.filter { $0.balance > 0.01 }.sorted { $0.balance > $1.balance }
        var debtors = balances.filter { $0.balance < -0.01 }.sorted { $0.balance < $1.balance }
        
        while !creditors.isEmpty && !debtors.isEmpty {
            var creditor = creditors.removeFirst()
            var debtor = debtors.removeFirst()
            
            let amount = min(creditor.balance, abs(debtor.balance))
            
            if amount > 0.01 {
                settlements.append(SettlementSuggestion(
                    id: UUID().uuidString,
                    fromUserId: debtor.userId,
                    fromUserName: debtor.userName,
                    toUserId: creditor.userId,
                    toUserName: creditor.userName,
                    amount: amount
                ))
            }
            
            let creditorRemaining = creditor.balance - amount
            let debtorRemaining = debtor.balance + amount
            
            if creditorRemaining > 0.01 {
                creditors.insert(MemberBalance(
                    id: creditor.id,
                    userId: creditor.userId,
                    userName: creditor.userName,
                    avatarUrl: creditor.avatarUrl,
                    paid: creditor.paid,
                    owes: creditor.owes - amount
                ), at: 0)
            }
            
            if debtorRemaining < -0.01 {
                debtors.insert(MemberBalance(
                    id: debtor.id,
                    userId: debtor.userId,
                    userName: debtor.userName,
                    avatarUrl: debtor.avatarUrl,
                    paid: debtor.paid,
                    owes: debtor.owes + amount
                ), at: 0)
            }
        }
        
        return settlements
    }
    
    // MARK: - Create Expense
    
    @MainActor
    func createExpense(
        description: String,
        amount: Double,
        category: String,
        splitType: SplitType,
        splits: [String: Double]? = nil
    ) async throws -> PaymentMessage {
        guard let userId = currentUserId else {
            throw PaymentError.notAuthenticated
        }
        
        // Call edge function for payment creation with splits
        let payload: [String: Any] = [
            "trip_id": tripId,
            "payer_id": userId,
            "description": description,
            "amount": amount,
            "category": category,
            "split_type": splitType.rawValue,
            "custom_splits": splits ?? [:]
        ]
        
        let response = try await SupabaseClient.shared.functions
            .invoke("create-payment", options: .init(body: payload))
        
        guard let data = response.data else {
            throw PaymentError.creationFailed
        }
        
        let expense = try JSONDecoder.supabaseDecoder.decode(PaymentMessage.self, from: data)
        
        // Add to local list and recalculate
        expenses.insert(expense, at: 0)
        recalculateSummary()
        
        return expense
    }
    
    // MARK: - Settle Payment
    
    @MainActor
    func settlePayment(_ settlement: SettlementSuggestion) async {
        do {
            // Record settlement as a payment
            let payload: [String: Any] = [
                "trip_id": tripId,
                "from_user_id": settlement.fromUserId,
                "to_user_id": settlement.toUserId,
                "amount": settlement.amount,
                "type": "settlement"
            ]
            
            _ = try await SupabaseClient.shared.functions
                .invoke("settle-payment", options: .init(body: payload))
            
            // Reload data
            await loadData()
            
            ChravelHaptics.success()
        } catch {
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
    }
    
    // MARK: - Delete Expense
    
    @MainActor
    func deleteExpense(_ expenseId: String) async {
        // Optimistic removal
        let removedIndex = expenses.firstIndex { $0.id == expenseId }
        let removedExpense = removedIndex.map { expenses.remove(at: $0) }
        
        do {
            try await SupabaseClient.shared.database
                .from("trip_payments")
                .delete()
                .eq("id", value: expenseId)
                .execute()
            
            recalculateSummary()
            ChravelHaptics.success()
        } catch {
            // Rollback
            if let expense = removedExpense, let index = removedIndex {
                expenses.insert(expense, at: index)
            }
            errorMessage = error.localizedDescription
            ChravelHaptics.error()
        }
    }
}

// MARK: - Payment Error

enum PaymentError: LocalizedError {
    case notAuthenticated
    case creationFailed
    case invalidAmount
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be logged in to manage payments."
        case .creationFailed:
            return "Failed to create payment. Please try again."
        case .invalidAmount:
            return "Please enter a valid amount."
        }
    }
}
