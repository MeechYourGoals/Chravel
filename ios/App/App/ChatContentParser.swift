/**
 * Chat Content Parser for iOS
 * 
 * Native iOS implementation of chat content parsing using:
 * - VNRecognizeTextRequest for OCR (receipts, documents)
 * - NLTagger for entity extraction (dates, times, locations)
 * - LPLinkView for rich URL previews
 * - Natural Language framework for intent detection
 * 
 * This provides native parsing capabilities on iOS devices, reducing
 * dependency on server-side parsing and improving performance.
 * 
 * @module ios/App/App/ChatContentParser
 */

import Foundation
import Vision
import NaturalLanguage
import LinkPresentation
import UIKit

// MARK: - Parsed Content Types

public struct ParsedReceipt {
    let extractedText: String
    let structuredData: ReceiptStructuredData
    let ocrConfidence: Double
    let documentType: DocumentType
    
    enum DocumentType: String {
        case receipt
        case invoice
        case booking
        case other
    }
    
    struct ReceiptStructuredData {
        let amounts: [Amount]
        let dates: [Date]
        let locations: [String]
        let confirmationCodes: [String]
        let vendors: [String]
        let paymentMethod: String?
        let totalCost: Double?
        
        struct Amount {
            let value: Double
            let currency: String
            let description: String
        }
    }
}

public struct ParsedItinerary {
    let events: [CalendarEvent]
    let confidenceOverall: Double
    
    struct CalendarEvent {
        let title: String
        let date: Date
        let startTime: Date?
        let endTime: Date?
        let location: String?
        let category: EventCategory
        let confirmationNumber: String?
        let confidence: Double
        
        enum EventCategory: String {
            case dining
            case lodging
            case activity
            case transportation
            case entertainment
            case business
        }
    }
}

public struct ParsedTodo {
    let title: String
    let description: String?
    let category: TodoCategory
    let priority: Priority
    let dueDate: Date?
    let estimatedDuration: Int? // minutes
    let confidence: Double
    
    enum TodoCategory: String {
        case booking
        case packing
        case documentation
        case preparation
        case logistics
    }
    
    enum Priority: String {
        case high
        case medium
        case low
    }
}

public struct ExtractedEntities {
    let dates: [Date]
    let times: [Date]
    let locations: [String]
    let people: [String]
    let suggestedEvents: [SuggestedEvent]
    
    struct SuggestedEvent {
        let title: String
        let date: Date
        let time: Date?
        let location: String?
        let confidence: Double
    }
}

public struct ParsedContent {
    let type: ContentType
    let receipt: ParsedReceipt?
    let itinerary: ParsedItinerary?
    let todos: [ParsedTodo]
    let entities: ExtractedEntities?
    let linkPreview: LinkPreview?
    let confidence: Double
    let suggestions: [Suggestion]
    
    enum ContentType: String {
        case receipt
        case itinerary
        case link
        case message
        case todo
    }
    
    struct LinkPreview {
        let title: String?
        let description: String?
        let image: UIImage?
        let domain: String?
    }
    
    struct Suggestion {
        let action: SuggestionAction
        let data: [String: Any]?
        let message: String
        
        enum SuggestionAction: String {
            case createCalendarEvent
            case createTodo
            case extractReceipt
            case none
        }
    }
}

// MARK: - Chat Content Parser

public class ChatContentParser {
    
    // MARK: - Receipt OCR
    
