//
//  PaymentFlowViewController.swift
//  Native payment flow with Apple Pay integration
//

import UIKit
import PassKit
import Capacitor

class PaymentFlowViewController: UIViewController {
    
    // MARK: - Properties
    private var paymentRequest: PKPaymentRequest?
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        // TODO: Implement native payment UI
        // - Apple Pay button (if available)
        // - Credit card form (Stripe integration)
        // - Payment method selection
        // - Amount display and confirmation
    }
    
    // MARK: - Apple Pay
    func setupApplePay(merchantId: String, amount: Decimal, currency: String = "USD") {
        guard PKPaymentAuthorizationController.canMakePayments() else {
            print("Apple Pay not available")
            return
        }
        
        let request = PKPaymentRequest()
        request.merchantIdentifier = merchantId
        request.supportedNetworks = [.visa, .masterCard, .amex]
        request.merchantCapabilities = .capability3DS
        request.countryCode = "US"
        request.currencyCode = currency
        
        let item = PKPaymentSummaryItem(label: "Chravel Payment", amount: NSDecimalNumber(decimal: amount))
        request.paymentSummaryItems = [item]
        
        paymentRequest = request
    }
    
    func presentApplePay() {
        guard let request = paymentRequest,
              let controller = PKPaymentAuthorizationController(paymentRequest: request) else {
            return
        }
        
        controller.delegate = self
        controller.present { success in
            if !success {
                print("Failed to present Apple Pay")
            }
        }
    }
}

extension PaymentFlowViewController: PKPaymentAuthorizationControllerDelegate {
    func paymentAuthorizationController(_ controller: PKPaymentAuthorizationController, didAuthorizePayment payment: PKPayment, handler: @escaping (PKPaymentAuthorizationResult) -> Void) {
        // TODO: Process payment with backend/Stripe
        // Send payment token to server
        handler(PKPaymentAuthorizationResult(status: .success))
    }
    
    func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
        controller.dismiss()
    }
}
