//
//  ChatViewController.swift
//  Chravel iOS Native Chat Implementation
//
//  Native chat UI using MessageKit for production-ready iOS chat experience
//

import UIKit
import MessageKit
import InputBarAccessoryView
import AVFoundation
import Photos

struct ChatMessage: MessageType {
    var messageId: String
    var sender: SenderType
    var sentDate: Date
    var kind: MessageKind
    var content: String
    var mediaURL: String?
    var isBroadcast: Bool = false
}

struct ChatSender: SenderType {
    var senderId: String
    var displayName: String
}

class ChatViewController: MessagesViewController {
    
    // MARK: - Properties
    private var messages: [ChatMessage] = []
    private var currentSender: ChatSender!
    private var tripId: String
    private var chatService: ChatMessageService
    private var voiceRecorder: VoiceMessageRecorder?
    private var isRecordingVoice = false
    
    // MARK: - Initialization
    init(tripId: String, currentUserId: String, currentUserName: String) {
        self.tripId = tripId
        self.currentSender = ChatSender(senderId: currentUserId, displayName: currentUserName)
        self.chatService = ChatMessageService(tripId: tripId)
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        setupMessageInputBar()
        loadMessages()
        setupRealtimeSubscription()
        
        // Keyboard handling
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
        chatService.cleanup()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        title = "Trip Chat"
        navigationItem.largeTitleDisplayMode = .never
        
        messagesCollectionView.messagesDataSource = self
        messagesCollectionView.messagesLayoutDelegate = self
        messagesCollectionView.messagesDisplayDelegate = self
        
        // Customize message bubble appearance
        let layout = messagesCollectionView.collectionViewLayout as? MessagesCollectionViewFlowLayout
        layout?.setMessageIncomingAvatarSize(CGSize(width: 30, height: 30))
        layout?.setMessageOutgoingAvatarSize(CGSize(width: 30, height: 30))
    }
    
    private func setupMessageInputBar() {
        messageInputBar.delegate = self
        messageInputBar.inputTextView.placeholder = "Type a message..."
        
        // Add voice message button
        let voiceButton = InputBarButtonItem()
        voiceButton.setSize(CGSize(width: 30, height: 30), animated: false)
        voiceButton.image = UIImage(systemName: "mic.fill")
        voiceButton.onTouchUpInside { [weak self] _ in
            self?.handleVoiceMessage()
        }
        messageInputBar.setLeftStackViewWidthConstant(to: 36, animated: false)
        messageInputBar.setStackViewItems([voiceButton], forStack: .left, animated: false)
        
        // Add media button
        let mediaButton = InputBarButtonItem()
        mediaButton.setSize(CGSize(width: 30, height: 30), animated: false)
        mediaButton.image = UIImage(systemName: "photo")
        mediaButton.onTouchUpInside { [weak self] _ in
            self?.handleMediaSelection()
        }
        messageInputBar.setRightStackViewWidthConstant(to: 36, animated: false)
        messageInputBar.setStackViewItems([mediaButton], forStack: .right, animated: false)
    }
    
    // MARK: - Message Loading
    private func loadMessages() {
        chatService.fetchMessages { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let fetchedMessages):
                    self?.messages = fetchedMessages
                    self?.messagesCollectionView.reloadData()
                    self?.messagesCollectionView.scrollToLastItem(animated: false)
                case .failure(let error):
                    print("Failed to load messages: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func setupRealtimeSubscription() {
        chatService.subscribeToNewMessages { [weak self] newMessage in
            DispatchQueue.main.async {
                self?.messages.append(newMessage)
                self?.messagesCollectionView.reloadData()
                self?.messagesCollectionView.scrollToLastItem(animated: true)
            }
        }
    }
    
    // MARK: - Actions
    private func handleVoiceMessage() {
        if isRecordingVoice {
            stopVoiceRecording()
        } else {
            startVoiceRecording()
        }
    }
    
    private func startVoiceRecording() {
        voiceRecorder = VoiceMessageRecorder()
        voiceRecorder?.startRecording { [weak self] success in
            if success {
                self?.isRecordingVoice = true
                DispatchQueue.main.async {
                    self?.messageInputBar.leftStackViewItems.first?.image = UIImage(systemName: "stop.fill")
                }
            }
        }
    }
    
    private func stopVoiceRecording() {
        voiceRecorder?.stopRecording { [weak self] audioURL in
            self?.isRecordingVoice = false
            DispatchQueue.main.async {
                self?.messageInputBar.leftStackViewItems.first?.image = UIImage(systemName: "mic.fill")
            }
            
            if let audioURL = audioURL {
                self?.sendVoiceMessage(audioURL: audioURL)
            }
        }
    }
    
    private func sendVoiceMessage(audioURL: URL) {
        chatService.sendVoiceMessage(audioURL: audioURL, sender: currentSender) { [weak self] result in
            switch result {
            case .success(let message):
                DispatchQueue.main.async {
                    self?.messages.append(message)
                    self?.messagesCollectionView.reloadData()
                    self?.messagesCollectionView.scrollToLastItem(animated: true)
                }
            case .failure(let error):
                print("Failed to send voice message: \(error.localizedDescription)")
            }
        }
    }
    
    private func handleMediaSelection() {
        let imagePicker = UIImagePickerController()
        imagePicker.delegate = self
        imagePicker.sourceType = .photoLibrary
        imagePicker.mediaTypes = ["public.image", "public.movie"]
        present(imagePicker, animated: true)
    }
    
    // MARK: - Keyboard Handling
    @objc private func keyboardWillShow(_ notification: Notification) {
        guard let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else {
            return
        }
        let keyboardHeight = keyboardFrame.height
        messagesCollectionView.contentInset.bottom = keyboardHeight
        messagesCollectionView.scrollIndicatorInsets.bottom = keyboardHeight
    }
    
    @objc private func keyboardWillHide(_ notification: Notification) {
        messagesCollectionView.contentInset.bottom = 0
        messagesCollectionView.scrollIndicatorInsets.bottom = 0
    }
}

// MARK: - MessagesDataSource
extension ChatViewController: MessagesDataSource {
    func currentSender() -> SenderType {
        return currentSender
    }
    
