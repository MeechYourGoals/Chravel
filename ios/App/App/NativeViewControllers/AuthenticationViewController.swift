//
//  AuthenticationViewController.swift
//  Native authentication UI for better UX than web view
//

import UIKit
import LocalAuthentication
import Capacitor

class AuthenticationViewController: UIViewController {
    
    // MARK: - Properties
    private var webView: WKWebView?
    private let biometricAuth = BiometricAuthService.shared
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        // For now, this is a placeholder that can be enhanced with native SwiftUI/UIKit
        // The actual authentication flow can be handled via Capacitor bridge to web view
        // or fully native implementation can be added here
        
        // TODO: Implement native login/signup UI
        // - Email/password fields
        // - Social auth buttons (Apple Sign In, Google)
        // - Biometric authentication option
        // - Link to web view for complex flows
    }
    
    // MARK: - Actions
    func authenticateWithBiometrics(completion: @escaping (Bool, Error?) -> Void) {
        biometricAuth.authenticate(reason: "Sign in to Chravel") { success, error in
            completion(success, error)
        }
    }
}