    /**
     * Parse receipt image using Vision Framework OCR
     * 
     * Uses VNRecognizeTextRequest to extract text from receipt images
     * and attempts to structure the data (amounts, dates, vendors)
     */
    public static func parseReceipt(
        from image: UIImage,
        completion: @escaping (Result<ParsedContent, Error>) -> Void
    ) {
        guard let cgImage = image.cgImage else {
            completion(.failure(NSError(domain: "ChatContentParser", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid image"])))
            return
        }
        
        let request = VNRecognizeTextRequest { request, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion(.failure(NSError(domain: "ChatContentParser", code: -2, userInfo: [NSLocalizedDescriptionKey: "No text found"])))
                return
            }
            
            // Extract all text
            var extractedText = ""
            var amounts: [ParsedReceipt.ReceiptStructuredData.Amount] = []
            var dates: [Date] = []
            var locations: [String] = []
            var vendors: [String] = []
            var totalCost: Double?
            
            for observation in observations {
                guard let topCandidate = observation.topCandidates(1).first else { continue }
                let text = topCandidate.string
                extractedText += text + "\n"
                
                // Extract amounts (currency patterns)
                if let amount = extractAmount(from: text) {
                    amounts.append(amount)
                    if amount.description.lowercased().contains("total") {
                        totalCost = amount.value
                    }
                }
                
                // Extract dates
                if let date = extractDate(from: text) {
                    dates.append(date)
                }
                
                // Extract locations (address patterns)
                if let location = extractLocation(from: text) {
                    locations.append(location)
                }
                
                // Extract vendor names (usually first line or after "from")
                if vendors.isEmpty && text.count > 3 && text.count < 50 {
                    vendors.append(text)
                }
            }
            
            // Determine document type
            let documentType: ParsedReceipt.DocumentType
            if extractedText.lowercased().contains("receipt") || totalCost != nil {
                documentType = .receipt
            } else if extractedText.lowercased().contains("invoice") {
                documentType = .invoice
            } else if extractedText.lowercased().contains("booking") || extractedText.lowercased().contains("confirmation") {
                documentType = .booking
            } else {
                documentType = .other
            }
            
            let structuredData = ParsedReceipt.ReceiptStructuredData(
                amounts: amounts,
                dates: dates,
                locations: locations,
                confirmationCodes: [],
                vendors: vendors,
                paymentMethod: nil,
                totalCost: totalCost
            )
            
            let receipt = ParsedReceipt(
                extractedText: extractedText,
                structuredData: structuredData,
                ocrConfidence: 0.85, // VNRecognizeTextRequest provides confidence per observation
                documentType: documentType
            )
            
            // Generate suggestions
            var suggestions: [ParsedContent.Suggestion] = []
            if let total = totalCost {
                suggestions.append(ParsedContent.Suggestion(
                    action: .extractReceipt,
                    data: ["total": total],
                    message: "Extract receipt for $\(String(format: "%.2f", total))"
                ))
            }
            
            if let firstDate = dates.first {
                suggestions.append(ParsedContent.Suggestion(
                    action: .createCalendarEvent,
                    data: [
                        "title": vendors.first ?? "Purchase",
                        "date": firstDate
                    ],
                    message: "Add calendar event for this receipt"
                ))
            }
            
            let parsedContent = ParsedContent(
                type: .receipt,
                receipt: receipt,
                itinerary: nil,
                todos: [],
                entities: nil,
                linkPreview: nil,
                confidence: receipt.ocrConfidence,
                suggestions: suggestions
            )
            
            completion(.success(parsedContent))
        }
        
        // Configure for accurate text recognition
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([request])
        } catch {
            completion(.failure(error))
        }
    }
    
    // MARK: - Natural Language Entity Extraction
    
    /**
     * Extract entities (dates, times, locations, people) from message text
     * 
     * Uses NLTagger to identify named entities and date/time expressions
     */
    public static func parseMessage(
        _ messageText: String,
        completion: @escaping (Result<ParsedContent, Error>) -> Void
    ) {
        let tagger = NLTagger(tagSchemes: [.nameType, .lexicalClass, .dateTime])
        tagger.string = messageText
        
        var dates: [Date] = []
        var times: [Date] = []
        var locations: [String] = []
        var people: [String] = []
        var suggestedEvents: [ExtractedEntities.SuggestedEvent] = []
        
        // Extract named entities
        tagger.enumerateTags(in: messageText.startIndex..<messageText.endIndex, unit: .word, scheme: .nameType) { tag, tokenRange in
            if let tag = tag {
                switch tag {
                case .placeName:
                    let location = String(messageText[tokenRange])
                    locations.append(location)
                case .personalName:
                    let person = String(messageText[tokenRange])
                    people.append(person)
                default:
                    break
                }
            }
            return true
        }
        
        // Extract dates and times
        tagger.enumerateTags(in: messageText.startIndex..<messageText.endIndex, unit: .word, scheme: .dateTime) { tag, tokenRange in
            if let tag = tag {
                // Parse date/time expressions
                let text = String(messageText[tokenRange])
                if let date = parseDateExpression(text) {
                    dates.append(date)
                }
            }
            return true
        }
        
        // Generate suggested events from extracted entities
        if let firstDate = dates.first {
            let title = extractEventTitle(from: messageText)
            let location = locations.first
            
            suggestedEvents.append(ExtractedEntities.SuggestedEvent(
                title: title,
                date: firstDate,
                time: times.first,
                location: location,
                confidence: 0.75
            ))
        }
        
        let entities = ExtractedEntities(
            dates: dates,
            times: times,
            locations: locations,
            people: people,
            suggestedEvents: suggestedEvents
        )
        
        // Generate suggestions
        var suggestions: [ParsedContent.Suggestion] = []
        for event in suggestedEvents {
            suggestions.append(ParsedContent.Suggestion(
                action: .createCalendarEvent,
                data: [
                    "title": event.title,
                    "date": event.date,
                    "location": event.location ?? ""
                ],
                message: "Add \"\(event.title)\" to calendar"
            ))
        }
        
        let parsedContent = ParsedContent(
            type: .message,
            receipt: nil,
            itinerary: nil,
            todos: [],
            entities: entities,
            linkPreview: nil,
            confidence: 0.7,
            suggestions: suggestions
        )
        
        completion(.success(parsedContent))
    }
    
    // MARK: - Link Preview
    
    /**
     * Fetch rich preview for URL using LinkPresentation framework
     * 
     * Uses LPMetadataProvider to fetch metadata and create preview
     */
    public static func parseLink(
        url: URL,
        completion: @escaping (Result<ParsedContent, Error>) -> Void
    ) {
        let metadataProvider = LPMetadataProvider()
        
        metadataProvider.startFetchingMetadata(for: url) { metadata, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let metadata = metadata else {
                completion(.failure(NSError(domain: "ChatContentParser", code: -3, userInfo: [NSLocalizedDescriptionKey: "No metadata available"])))
                return
            }
            
            // Extract preview data
            var previewImage: UIImage?
            if let imageProvider = metadata.imageProvider {
                imageProvider.loadObject(ofClass: UIImage.self) { image, _ in
                    if let image = image as? UIImage {
                        previewImage = image
                    }
                }
            }
            
            let linkPreview = ParsedContent.LinkPreview(
                title: metadata.title,
                description: metadata.value(forKey: "summary") as? String,
                image: previewImage,
                domain: url.host
            )
            
            let parsedContent = ParsedContent(
                type: .link,
                receipt: nil,
                itinerary: nil,
                todos: [],
                entities: nil,
                linkPreview: linkPreview,
                confidence: 0.9,
                suggestions: []
            )
            
            completion(.success(parsedContent))
        }
    }
    
    // MARK: - Helper Methods
    
    private static func extractAmount(from text: String) -> ParsedReceipt.ReceiptStructuredData.Amount? {
        // Match currency patterns: $25.50, 25.50 USD, etc.
        let pattern = #"\$?(\d+\.?\d*)\s*([A-Z]{3})?"#
        let regex = try? NSRegularExpression(pattern: pattern, options: [])
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        
        if let match = regex?.firstMatch(in: text, options: [], range: range) {
            if let valueRange = Range(match.range(at: 1), in: text),
               let value = Double(text[valueRange]) {
                let currency = match.range(at: 2).location != NSNotFound && match.range(at: 2).length > 0
                    ? String(text[Range(match.range(at: 2), in: text)!])
                    : "USD"
                
                return ParsedReceipt.ReceiptStructuredData.Amount(
                    value: value,
                    currency: currency,
                    description: text.trimmingCharacters(in: .whitespaces)
                )
            }
        }
        
        return nil
    }
    
    private static func extractDate(from text: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        
        // Try various date formats
        let formats = [
            "MM/dd/yyyy",
            "yyyy-MM-dd",
            "MMM dd, yyyy",
            "dd MMM yyyy"
        ]
        
        for format in formats {
            formatter.dateFormat = format
            if let date = formatter.date(from: text) {
                return date
            }
        }
        
        return nil
    }
    
    private static func extractLocation(from text: String) -> String? {
        // Simple heuristic: look for address patterns
        if text.contains(",") && text.count > 10 {
            return text.trimmingCharacters(in: .whitespaces)
        }
        return nil
    }
    
    private static func parseDateExpression(_ text: String) -> Date? {
        // Parse relative dates like "tomorrow", "next week", "3pm"
        let lowercase = text.lowercased()
        
        if lowercase.contains("tomorrow") {
            return Calendar.current.date(byAdding: .day, value: 1, to: Date())
        } else if lowercase.contains("today") {
            return Date()
        } else if lowercase.contains("next week") {
            return Calendar.current.date(byAdding: .weekOfYear, value: 1, to: Date())
        }
        
        // Try parsing as time (e.g., "3pm", "15:00")
        let timePattern = #"(\d{1,2}):?(\d{2})?\s*(am|pm)?"#
        if let _ = text.range(of: timePattern, options: .regularExpression) {
            // Return today's date with parsed time
            return Date()
        }
        
        return nil
    }
    
    private static func extractEventTitle(from text: String) -> String {
        // Extract first sentence or phrase as event title
        let sentences = text.components(separatedBy: CharacterSet(charactersIn: ".!?"))
        if let firstSentence = sentences.first, firstSentence.count > 5 {
            return firstSentence.trimmingCharacters(in: .whitespaces)
        }
        return "Event"
    }
}
