# iOS Offline Sync Implementation Guide

## Overview

This guide explains how to implement offline sync for Chravel on iOS using CoreData + CloudKit. The web implementation uses IndexedDB + Service Worker, while iOS uses native CoreData with CloudKit synchronization.

## Architecture

### Web (Current Implementation)
- **Storage**: IndexedDB (`idb` library)
- **Sync**: Service Worker with Background Sync API
- **Cache**: Last 30 days of messages, tasks, events
- **Queue**: Unified sync queue in IndexedDB

### iOS (Recommended Implementation)
- **Storage**: CoreData with local SQLite store
- **Sync**: CloudKit for cross-device sync
- **Cache**: Last 30 days (same as web)
- **Queue**: CoreData entities with sync status flags

## CoreData Schema

### Entities

#### `ChatMessage`
```swift
@NSManaged var id: String
@NSManaged var tripId: String
@NSManaged var content: String
@NSManaged var authorName: String
@NSManaged var createdAt: Date
@NSManaged var updatedAt: Date
@NSManaged var syncStatus: String // "pending", "synced", "failed"
@NSManaged var version: Int32
```

#### `Task`
```swift
@NSManaged var id: String
@NSManaged var tripId: String
@NSManaged var title: String
@NSManaged var description: String?
@NSManaged var dueAt: Date?
@NSManaged var completed: Bool
@NSManaged var syncStatus: String
@NSManaged var version: Int32
```

#### `CalendarEvent`
```swift
@NSManaged var id: String
@NSManaged var tripId: String
@NSManaged var title: String
@NSManaged var startTime: Date
@NSManaged var endTime: Date?
@NSManaged var location: String?
@NSManaged var syncStatus: String
@NSManaged var version: Int32
```

## Implementation Steps

### 1. Setup CoreData Stack

```swift
import CoreData
import CloudKit

class CoreDataManager {
    static let shared = CoreDataManager()
    
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "ChravelDataModel")
        
        // Enable CloudKit
        let storeDescription = container.persistentStoreDescriptions.first
        storeDescription?.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        storeDescription?.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        storeDescription?.cloudKitContainerOptions = NSPersistentCloudKitContainerOptions(
            containerIdentifier: "iCloud.com.chravel.app"
        )
        
        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("CoreData error: \(error)")
            }
        }
        
        container.viewContext.automaticallyMergesChangesFromParent = true
        return container
    }()
    
    var context: NSManagedObjectContext {
        return persistentContainer.viewContext
    }
}
```

### 2. Offline Queue Manager

```swift
class OfflineSyncManager {
    static let shared = OfflineSyncManager()
    private let context = CoreDataManager.shared.context
    
    // Queue chat message for sync
    func queueChatMessage(tripId: String, content: String, authorName: String) -> String {
        let message = ChatMessage(context: context)
        message.id = UUID().uuidString
        message.tripId = tripId
        message.content = content
        message.authorName = authorName
        message.createdAt = Date()
        message.updatedAt = Date()
        message.syncStatus = "pending"
        message.version = 1
        
        try? context.save()
        return message.id
    }
    
    // Process sync queue when online
    func processSyncQueue() async {
        guard NetworkMonitor.shared.isConnected else { return }
        
        // Process pending chat messages
        let pendingMessages = fetchPendingMessages()
        for message in pendingMessages {
            await syncChatMessage(message)
        }
        
        // Process pending tasks
        let pendingTasks = fetchPendingTasks()
        for task in pendingTasks {
            await syncTask(task)
        }
        
        // Process pending events
        let pendingEvents = fetchPendingEvents()
        for event in pendingEvents {
            await syncEvent(event)
        }
    }
    
    private func syncChatMessage(_ message: ChatMessage) async {
        // Call Supabase API
        do {
            let result = try await SupabaseClient.shared.createMessage(
                tripId: message.tripId,
                content: message.content,
                authorName: message.authorName
            )
            
            // Update local message with server ID
            message.id = result.id
            message.syncStatus = "synced"
            message.version = Int32(result.version ?? 1)
            
            try context.save()
        } catch {
            message.syncStatus = "failed"
            try? context.save()
        }
    }
}
```

### 3. Network Monitor

```swift
import Network

class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()
    
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    @Published var isConnected = false
    
    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                
                if self?.isConnected == true {
                    // Trigger sync when connection restored
                    Task {
                        await OfflineSyncManager.shared.processSyncQueue()
                    }
                }
            }
        }
        monitor.start(queue: queue)
    }
}
```

