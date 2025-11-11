/**
 * MediaPlayerView.swift
 * 
 * Native iOS video player using AVPlayerViewController
 * Provides full-screen video playback with controls
 * 
 * ENHANCEMENT: Native video playback for better iOS experience
 * 
 * @module ios/MediaPlayerView
 */

import UIKit
import AVKit
import AVFoundation
import Photos

class MediaPlayerView: NSObject {
    
    static let shared = MediaPlayerView()
    
    /**
     * Present video player for a given URL
     * 
     * @param url - Video URL (local or remote)
     * @param presentingViewController - View controller to present from
     */
    func playVideo(url: URL, from presentingViewController: UIViewController) {
        let player = AVPlayer(url: url)
        let playerViewController = AVPlayerViewController()
        playerViewController.player = player
        
        presentingViewController.present(playerViewController, animated: true) {
            player.play()
        }
    }
    
    /**
     * Play video from PHAsset
     * 
     * @param asset - PHAsset representing video
     * @param presentingViewController - View controller to present from
     */
    func playVideo(asset: PHAsset, from presentingViewController: UIViewController) {
        let options = PHVideoRequestOptions()
        options.deliveryMode = .automatic
        
        PHImageManager.default().requestAVAsset(forVideo: asset, options: options) { [weak self] avAsset, _, _ in
            guard let avAsset = avAsset else { return }
            
            DispatchQueue.main.async {
                let playerItem = AVPlayerItem(asset: avAsset)
                let player = AVPlayer(playerItem: playerItem)
                let playerViewController = AVPlayerViewController()
                playerViewController.player = player
                
                presentingViewController.present(playerViewController, animated: true) {
                    player.play()
                }
            }
        }
    }
}
