import Foundation
import CryptoKit

/// Generates fingerprints for shared content to detect duplicates.
enum DedupeEngine {

    /// Generate a fingerprint for a shared inbound item.
    static func fingerprint(for item: SharedInboundItem) -> String {
        var components: [String] = []

        // URL fingerprint: canonicalize and hash
        if let url = item.normalizedURL {
            components.append("url:" + canonicalizeURL(url))
        }

        // Text fingerprint: normalize whitespace, lowercase, truncate
        if let text = item.normalizedText {
            let normalized = text
                .lowercased()
                .components(separatedBy: .whitespacesAndNewlines)
                .filter { !$0.isEmpty }
                .joined(separator: " ")
            let truncated = String(normalized.prefix(500))
            components.append("text:" + truncated)
        }

        // Attachment fingerprints: use file name + size
        for attachment in item.attachments {
            var parts = ["attach"]
            if let name = attachment.fileName { parts.append(name.lowercased()) }
            if let size = attachment.fileSize { parts.append(String(size)) }
            if let mime = attachment.mimeType { parts.append(mime) }
            components.append(parts.joined(separator: ":"))
        }

        if components.isEmpty {
            return "empty:\(item.id)"
        }

        let combined = components.joined(separator: "|")
        let hash = SHA256.hash(data: Data(combined.utf8))
        return hash.prefix(16).map { String(format: "%02x", $0) }.joined()
    }

    /// Canonicalize a URL for deduplication (strip tracking params, normalize).
    private static func canonicalizeURL(_ urlString: String) -> String {
        guard var components = URLComponents(string: urlString) else {
            return urlString.lowercased()
        }

        // Lowercase scheme and host
        components.scheme = components.scheme?.lowercased()
        components.host = components.host?.lowercased()

        // Remove common tracking query parameters
        let trackingParams: Set<String> = [
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "fbclid", "gclid", "ref", "source", "mc_cid", "mc_eid",
            "s", "si", "_hsenc", "_hsmi"
        ]

        if let queryItems = components.queryItems {
            let filtered = queryItems.filter { !trackingParams.contains($0.name.lowercased()) }
            components.queryItems = filtered.isEmpty ? nil : filtered
        }

        // Remove trailing slash
        if components.path.hasSuffix("/") && components.path.count > 1 {
            components.path = String(components.path.dropLast())
        }

        // Remove fragment
        components.fragment = nil

        return components.string ?? urlString.lowercased()
    }

    /// Check if item is a likely duplicate of recent shares within a time window.
    static func isDuplicate(_ item: SharedInboundItem, windowSeconds: TimeInterval = 300) -> (isDuplicate: Bool, existingItem: SharedInboundItem?) {
        guard let fingerprint = item.dedupeFingerprint else { return (false, nil) }

        let pending = SharePersistence.loadAll()
        let cutoff = Date().addingTimeInterval(-windowSeconds)

        let match = pending.first { existing in
            existing.id != item.id &&
            existing.dedupeFingerprint == fingerprint &&
            existing.createdAt > cutoff
        }

        return (match != nil, match)
    }
}
