/**
 * MediaPickerView.swift
 * 
 * Native iOS photo/video picker using PHPickerViewController
 * Provides access to user's photo library with proper permissions
 * 
 * ENHANCEMENT: Replaces web-based file input for better iOS integration
 * 
 * @module ios/MediaPickerView
 */

import UIKit
import PhotosUI
import Capacitor

@objc(MediaPickerView)
class MediaPickerView: NSObject, PHPickerViewControllerDelegate {
    
    static let shared = MediaPickerView()
    
    private var completionHandler: ((Result<[PHAsset], Error>) -> Void)?
    
    /**
     * Present PHPickerViewController for photo/video selection
     * 
     * @param maxSelection - Maximum number of items to select (default: 10)
     * @param mediaTypes - Types of media to allow (images, videos, or both)
     * @param completion - Completion handler with selected assets
     */
    func presentPicker(
        maxSelection: Int = 10,
        mediaTypes: [PHPickerFilter] = [.images, .videos],
        completion: @escaping (Result<[PHAsset], Error>) -> Void
    ) {
        self.completionHandler = completion
        
        // Check photo library authorization
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        
        switch status {
        case .authorized, .limited:
            showPicker(maxSelection: maxSelection, mediaTypes: mediaTypes)
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { [weak self] newStatus in
                DispatchQueue.main.async {
                    if newStatus == .authorized || newStatus == .limited {
                        self?.showPicker(maxSelection: maxSelection, mediaTypes: mediaTypes)
                    } else {
                        completion(.failure(MediaPickerError.permissionDenied))
                    }
                }
            }
        case .denied, .restricted:
            completion(.failure(MediaPickerError.permissionDenied))
        @unknown default:
            completion(.failure(MediaPickerError.unknownError))
        }
    }
    
    private func showPicker(maxSelection: Int, mediaTypes: [PHPickerFilter]) {
        guard let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
            completionHandler?(.failure(MediaPickerError.noRootViewController))
            return
        }
        
        var configuration = PHPickerConfiguration()
        configuration.selectionLimit = maxSelection
        configuration.filter = PHPickerFilter.any(of: mediaTypes)
        configuration.preferredAssetRepresentationMode = .current
        
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = self
        
        rootViewController.present(picker, animated: true)
    }
    
    // MARK: - PHPickerViewControllerDelegate
    
    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)
        
        guard !results.isEmpty else {
            completionHandler?(.success([]))
            return
        }
        
        // Convert PHPickerResult to PHAsset
        let identifiers = results.compactMap { $0.assetIdentifier }
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: identifiers, options: nil)
        
        var assets: [PHAsset] = []
        fetchResult.enumerateObjects { asset, _, _ in
            assets.append(asset)
        }
        
        completionHandler?(.success(assets))
        completionHandler = nil
    }
}

// MARK: - Errors

enum MediaPickerError: LocalizedError {
    case permissionDenied
    case noRootViewController
    case unknownError
    
    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Photo library access denied. Please enable it in Settings."
        case .noRootViewController:
            return "Unable to present picker. No root view controller found."
        case .unknownError:
            return "An unknown error occurred."
        }
    }
}

// MARK: - Capacitor Plugin Bridge

@objc(MediaPickerPlugin)
class MediaPickerPlugin: CAPPlugin {
    
    @objc func presentMediaPicker(_ call: CAPPluginCall) {
        let maxSelection = call.getInt("maxSelection") ?? 10
        let allowImages = call.getBool("allowImages") ?? true
        let allowVideos = call.getBool("allowVideos") ?? true
        
        var mediaTypes: [PHPickerFilter] = []
        if allowImages {
            mediaTypes.append(.images)
        }
        if allowVideos {
            mediaTypes.append(.videos)
        }
        
        MediaPickerView.shared.presentPicker(maxSelection: maxSelection, mediaTypes: mediaTypes) { result in
            switch result {
            case .success(let assets):
                // Convert PHAssets to JSON-serializable format
                var assetData: [[String: Any]] = []
                for asset in assets {
                    assetData.append([
                        "localIdentifier": asset.localIdentifier,
                        "mediaType": asset.mediaType.rawValue,
                        "creationDate": ISO8601DateFormatter().string(from: asset.creationDate ?? Date()),
                        "duration": asset.duration,
                    ])
                }
                call.resolve(["assets": assetData])
            case .failure(let error):
                call.reject(error.localizedDescription)
            }
        }
    }
}
