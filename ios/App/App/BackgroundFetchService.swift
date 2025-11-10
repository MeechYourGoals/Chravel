//
//  BackgroundFetchService.swift
//  Background fetch for new chat messages
//

import UIKit
import BackgroundTasks

class BackgroundFetchService {
    static let shared = BackgroundFetchService()
    private let backgroundTaskIdentifier = "com.chravel.chat.fetch"
    
    func registerBackgroundTask() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: backgroundTaskIdentifier, using: nil) { task in
            self.handleBackgroundFetch(task: task as! BGAppRefreshTask)
        }
    }
    
    func scheduleBackgroundFetch() {
        let request = BGAppRefreshTaskRequest(identifier: backgroundTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes
        
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Failed to schedule background fetch: \(error.localizedDescription)")
        }
    }
    
    private func handleBackgroundFetch(task: BGAppRefreshTask) {
        // Schedule next background fetch
        scheduleBackgroundFetch()
        
        // Fetch new messages
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }
        
        fetchNewMessages { success in
            task.setTaskCompleted(success: success)
        }
    }
    
    private func fetchNewMessages(completion: @escaping (Bool) -> Void) {
        // TODO: Implement Supabase query to fetch new messages since last fetch
        // This would check for messages newer than the last known message timestamp
        
        // Example:
        /*
        let lastMessageTimestamp = UserDefaults.standard.double(forKey: "lastMessageTimestamp")
        
        supabase
            .from("trip_chat_messages")
            .select()
            .gt("created_at", value: Date(timeIntervalSince1970: lastMessageTimestamp))
            .execute { result in
                switch result {
                case .success(let response):
                    // Process new messages
                    // Update local cache
                    // Send local notifications if needed
                    completion(true)
                case .failure:
                    completion(false)
                }
            }
        */
        
        completion(true)
    }
}
