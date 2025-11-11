//
//  PushNotificationService.swift
//  APNs integration for chat message notifications
//

import UIKit
import UserNotifications

class PushNotificationService: NSObject {
    static let shared = PushNotificationService()
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }
    
    func requestAuthorization(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Notification authorization error: \(error.localizedDescription)")
                completion(false)
                return
            }
            completion(granted)
        }
    }
    
    func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
    }
    
    func handleRemoteNotification(userInfo: [AnyHashable: Any], completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        // Handle incoming push notification for new chat message
        guard let messageData = userInfo["message"] as? [String: Any] else {
            completionHandler(.noData)
            return
        }
        
        // Process message notification
        // TODO: Parse message data and update local chat state
        // This would typically trigger a refresh of the chat view
        
        completionHandler(.newData)
    }
    
    func sendLocalNotification(for message: [String: Any]) {
        let content = UNMutableNotificationContent()
        content.title = message["author_name"] as? String ?? "New Message"
        content.body = message["content"] as? String ?? ""
        content.sound = .default
        content.badge = 1
        
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Failed to send local notification: \(error.localizedDescription)")
            }
        }
    }
}

extension PushNotificationService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.alert, .sound, .badge])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap - navigate to chat
        // TODO: Implement navigation to specific chat
        completionHandler()
    }
}
