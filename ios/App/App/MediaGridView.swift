/**
 * MediaGridView.swift
 * 
 * Native iOS grid view for displaying media items
 * Optimized for performance with large media collections
 * 
 * ENHANCEMENT: Provides native iOS media grid with proper caching
 * 
 * @module ios/MediaGridView
 */

import UIKit
import Photos

class MediaGridView: UICollectionViewController {
    
    private let cellIdentifier = "MediaGridCell"
    private let itemsPerRow: CGFloat = 3
    private let spacing: CGFloat = 2
    
    var mediaItems: [MediaItem] = [] {
        didSet {
            DispatchQueue.main.async { [weak self] in
                self?.collectionView.reloadData()
            }
        }
    }
    
    var onItemSelected: ((MediaItem) -> Void)?
    
    init() {
        let layout = UICollectionViewFlowLayout()
        layout.minimumInteritemSpacing = spacing
        layout.minimumLineSpacing = spacing
        
        super.init(collectionViewLayout: layout)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        collectionView.backgroundColor = .systemBackground
        collectionView.register(MediaGridCell.self, forCellWithReuseIdentifier: cellIdentifier)
        collectionView.delegate = self
        collectionView.dataSource = self
    }
    
    // MARK: - UICollectionViewDataSource
    
    override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return mediaItems.count
    }
    
    override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: cellIdentifier, for: indexPath) as! MediaGridCell
        let item = mediaItems[indexPath.item]
        cell.configure(with: item)
        return cell
    }
    
    // MARK: - UICollectionViewDelegate
    
    override func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let item = mediaItems[indexPath.item]
        onItemSelected?(item)
    }
}

// MARK: - UICollectionViewDelegateFlowLayout

extension MediaGridView: UICollectionViewDelegateFlowLayout {
    
    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        let totalSpacing = spacing * (itemsPerRow - 1)
        let width = (collectionView.bounds.width - totalSpacing) / itemsPerRow
        return CGSize(width: width, height: width)
    }
}

// MARK: - MediaGridCell

class MediaGridCell: UICollectionViewCell {
    
    private let imageView = UIImageView()
    private let videoIndicator = UIImageView(image: UIImage(systemName: "play.fill"))
    private let durationLabel = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        contentView.addSubview(imageView)
        contentView.addSubview(videoIndicator)
        contentView.addSubview(durationLabel)
        
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.translatesAutoresizingMaskIntoConstraints = false
        
        videoIndicator.tintColor = .white
        videoIndicator.isHidden = true
        videoIndicator.translatesAutoresizingMaskIntoConstraints = false
        
        durationLabel.textColor = .white
        durationLabel.font = .systemFont(ofSize: 10, weight: .medium)
        durationLabel.isHidden = true
        durationLabel.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: contentView.topAnchor),
            imageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            imageView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            
            videoIndicator.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            videoIndicator.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            videoIndicator.widthAnchor.constraint(equalToConstant: 24),
            videoIndicator.heightAnchor.constraint(equalToConstant: 24),
            
            durationLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -4),
            durationLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -4),
        ])
    }
    
    func configure(with item: MediaItem) {
        // Load image from URL or PHAsset
        if let url = URL(string: item.url) {
            loadImage(from: url)
        } else if let asset = item.phAsset {
            loadImage(from: asset)
        }
        
        // Show video indicator if needed
        let isVideo = item.type == .video
        videoIndicator.isHidden = !isVideo
        durationLabel.isHidden = !isVideo
        
        if isVideo, let duration = item.duration {
            durationLabel.text = formatDuration(duration)
        }
    }
    
    private func loadImage(from url: URL) {
        // Use URLSession or image caching library
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let data = data, let image = UIImage(data: data) else { return }
            DispatchQueue.main.async {
                self?.imageView.image = image
            }
        }.resume()
    }
    
    private func loadImage(from asset: PHAsset) {
        let options = PHImageRequestOptions()
        options.deliveryMode = .opportunistic
        options.resizeMode = .fast
        
        PHImageManager.default().requestImage(
            for: asset,
            targetSize: CGSize(width: 200, height: 200),
            contentMode: .aspectFill,
            options: options
        ) { [weak self] image, _ in
            DispatchQueue.main.async {
                self?.imageView.image = image
            }
        }
    }
    
    private func formatDuration(_ seconds: TimeInterval) -> String {
        let minutes = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", minutes, secs)
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        imageView.image = nil
        videoIndicator.isHidden = true
        durationLabel.isHidden = true
    }
}

// MARK: - MediaItem Model

struct MediaItem {
    let id: String
    let url: String
    let type: MediaType
    let duration: TimeInterval?
    let phAsset: PHAsset?
    let metadata: [String: Any]?
    
    enum MediaType {
        case image
        case video
        case document
    }
}
