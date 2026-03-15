import Foundation
import UIKit
import UniformTypeIdentifiers

/// View model for the Share Extension composer.
@MainActor
final class ShareComposerViewModel: ObservableObject {

    // MARK: - State

    enum ViewState: Equatable {
        case loading
        case ready
        case saving
        case success
        case error(String)
        case notSignedIn
        case noTrips
        case duplicate
    }

    @Published var viewState: ViewState = .loading
    @Published var item = SharedInboundItem()
    @Published var trips: [TripInfo] = []
    @Published var selectedTrip: TripInfo?
    @Published var selectedDestination: ShareDestination = .chat
    @Published var userNote: String = ""
    @Published var searchQuery: String = ""
    @Published var showDestinationPicker: Bool = false

    var filteredTrips: [TripInfo] {
        if searchQuery.isEmpty { return trips }
        let query = searchQuery.lowercased()
        return trips.filter {
            $0.title.lowercased().contains(query) ||
            ($0.location?.lowercased().contains(query) ?? false)
        }
    }

    var routingDecision: ShareRoutingDecision? { item.routingDecision }

    // MARK: - Callbacks

    private let onDismiss: () -> Void
    private let onSaved: (SharedInboundItem) -> Void
    private let extensionItems: [NSExtensionItem]

    // MARK: - Init

    init(
        extensionItems: [NSExtensionItem],
        onDismiss: @escaping () -> Void,
        onSaved: @escaping (SharedInboundItem) -> Void
    ) {
        self.extensionItems = extensionItems
        self.onDismiss = onDismiss
        self.onSaved = onSaved
    }

    // MARK: - Lifecycle

    func onAppear() {
        Task {
            await loadContent()
        }
    }

    // MARK: - Content Loading

    private func loadContent() async {
        // Check auth
        guard AuthBridge.isSignedIn else {
            viewState = .notSignedIn
            return
        }

        // Load trips
        trips = TripCache.loadCachedTrips()
        if trips.isEmpty {
            viewState = .noTrips
            return
        }

        // Pre-select last used trip or first trip
        if let lastTripId = SharePersistence.lastUsedTripId,
           let lastTrip = trips.first(where: { $0.id == lastTripId }) {
            selectedTrip = lastTrip
        } else {
            selectedTrip = trips.first
        }

        // Parse shared content from NSExtensionItems
        await parseExtensionItems()

        // Route content
        let decision = ContentRouter.route(item: item)
        item.routingDecision = decision
        selectedDestination = decision.suggestedDestination

        // Apply last-used destination override if same trip
        if let tripId = selectedTrip?.id,
           let lastDest = SharePersistence.lastUsedDestination(for: tripId) {
            // Only override if confidence is not high
            if decision.confidence < .high {
                selectedDestination = lastDest
            }
        }

        // Generate dedupe fingerprint
        item.dedupeFingerprint = DedupeEngine.fingerprint(for: item)

        // Check for duplicates
        let (isDupe, _) = DedupeEngine.isDuplicate(item)
        if isDupe {
            viewState = .duplicate
            return
        }

        viewState = .ready
    }

    private func parseExtensionItems() async {
        for extensionItem in extensionItems {
            guard let providers = extensionItem.attachments else { continue }

            // Extract attributed content text as preview
            if let attributedTitle = extensionItem.attributedContentText?.string,
               !attributedTitle.isEmpty {
                if item.normalizedText == nil {
                    item.normalizedText = attributedTitle
                }
            }

            for provider in providers {
                await processProvider(provider)
            }
        }

        // Determine content type from what was parsed
        if item.normalizedURL != nil && item.attachments.isEmpty {
            item.contentType = .url
        } else if !item.attachments.isEmpty && item.attachments.count > 1 {
            item.contentType = .multiple
        } else if let attachment = item.attachments.first {
            item.contentType = attachment.contentType
        } else if item.normalizedText != nil {
            item.contentType = .plainText
        }
    }

    private func processProvider(_ provider: NSItemProvider) async {
        // URL
        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            if let url = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL {
                // Skip file URLs that are attachments
                if !url.isFileURL {
                    item.normalizedURL = url.absoluteString
                    item.previewTitle = url.host ?? url.absoluteString
                    item.previewSubtitle = url.absoluteString
                    return
                }
            }
        }

