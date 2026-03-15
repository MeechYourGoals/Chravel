import Foundation

/// Routes shared content to the most appropriate Chravel destination.
enum ContentRouter {

    /// Analyze content and produce a routing decision.
    static func route(item: SharedInboundItem) -> ShareRoutingDecision {
        // Priority 1: URL content
        if let url = item.normalizedURL, !url.isEmpty {
            return routeURL(url, text: item.normalizedText)
        }

        // Priority 2: File attachments
        if let firstAttachment = item.attachments.first {
            return routeAttachment(firstAttachment, item: item)
        }

        // Priority 3: Text content
        if let text = item.normalizedText, !text.isEmpty {
            return routeText(text)
        }

        // Fallback: Concierge handles unknown content
        return ShareRoutingDecision(
            suggestedDestination: .concierge,
            confidence: .low,
            reason: "Unknown content type — Concierge will analyze",
            alternativeDestinations: [.chat, .exploreLinks]
        )
    }

    // MARK: - URL Routing

    private static func routeURL(_ url: String, text: String?) -> ShareRoutingDecision {
        let lowercasedURL = url.lowercased()

        // Calendar/event URLs
        let calendarPatterns = ["calendar", "eventbrite", "meetup.com/events", ".ics", "outlook.com/calendar"]
        if calendarPatterns.contains(where: { lowercasedURL.contains($0) }) {
            return ShareRoutingDecision(
                suggestedDestination: .calendar,
                confidence: .medium,
                reason: "URL appears to be a calendar/event link",
                alternativeDestinations: [.exploreLinks, .concierge]
            )
        }

        // Map/place URLs
        let mapPatterns = ["maps.google", "maps.apple", "goo.gl/maps", "yelp.com", "tripadvisor",
                          "opentable", "resy.com", "booking.com", "airbnb.com", "hotels.com"]
        if mapPatterns.contains(where: { lowercasedURL.contains($0) }) {
            return ShareRoutingDecision(
                suggestedDestination: .exploreLinks,
                confidence: .high,
                reason: "URL is a venue/place/booking link",
                alternativeDestinations: [.concierge, .chat]
            )
        }

        // Default: any URL goes to Explore Links
        return ShareRoutingDecision(
            suggestedDestination: .exploreLinks,
            confidence: .high,
            reason: "Web link shared",
            alternativeDestinations: [.chat, .concierge]
        )
    }

    // MARK: - Attachment Routing

    private static func routeAttachment(_ attachment: SharedContentAttachment, item: SharedInboundItem) -> ShareRoutingDecision {
        switch attachment.contentType {
        case .image:
            return ShareRoutingDecision(
                suggestedDestination: .concierge,
                confidence: .medium,
                reason: "Image shared — Concierge can extract information",
                alternativeDestinations: [.chat, .exploreLinks]
            )

        case .pdf:
            return ShareRoutingDecision(
                suggestedDestination: .concierge,
                confidence: .high,
                reason: "PDF/document shared — Concierge will parse",
                alternativeDestinations: [.chat, .tasks]
            )

        case .file:
            let fileName = (attachment.fileName ?? "").lowercased()
            if fileName.hasSuffix(".ics") || fileName.hasSuffix(".ical") {
                return ShareRoutingDecision(
                    suggestedDestination: .calendar,
                    confidence: .high,
                    reason: "Calendar file detected",
                    alternativeDestinations: [.concierge]
                )
            }
            return ShareRoutingDecision(
                suggestedDestination: .concierge,
                confidence: .medium,
                reason: "File shared — Concierge will process",
                alternativeDestinations: [.chat, .exploreLinks]
            )

        default:
            return ShareRoutingDecision(
                suggestedDestination: .concierge,
                confidence: .low,
                reason: "Unknown attachment type",
                alternativeDestinations: [.chat]
            )
        }
    }

    // MARK: - Text Routing

    private static func routeText(_ text: String) -> ShareRoutingDecision {
        let lowered = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Task-like language
        let taskPatterns = ["todo:", "to do:", "task:", "remind me", "don't forget", "need to",
                           "buy ", "book ", "reserve ", "pick up", "call ", "schedule "]
        if taskPatterns.contains(where: { lowered.hasPrefix($0) || lowered.contains($0) }) {
            return ShareRoutingDecision(
                suggestedDestination: .tasks,
                confidence: .medium,
                reason: "Text contains task-like language",
                alternativeDestinations: [.chat, .concierge]
            )
        }

        // Calendar-like language
        let calendarPatterns = ["meeting at", "dinner at", "flight at", "check-in", "checkout",
                               "reservation for", "booked for", "arriving at", "departing"]
        if calendarPatterns.contains(where: { lowered.contains($0) }) {
            return ShareRoutingDecision(
                suggestedDestination: .calendar,
                confidence: .medium,
                reason: "Text contains event/schedule language",
                alternativeDestinations: [.concierge, .chat]
            )
        }

        // Short text -> Chat; Long text -> Concierge
        if text.count < 280 {
            return ShareRoutingDecision(
                suggestedDestination: .chat,
                confidence: .medium,
                reason: "Short text — suitable for chat message",
                alternativeDestinations: [.tasks, .concierge]
            )
        }

        return ShareRoutingDecision(
            suggestedDestination: .concierge,
            confidence: .medium,
            reason: "Long text — Concierge can extract structured data",
            alternativeDestinations: [.chat, .tasks]
        )
    }
}