### 4. Cache Management (30-day expiry)

```swift
extension OfflineSyncManager {
    func cleanupExpiredCache() {
        let thirtyDaysAgo = Calendar.current.date(byAdding: .day, value: -30, to: Date())!
        
        // Delete old chat messages
        let fetchRequest: NSFetchRequest<ChatMessage> = ChatMessage.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "createdAt < %@", thirtyDaysAgo as NSDate)
        
        if let oldMessages = try? context.fetch(fetchRequest) {
            for message in oldMessages {
                context.delete(message)
            }
            try? context.save()
        }
        
        // Similar cleanup for tasks and events
    }
}
```

### 5. Conflict Resolution

```swift
extension OfflineSyncManager {
    func resolveConflict(local: ChatMessage, server: ChatMessage) -> ChatMessage {
        // Last-write-wins: use most recent updatedAt
        if server.updatedAt! > local.updatedAt! {
            // Server wins
            local.content = server.content
            local.version = server.version
            local.updatedAt = server.updatedAt
        }
        // Otherwise keep local (already newer)
        return local
    }
    
    func handleVersionConflict(message: ChatMessage, serverVersion: Int32) throws {
        if message.version != serverVersion {
            throw SyncError.versionConflict(
                localVersion: Int(message.version),
                serverVersion: Int(serverVersion)
            )
        }
    }
}

enum SyncError: Error {
    case versionConflict(localVersion: Int, serverVersion: Int)
    case networkError
    case authenticationError
}
```

### 6. Integration with Capacitor

```swift
import Capacitor

@objc(OfflineSyncPlugin)
public class OfflineSyncPlugin: CAPPlugin {
    
    @objc func queueMessage(_ call: CAPPluginCall) {
        guard let tripId = call.getString("tripId"),
              let content = call.getString("content"),
              let authorName = call.getString("authorName") else {
            call.reject("Missing required parameters")
            return
        }
        
        let messageId = OfflineSyncManager.shared.queueChatMessage(
            tripId: tripId,
            content: content,
            authorName: authorName
        )
        
        call.resolve(["messageId": messageId])
    }
    
    @objc func processQueue(_ call: CAPPluginCall) {
        Task {
            await OfflineSyncManager.shared.processSyncQueue()
            call.resolve()
        }
    }
    
    @objc func getQueuedOperations(_ call: CAPPluginCall) {
        let pending = OfflineSyncManager.shared.fetchPendingMessages()
        let operations = pending.map { message in
            [
                "id": message.id,
                "type": "chat_message",
                "tripId": message.tripId,
                "status": message.syncStatus
            ]
        }
        call.resolve(["operations": operations])
    }
}
```

## CloudKit Configuration

### 1. Enable CloudKit in Xcode
1. Select your app target
2. Go to "Signing & Capabilities"
3. Click "+ Capability"
4. Add "CloudKit"
5. Select your CloudKit container (e.g., `iCloud.com.chravel.app`)

### 2. CloudKit Schema
CloudKit will automatically sync CoreData entities. Ensure:
- All entities have `syncStatus` attribute
- Version field is included for conflict resolution
- Timestamps (`createdAt`, `updatedAt`) are present

## Testing Offline Sync

### 1. Simulate Offline Mode
```swift
// In Xcode Simulator: Device > Network Link Conditioner > 100% Loss
// Or use Network.framework to monitor connection
```

### 2. Test Scenarios
- Create message offline → verify queue
- Go online → verify sync
- Create conflicting updates → verify conflict resolution
- Test 30-day cache expiry

## Migration from Web to iOS

When migrating data:
1. Export IndexedDB data (JSON)
2. Import into CoreData
3. Set `syncStatus = "synced"` for existing data
4. Let CloudKit sync handle cross-device updates

## Performance Considerations

- **Batch Operations**: Process queue in batches of 10-20 items
- **Background Sync**: Use `BGTaskScheduler` for periodic sync
- **Cache Limits**: Enforce 30-day cache limit strictly
- **Memory**: Use `NSFetchedResultsController` for large lists

## Resources

- [CoreData Programming Guide](https://developer.apple.com/documentation/coredata)
- [CloudKit Documentation](https://developer.apple.com/documentation/cloudkit)
- [NSPersistentCloudKitContainer](https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer)
