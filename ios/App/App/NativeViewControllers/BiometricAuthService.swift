//
//  BiometricAuthService.swift
//  Face ID / Touch ID authentication service
//

import UIKit
import LocalAuthentication

class BiometricAuthService {
    static let shared = BiometricAuthService()
    
    private init() {}
    
    enum BiometricType {
        case none
        case touchID
        case faceID
        case opticID
    }
    
    var availableBiometricType: BiometricType {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        
        if #available(iOS 11.0, *) {
            switch context.biometryType {
            case .none:
                return .none
            case .touchID:
                return .touchID
            case .faceID:
                return .faceID
            case .opticID:
                if #available(iOS 17.0, *) {
                    return .opticID
                }
                return .none
            @unknown default:
                return .none
            }
        }
        
        return .touchID
    }
    
    func authenticate(reason: String, completion: @escaping (Bool, Error?) -> Void) {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(false, error)
            return
        }
        
        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        ) { success, error in
            DispatchQueue.main.async {
                completion(success, error)
            }
        }
    }
    
    func isBiometricEnabled() -> Bool {
        return UserDefaults.standard.bool(forKey: "biometricAuthEnabled")
    }
    
    func setBiometricEnabled(_ enabled: Bool) {
        UserDefaults.standard.set(enabled, forKey: "biometricAuthEnabled")
    }
}