        // Plain text
        if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                // Check if text is actually a URL
                if let url = URL(string: text), url.scheme?.hasPrefix("http") == true {
                    if item.normalizedURL == nil {
                        item.normalizedURL = text
                        item.previewTitle = url.host ?? text
                        item.previewSubtitle = text
                    }
                } else {
                    item.normalizedText = text
                    item.previewTitle = String(text.prefix(80))
                }
                return
            }
        }

        // Image
        if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            await processImageProvider(provider)
            return
        }

        // PDF
        if provider.hasItemConformingToTypeIdentifier(UTType.pdf.identifier) {
            await processFileProvider(provider, contentType: .pdf, typeIdentifier: UTType.pdf.identifier)
            return
        }

        // Generic file
        if provider.hasItemConformingToTypeIdentifier(UTType.data.identifier) {
            await processFileProvider(provider, contentType: .file, typeIdentifier: UTType.data.identifier)
            return
        }
    }

    private func processImageProvider(_ provider: NSItemProvider) async {
        do {
            let attachment = SharedContentAttachment(
                contentType: .image,
                fileName: provider.suggestedName ?? "shared_image.jpg",
                mimeType: "image/jpeg"
            )

            if let imageData = try await provider.loadItem(forTypeIdentifier: UTType.image.identifier) {
                var finalAttachment = attachment

                if let url = imageData as? URL {
                    // File URL — save to shared container
                    let data = try Data(contentsOf: url)
                    finalAttachment = SharedContentAttachment(
                        id: attachment.id,
                        contentType: .image,
                        fileName: url.lastPathComponent,
                        mimeType: mimeType(for: url),
                        fileSize: Int64(data.count)
                    )
                    let relativePath = try SharePersistence.saveAttachmentFile(
                        itemId: item.id,
                        attachmentId: finalAttachment.id,
                        data: data,
                        fileName: finalAttachment.fileName ?? "image.jpg"
                    )
                    finalAttachment.localRelativePath = relativePath

                    // Generate thumbnail
                    if data.count > 0, let uiImage = UIImage(data: data) {
                        finalAttachment.thumbnailData = generateThumbnail(image: uiImage)
                    }
                } else if let uiImage = imageData as? UIImage {
                    if let jpegData = uiImage.jpegData(compressionQuality: 0.8) {
                        finalAttachment = SharedContentAttachment(
                            id: attachment.id,
                            contentType: .image,
                            fileName: "shared_image.jpg",
                            mimeType: "image/jpeg",
                            fileSize: Int64(jpegData.count)
                        )
                        let relativePath = try SharePersistence.saveAttachmentFile(
                            itemId: item.id,
                            attachmentId: finalAttachment.id,
                            data: jpegData,
                            fileName: "shared_image.jpg"
                        )
                        finalAttachment.localRelativePath = relativePath
                        finalAttachment.thumbnailData = generateThumbnail(image: uiImage)
                    }
                }

                item.attachments.append(finalAttachment)
                item.previewTitle = item.previewTitle ?? finalAttachment.fileName
            }
        } catch {
            // Skip failed image loading
        }
    }

    private func processFileProvider(_ provider: NSItemProvider, contentType: SharedContentType, typeIdentifier: String) async {
        do {
            if let result = try await provider.loadItem(forTypeIdentifier: typeIdentifier) {
                if let url = result as? URL {
                    let data = try Data(contentsOf: url)
                    var attachment = SharedContentAttachment(
                        contentType: contentType,
                        fileName: url.lastPathComponent,
                        mimeType: mimeType(for: url),
                        fileSize: Int64(data.count)
                    )
                    let relativePath = try SharePersistence.saveAttachmentFile(
                        itemId: item.id,
                        attachmentId: attachment.id,
                        data: data,
                        fileName: url.lastPathComponent
                    )
                    attachment.localRelativePath = relativePath
                    item.attachments.append(attachment)
                    item.previewTitle = item.previewTitle ?? url.lastPathComponent
                } else if let data = result as? Data {
                    let fileName = provider.suggestedName ?? "shared_file"
                    var attachment = SharedContentAttachment(
                        contentType: contentType,
                        fileName: fileName,
                        fileSize: Int64(data.count)
                    )
                    let relativePath = try SharePersistence.saveAttachmentFile(
                        itemId: item.id,
                        attachmentId: attachment.id,
                        data: data,
                        fileName: fileName
                    )
                    attachment.localRelativePath = relativePath
                    item.attachments.append(attachment)
                    item.previewTitle = item.previewTitle ?? fileName
                }
            }
        } catch {
            // Skip failed file loading
        }
    }

    // MARK: - Actions

    func selectTrip(_ trip: TripInfo) {
        selectedTrip = trip

        // Check if trip has a last-used destination
        if let lastDest = SharePersistence.lastUsedDestination(for: trip.id),
           let decision = item.routingDecision,
           decision.confidence < .high {
            selectedDestination = lastDest
        }
    }

    func save() {
        guard let trip = selectedTrip else { return }

        viewState = .saving

        // Update item with selections
        item.selectedTripId = trip.id
        item.selectedDestination = selectedDestination
        item.userNote = userNote.isEmpty ? nil : userNote
        item.ingestionStatus = .queued

        // Persist to shared container
        do {
            try SharePersistence.save(item)

            // Remember selections
            SharePersistence.lastUsedTripId = trip.id
            SharePersistence.setLastUsedDestination(selectedDestination, for: trip.id)

            viewState = .success
        } catch {
            viewState = .error("Failed to save: \(error.localizedDescription)")
        }
    }

    func dismiss() {
        onDismiss()
    }

    func openInChravel() {
        onSaved(item)
    }

    func saveAnyway() {
        // User explicitly wants to save despite duplicate
        viewState = .ready
    }

    // MARK: - Helpers

    private func mimeType(for url: URL) -> String {
        let ext = url.pathExtension.lowercased()
        switch ext {
        case "jpg", "jpeg": return "image/jpeg"
        case "png": return "image/png"
        case "gif": return "image/gif"
        case "webp": return "image/webp"
        case "pdf": return "application/pdf"
        case "ics": return "text/calendar"
        case "doc", "docx": return "application/msword"
        case "xls", "xlsx": return "application/vnd.ms-excel"
        default: return "application/octet-stream"
        }
    }

    private func generateThumbnail(image: UIImage, maxSize: CGFloat = 120) -> String? {
        let scale = min(maxSize / image.size.width, maxSize / image.size.height, 1.0)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let thumbnail = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let thumbData = thumbnail?.jpegData(compressionQuality: 0.6) else { return nil }
        guard thumbData.count < 65536 else { return nil } // 64KB limit
        return thumbData.base64EncodedString()
    }
}
