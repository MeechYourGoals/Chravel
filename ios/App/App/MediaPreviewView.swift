/**
 * MediaPreviewView.swift
 * 
 * Native iOS document preview using QuickLook
 * Supports PDFs, images, and other document types
 * 
 * ENHANCEMENT: Native document preview for better iOS experience
 * 
 * @module ios/MediaPreviewView
 */

import UIKit
import QuickLook

class MediaPreviewView: NSObject, QLPreviewingController {
    
    static let shared = MediaPreviewView()
    
    /**
     * Present document preview for a given URL
     * 
     * @param url - Document URL (local or remote)
     * @param presentingViewController - View controller to present from
     */
    func previewDocument(url: URL, from presentingViewController: UIViewController) {
        // Download if remote URL
        if url.scheme == "http" || url.scheme == "https" {
            downloadAndPreview(url: url, from: presentingViewController)
        } else {
            // Local file - preview directly
            let previewController = QLPreviewController()
            previewController.dataSource = self
            previewController.currentPreviewItemIndex = 0
            
            // Store URL for preview
            previewedURL = url
            
            presentingViewController.present(previewController, animated: true)
        }
    }
    
    private var previewedURL: URL?
    private var downloadedURL: URL?
    
    private func downloadAndPreview(url: URL, from presentingViewController: UIViewController) {
        let activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.center = presentingViewController.view.center
        activityIndicator.startAnimating()
        presentingViewController.view.addSubview(activityIndicator)
        
        URLSession.shared.downloadTask(with: url) { [weak self] localURL, _, error in
            DispatchQueue.main.async {
                activityIndicator.stopAnimating()
                activityIndicator.removeFromSuperview()
                
                guard let localURL = localURL, error == nil else {
                    self?.showError(error: error, from: presentingViewController)
                    return
                }
                
                // Move to temp directory
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(url.lastPathComponent)
                try? FileManager.default.removeItem(at: tempURL)
                try? FileManager.default.moveItem(at: localURL, to: tempURL)
                
                self?.downloadedURL = tempURL
                self?.previewDocument(url: tempURL, from: presentingViewController)
            }
        }.resume()
    }
    
    private func showError(error: Error?, from presentingViewController: UIViewController) {
        let alert = UIAlertController(
            title: "Preview Error",
            message: error?.localizedDescription ?? "Unable to preview document",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        presentingViewController.present(alert, animated: true)
    }
}

// MARK: - QLPreviewControllerDataSource

extension MediaPreviewView: QLPreviewControllerDataSource {
    
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        return previewedURL != nil ? 1 : 0
    }
    
    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        return previewedURL! as QLPreviewItem
    }
}
