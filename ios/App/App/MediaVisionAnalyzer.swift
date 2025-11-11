/**
 * MediaVisionAnalyzer.swift
 * 
 * Uses iOS Vision framework for ML-powered media categorization
 * Detects objects, scenes, and text in photos
 * 
 * ENHANCEMENT: AI-powered categorization using native iOS ML
 * 
 * @module ios/MediaVisionAnalyzer
 */

import UIKit
import Vision
import CoreML

class MediaVisionAnalyzer: NSObject {
    
    static let shared = MediaVisionAnalyzer()
    
    /**
     * Analyze image and extract tags/categories
     * 
     * @param image - UIImage to analyze
     * @param completion - Completion handler with analysis results
     */
    func analyzeImage(_ image: UIImage, completion: @escaping (Result<VisionAnalysisResult, Error>) -> Void) {
        guard let cgImage = image.cgImage else {
            completion(.failure(VisionAnalyzerError.invalidImage))
            return
        }
        
        var tags: [String] = []
        var categories: [String] = []
        var detectedText: String = ""
        
        let group = DispatchGroup()
        
        // Scene classification
        group.enter()
        classifyScene(cgImage: cgImage) { sceneTags in
            tags.append(contentsOf: sceneTags)
            categories.append(contentsOf: sceneTags)
            group.leave()
        }
        
        // Object detection
        group.enter()
        detectObjects(cgImage: cgImage) { objectTags in
            tags.append(contentsOf: objectTags)
            group.leave()
        }
        
        // Text recognition
        group.enter()
        recognizeText(cgImage: cgImage) { text in
            detectedText = text
            group.leave()
        }
        
        // Determine category based on detected content
        group.notify(queue: .main) {
            let category = self.determineCategory(from: tags, text: detectedText)
            
            let result = VisionAnalysisResult(
                tags: Array(Set(tags)), // Remove duplicates
                category: category,
                detectedText: detectedText,
                confidence: 0.85
            )
            
            completion(.success(result))
        }
    }
    
    private func classifyScene(cgImage: CGImage, completion: @escaping ([String]) -> Void) {
        guard let model = try? VNClassifyImageRequest.createSceneClassificationRequest() else {
            completion([])
            return
        }
        
        let request = VNClassifyImageRequest { request, error in
            guard let observations = request.results as? [VNClassificationObservation] else {
                completion([])
                return
            }
            
            let topObservations = observations.prefix(3)
                .filter { $0.confidence > 0.3 }
                .map { $0.identifier }
            
            completion(Array(topObservations))
        }
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
    }
    
    private func detectObjects(cgImage: CGImage, completion: @escaping ([String]) -> Void) {
        let request = VNRecognizeObjectsRequest { request, error in
            guard let observations = request.results as? [VNRecognizedObjectObservation] else {
                completion([])
                return
            }
            
            var objects: [String] = []
            for observation in observations {
                if let topLabelObservation = observation.labels.first {
                    objects.append(topLabelObservation.identifier)
                }
            }
            
            completion(objects)
        }
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
    }
    
    private func recognizeText(cgImage: CGImage, completion: @escaping (String) -> Void) {
        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion("")
                return
            }
            
            let text = observations.compactMap { observation in
                observation.topCandidates(1).first?.string
            }.joined(separator: " ")
            
            completion(text)
        }
        
        request.recognitionLevel = .accurate
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
    }
    
    private func determineCategory(from tags: [String], text: String) -> String {
        let combined = (tags + [text]).joined(separator: " ").lowercased()
        
        if combined.contains("receipt") || combined.contains("invoice") || combined.contains("payment") {
            return "receipt"
        } else if combined.contains("schedule") || combined.contains("calendar") || combined.contains("itinerary") {
            return "schedule"
        } else if combined.contains("beach") || combined.contains("ocean") || combined.contains("water") {
            return "beach"
        } else if combined.contains("food") || combined.contains("restaurant") || combined.contains("dining") {
            return "food"
        } else if combined.contains("landmark") || combined.contains("monument") || combined.contains("attraction") {
            return "landmark"
        } else if combined.contains("group") || combined.contains("people") || combined.contains("team") {
            return "group"
        }
        
        return "general"
    }
}

// MARK: - Models

struct VisionAnalysisResult {
    let tags: [String]
    let category: String
    let detectedText: String
    let confidence: Double
}

enum VisionAnalyzerError: LocalizedError {
    case invalidImage
    
    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return "Invalid image provided for analysis"
        }
    }
}