    func messageForItem(at indexPath: IndexPath, in messagesCollectionView: MessagesCollectionView) -> MessageType {
        return messages[indexPath.section]
    }
    
    func numberOfSections(in messagesCollectionView: MessagesCollectionView) -> Int {
        return messages.count
    }
}

// MARK: - MessagesLayoutDelegate
extension ChatViewController: MessagesLayoutDelegate {
    func messageTopLabelHeight(for message: MessageType, at indexPath: IndexPath, in messagesCollectionView: MessagesCollectionView) -> CGFloat {
        return 16
    }
}

// MARK: - MessagesDisplayDelegate
extension ChatViewController: MessagesDisplayDelegate {
    func backgroundColor(for message: MessageType, at indexPath: IndexPath, in messagesCollectionView: MessagesCollectionView) -> UIColor {
        return isFromCurrentSender(message: message) ? .systemBlue : .systemGray5
    }
    
    func messageStyle(for message: MessageType, at indexPath: IndexPath, in messagesCollectionView: MessagesCollectionView) -> MessageStyle {
        let corner: MessageStyle.TailCorner = isFromCurrentSender(message: message) ? .bottomRight : .bottomLeft
        return .bubbleTail(corner, .curved)
    }
}

// MARK: - InputBarAccessoryViewDelegate
extension ChatViewController: InputBarAccessoryViewDelegate {
    func inputBar(_ inputBar: InputBarAccessoryView, didPressSendButtonWith text: String) {
        let message = ChatMessage(
            messageId: UUID().uuidString,
            sender: currentSender,
            sentDate: Date(),
            kind: .text(text),
            content: text
        )
        
        chatService.sendMessage(message: message) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let sentMessage):
                    self?.messages.append(sentMessage)
                    self?.messagesCollectionView.reloadData()
                    self?.messagesCollectionView.scrollToLastItem(animated: true)
                    inputBar.inputTextView.text = ""
                case .failure(let error):
                    print("Failed to send message: \(error.localizedDescription)")
                }
            }
        }
    }
}

// MARK: - UIImagePickerControllerDelegate
extension ChatViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)
        
        if let image = info[.originalImage] as? UIImage {
            sendImage(image: image)
        } else if let videoURL = info[.mediaURL] as? URL {
            sendVideo(videoURL: videoURL)
        }
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
    
    private func sendImage(image: UIImage) {
        chatService.sendImage(image: image, sender: currentSender) { [weak self] result in
            switch result {
            case .success(let message):
                DispatchQueue.main.async {
                    self?.messages.append(message)
                    self?.messagesCollectionView.reloadData()
                    self?.messagesCollectionView.scrollToLastItem(animated: true)
                }
            case .failure(let error):
                print("Failed to send image: \(error.localizedDescription)")
            }
        }
    }
    
    private func sendVideo(videoURL: URL) {
        chatService.sendVideo(videoURL: videoURL, sender: currentSender) { [weak self] result in
            switch result {
            case .success(let message):
                DispatchQueue.main.async {
                    self?.messages.append(message)
                    self?.messagesCollectionView.reloadData()
                    self?.messagesCollectionView.scrollToLastItem(animated: true)
                }
            case .failure(let error):
                print("Failed to send video: \(error.localizedDescription)")
            }
        }
    }
}
