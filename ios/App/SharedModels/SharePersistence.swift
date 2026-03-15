import Foundation

/// Manages persistence of shared items in the App Group shared container.
/// Items are stored as individual JSON files for atomicity and crash safety.
enum SharePersistence {

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    // MARK: - Directory Management

    private static func ensurePendingDirectory() throws -> URL {
        guard let dir = ChravelAppGroup.pendingSharesURL else {
            throw SharePersistenceError.appGroupUnavailable
        }
        if !FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    private static func attachmentsDirectory(for itemId: String) throws -> URL {
        guard let container = ChravelAppGroup.containerURL else {
            throw SharePersistenceError.appGroupUnavailable
        }
        let dir = container.appendingPathComponent("attachments/\(itemId)", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    // MARK: - Save / Load / Delete

    static func save(_ item: SharedInboundItem) throws {
        let dir = try ensurePendingDirectory()
        let fileURL = dir.appendingPathComponent("\(item.id).json")
        let data = try encoder.encode(item)
        try data.write(to: fileURL, options: .atomic)
    }

    static func loadAll() -> [SharedInboundItem] {
        guard let dir = ChravelAppGroup.pendingSharesURL,
              FileManager.default.fileExists(atPath: dir.path) else {
            return []
        }
        do {
            let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.creationDateKey])
                .filter { $0.pathExtension == "json" }
                .sorted { ($0.lastPathComponent) < ($1.lastPathComponent) }
            return files.compactMap { url in
                guard let data = try? Data(contentsOf: url) else { return nil }
                return try? decoder.decode(SharedInboundItem.self, from: data)
            }
        } catch {
            return []
        }
    }

    static func load(id: String) -> SharedInboundItem? {
        guard let dir = ChravelAppGroup.pendingSharesURL else { return nil }
        let fileURL = dir.appendingPathComponent("\(id).json")
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? decoder.decode(SharedInboundItem.self, from: data)
    }

    static func delete(id: String) {
        if let dir = ChravelAppGroup.pendingSharesURL {
            let fileURL = dir.appendingPathComponent("\(id).json")
            try? FileManager.default.removeItem(at: fileURL)
        }
        // Clean up attachments
        if let container = ChravelAppGroup.containerURL {
            let attachDir = container.appendingPathComponent("attachments/\(id)")
            try? FileManager.default.removeItem(at: attachDir)
        }
    }

    static func deleteAll() {
        guard let dir = ChravelAppGroup.pendingSharesURL else { return }
        try? FileManager.default.removeItem(at: dir)
        if let container = ChravelAppGroup.containerURL {
            let attachDir = container.appendingPathComponent("attachments")
            try? FileManager.default.removeItem(at: attachDir)
        }
    }

    // MARK: - Attachment File Storage

    /// Save an attachment file to the shared container. Returns relative path.
    static func saveAttachmentFile(itemId: String, attachmentId: String, data: Data, fileName: String) throws -> String {
        let dir = try attachmentsDirectory(for: itemId)
        let sanitizedName = fileName.replacingOccurrences(of: "/", with: "_")
        let fileURL = dir.appendingPathComponent("\(attachmentId)_\(sanitizedName)")
        try data.write(to: fileURL, options: .atomic)
        return "attachments/\(itemId)/\(attachmentId)_\(sanitizedName)"
    }

    /// Resolve a relative path to an absolute URL in the shared container.
    static func resolveAttachmentURL(relativePath: String) -> URL? {
        guard let container = ChravelAppGroup.containerURL else { return nil }
        return container.appendingPathComponent(relativePath)
    }

    // MARK: - Dedupe

    /// Check if a matching fingerprint exists among pending items.
    static func findDuplicate(fingerprint: String) -> SharedInboundItem? {
        loadAll().first { $0.dedupeFingerprint == fingerprint }
    }

    // MARK: - Recent Trip Memory

    private static let recentTripKey = "chravel_recent_share_trip_id"
    private static let recentDestinationPrefix = "chravel_recent_destination_"

    static var lastUsedTripId: String? {
        get {
            guard let defaults = UserDefaults(suiteName: ChravelAppGroup.identifier) else { return nil }
            return defaults.string(forKey: recentTripKey)
        }
        set {
            guard let defaults = UserDefaults(suiteName: ChravelAppGroup.identifier) else { return }
            defaults.set(newValue, forKey: recentTripKey)
        }
    }

    static func lastUsedDestination(for tripId: String) -> ShareDestination? {
        guard let defaults = UserDefaults(suiteName: ChravelAppGroup.identifier) else { return nil }
        guard let raw = defaults.string(forKey: recentDestinationPrefix + tripId) else { return nil }
        return ShareDestination(rawValue: raw)
    }

    static func setLastUsedDestination(_ destination: ShareDestination, for tripId: String) {
        guard let defaults = UserDefaults(suiteName: ChravelAppGroup.identifier) else { return }
        defaults.set(destination.rawValue, forKey: recentDestinationPrefix + tripId)
    }
}

// MARK: - Errors

enum SharePersistenceError: LocalizedError {
    case appGroupUnavailable
    case encodingFailed
    case fileWriteFailed(Error)

    var errorDescription: String? {
        switch self {
        case .appGroupUnavailable:
            return "App Group container is not available. Ensure the App Group entitlement is configured."
        case .encodingFailed:
            return "Failed to encode shared item."
        case .fileWriteFailed(let error):
            return "Failed to write file: \(error.localizedDescription)"
        }
    }
}
